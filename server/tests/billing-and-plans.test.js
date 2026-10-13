const request = require('supertest');
const { getApp } = require('./setup');
const { setupFullOrderChain } = require('./helpers');
const Subscription = require('../src/models/Subscription');
const Invoice = require('../src/models/Invoice');
const Branch = require('../src/models/Branch');

describe('Phase 3: Billing, Plans, and Feature-Gating', () => {
  let app;
  let chainData;

  beforeAll(async () => {
    app = getApp();
    chainData = await setupFullOrderChain({
      product: { name: 'Billing Test Item', price: 50 },
    });
  });

  describe('Self-Serve Signup & Auto-Provisioning', () => {
    it('should auto-provision restaurant, branch, table, subscription, and starter menu on register', async () => {
      const email = `owner_${Date.now()}@example.com`;
      const res = await request(app).post('/api/auth/register').send({
        restaurantName: 'Bole Fresh Cafe',
        ownerName: 'Abebe Bikila',
        email,
        password: 'password123',
        phone: '0911002233',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.restaurant).toBeDefined();
      expect(res.body.branch).toBeDefined();
      expect(res.body.branch.name).toBe('Main Branch');
      expect(res.body.table).toBeDefined();
      expect(res.body.table.label).toBe('Table 1');
      expect(res.body.subscription).toBeDefined();
      expect(res.body.subscription.status).toBe('trialing');
      expect(res.body.subscription.plan).toBe('pro');
      expect(res.body.category).toBeDefined();
      expect(res.body.product).toBeDefined();
      expect(res.body.accessToken).toBeDefined();
    });
  });

  describe('Subscription & Billing API', () => {
    it('GET /api/billing/subscription - should return active subscription details and telemetry', async () => {
      const res = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${chainData.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.subscription).toBeDefined();
      expect(res.body.plans).toBeDefined();
      expect(res.body.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/billing/invoices - should list invoices (and auto-generate pending if none exist)', async () => {
      const res = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${chainData.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.invoices)).toBe(true);
      expect(res.body.invoices.length).toBeGreaterThanOrEqual(1);
      expect(res.body.invoices[0].currency).toBe('ETB');
    });

    it('POST /api/billing/invoices/:id/pay - should mark invoice paid and activate subscription with reference', async () => {
      const listRes = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${chainData.accessToken}`);

      const invoiceId = listRes.body.invoices[0]._id;

      const payRes = await request(app)
        .post(`/api/billing/invoices/${invoiceId}/pay`)
        .set('Authorization', `Bearer ${chainData.accessToken}`)
        .send({
          paymentMethod: 'telebirr',
          paymentReference: 'TB-9988776655',
          paymentNotes: 'Paid via Telebirr Merchant App',
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.invoice.status).toBe('paid');
      expect(payRes.body.invoice.paymentReference).toBe('TB-9988776655');
      expect(payRes.body.subscription.status).toBe('active');
    });

    it('POST /api/billing/reminder - should generate WhatsApp payment reminder link', async () => {
      const listRes = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${chainData.accessToken}`);

      const invoiceId = listRes.body.invoices[0]._id;

      const remRes = await request(app)
        .post('/api/billing/reminder')
        .set('Authorization', `Bearer ${chainData.accessToken}`)
        .send({
          invoiceId,
          channel: 'whatsapp',
        });

      expect(remRes.status).toBe(200);
      expect(remRes.body.success).toBe(true);
      expect(remRes.body.whatsappLink).toContain('https://wa.me/');
    });
  });

  describe('Feature-Flag Middleware: requirePlan', () => {
    it('should allow access to analytics, staff, and exports during Pro trial or active plan', async () => {
      // 1. Analytics
      const analyticsRes = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${chainData.accessToken}`);
      expect(analyticsRes.status).toBe(200);

      // 2. Staff list
      const staffRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${chainData.accessToken}`);
      expect(staffRes.status).toBe(200);

      // 3. Orders export
      const exportRes = await request(app)
        .get('/api/orders/export')
        .set('Authorization', `Bearer ${chainData.accessToken}`);
      expect(exportRes.status).toBe(200);
      expect(exportRes.body.orders).toBeDefined();
    });

    it('should reject Pro features with 403 UPGRADE_REQUIRED when downgraded to Starter plan', async () => {
      // Set restaurant subscription to 'starter' and non-trialing
      await Subscription.findOneAndUpdate(
        { restaurantId: chainData.restaurant._id },
        { plan: 'starter', status: 'active', trialEndsAt: new Date(Date.now() - 10000) }
      );

      // Attempt analytics on starter plan
      const analyticsRes = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${chainData.accessToken}`);

      expect(analyticsRes.status).toBe(403);
      expect(analyticsRes.body.code).toBe('UPGRADE_REQUIRED');
      expect(analyticsRes.body.requiredPlan).toBe('pro');

      // Attempt exports on starter plan
      const exportRes = await request(app)
        .get('/api/orders/export')
        .set('Authorization', `Bearer ${chainData.accessToken}`);

      expect(exportRes.status).toBe(403);
      expect(exportRes.body.code).toBe('UPGRADE_REQUIRED');

      // Restore to pro
      await Subscription.findOneAndUpdate(
        { restaurantId: chainData.restaurant._id },
        { plan: 'pro', status: 'active' }
      );
    });

    it('should enforce multi-branch limit when branchCount reaches plan limit', async () => {
      // Set branchLimit to 1 on subscription
      await Subscription.findOneAndUpdate(
        { restaurantId: chainData.restaurant._id },
        { plan: 'pro', status: 'active', branchLimit: 1 }
      );

      // Attempt to add a 2nd branch
      const branchRes = await request(app)
        .post('/api/branches')
        .set('Authorization', `Bearer ${chainData.accessToken}`)
        .send({ name: 'Branch 2 - Kazanchis' });

      expect(branchRes.status).toBe(403);
      expect(branchRes.body.code).toBe('BRANCH_LIMIT_REACHED');

      // Reset branch limit
      await Subscription.findOneAndUpdate(
        { restaurantId: chainData.restaurant._id },
        { branchLimit: 5 }
      );
    });
  });

  describe('Grace Period vs Read-Only Lockout ("Never hard-lock mid-shift")', () => {
    it('should allow operations during grace period and attach warning headers', async () => {
      // Set subscription to past_due but within grace period
      await Subscription.findOneAndUpdate(
        { restaurantId: chainData.restaurant._id },
        {
          status: 'past_due',
          gracePeriodEndsAt: new Date(Date.now() + 3 * 86400000), // 3 days remaining
        }
      );

      const res = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${chainData.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['x-subscription-warning']).toBe('grace_period');
    });

    it('should enforce read-only (402) on mutating actions when grace period expires, but allow read views', async () => {
      // Set subscription to read_only (grace period expired)
      await Subscription.findOneAndUpdate(
        { restaurantId: chainData.restaurant._id },
        {
          status: 'read_only',
          gracePeriodEndsAt: new Date(Date.now() - 86400000), // expired 1 day ago
        }
      );

      // 1. GET requests are ALLOWED (never lock view of orders/menu/tables)
      const getRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${chainData.accessToken}`);
      expect(getRes.status).toBe(200);

      // 2. Mutations (e.g. creating staff) are BLOCKED with 402
      const mutateRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${chainData.accessToken}`)
        .send({
          name: 'New Waiter',
          phone: '0922334455',
          role: 'waiter',
        });

      expect(mutateRes.status).toBe(402);
      expect(mutateRes.body.code).toBe('SUBSCRIPTION_READ_ONLY');

      // Restore to active
      await Subscription.findOneAndUpdate(
        { restaurantId: chainData.restaurant._id },
        {
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        }
      );
    });
  });
});
