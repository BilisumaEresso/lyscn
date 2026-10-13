const request = require('supertest');
const { getApp } = require('./setup');
const { setupFullOrderChain } = require('./helpers');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Table = require('../src/models/Table');

describe('Phase 4: Floor Speed, State Machine, and Multi-Payment Engine', () => {
  let app;
  let chainData;
  let ownerToken;
  let waiterToken;
  let waiterId;
  let standardProduct;
  let portionedProduct;
  let fastingProduct;

  beforeAll(async () => {
    app = getApp();
    chainData = await setupFullOrderChain();
    ownerToken = chainData.accessToken;

    // Create a staff waiter
    const waiterRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Dawit Waiter',
        phone: '0911554433',
        password: 'Password123!',
        role: 'waiter',
      });
    expect(waiterRes.status).toBe(201);
    waiterId = waiterRes.body.user._id;

    // Login as waiter
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '0911554433',
        password: 'Password123!',
      });
    expect(loginRes.status).toBe(200);
    waiterToken = loginRes.body.accessToken;

    standardProduct = chainData.product;

    // Create portioned item (Half / Full)
    portionedProduct = await Product.create({
      restaurantId: chainData.restaurant._id,
      categoryId: chainData.category._id,
      name: 'Shekla Tibs',
      price: 500,
      portions: [
        { name: 'Half', nameAmharic: 'ግማሽ', price: 280, serves: 1, isDefault: false },
        { name: 'Full', nameAmharic: 'ሙሉ', price: 500, serves: 2, isDefault: true },
      ],
      isAvailable: true,
      isFasting: false,
    });

    // Create Fasting item (የጾም)
    fastingProduct = await Product.create({
      restaurantId: chainData.restaurant._id,
      categoryId: chainData.category._id,
      name: 'Yetsom Beyaynetu',
      price: 220,
      isAvailable: true,
      isFasting: true,
      dietaryTags: ['fasting', 'vegetarian'],
    });
  });

  describe('1. Static Fasting and Portion Attributes', () => {
    it('persists static isFasting and dietary tags on product', async () => {
      const found = await Product.findById(fastingProduct._id);
      expect(found.isFasting).toBe(true);
      expect(found.dietaryTags).toContain('fasting');
    });

    it('persists portion options with localized name and pricing', async () => {
      const found = await Product.findById(portionedProduct._id);
      expect(found.portions.length).toBe(2);
      expect(found.portions[0].name).toBe('Half');
      expect(found.portions[0].price).toBe(280);
      expect(found.portions[1].name).toBe('Full');
      expect(found.portions[1].price).toBe(500);
    });
  });

  describe('2. High-Speed Waiter Order Creation (No Diner Device)', () => {
    it('allows floor waiter to create an order directly with portions and waiter attribution', async () => {
      const res = await request(app)
        .post('/api/orders/staff')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableId: chainData.table._id,
          guestName: 'Ato Henok',
          serviceChargeRate: 0.10, // 10% optional service charge
          items: [
            {
              productId: portionedProduct._id,
              qty: 2,
              portionName: 'Half', // 280 * 2 = 560
            },
            {
              productId: fastingProduct._id,
              qty: 1, // 220
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const order = res.body.order;

      // 560 + 220 = 780 ETB
      expect(order.totalAmount).toBe(780);
      expect(order.serviceChargeAmount).toBe(78); // 10% of 780
      expect(order.grossTotal).toBe(858);
      expect(order.balanceDue).toBe(858);
      expect(order.createdSource).toBe('waiter_pad');
      expect(order.assignedWaiterId._id.toString()).toBe(waiterId.toString());

      // Check portion snapshot
      expect(order.items[0].portionName).toBe('Half');
      expect(order.items[0].unitPrice).toBe(280);
      expect(order.items[0].subtotal).toBe(560);

      // Table should be marked occupied
      const table = await Table.findById(chainData.table._id);
      expect(table.status).toBe('occupied');
    });
  });

  describe('3. Order State Machine: Strict Transitions & Role Guardrails', () => {
    let orderId;

    beforeEach(async () => {
      const order = await Order.create({
        restaurantId: chainData.restaurant._id,
        branchId: chainData.branch._id,
        tableId: chainData.table._id,
        sessionId: 'test_sm_session',
        totalAmount: 450,
        grossTotal: 450,
        balanceDue: 450,
        status: 'placed',
        items: [{ productId: standardProduct._id, name: 'Special Kitfo', qty: 1, unitPrice: 450, subtotal: 450 }],
      });
      orderId = order._id;
    });

    it('rejects illegal transition jump from placed to served', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'served' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ILLEGAL_TRANSITION');
    });

    it('allows legal stepwise progression from placed to ready', async () => {
      // placed -> accepted
      let res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'accepted' });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('accepted');

      // accepted -> preparing
      res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'preparing' });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('preparing');

      // preparing -> ready
      res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'ready' });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('ready');

      // ready -> served (by waiter)
      res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ status: 'served' });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('served');
    });

    it('rejects cancelling an order that has already been served', async () => {
      await Order.findByIdAndUpdate(orderId, { status: 'served' });

      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'cancelled' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ILLEGAL_TRANSITION');
    });

    it('requires a cancel reason when cancelling an order in preparing state', async () => {
      await Order.findByIdAndUpdate(orderId, { status: 'preparing' });

      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'cancelled' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });
  });

  describe('4. Multi-Payment, Partial Settlement, Tips & Balance Tracking', () => {
    let orderId;

    beforeEach(async () => {
      const order = await Order.create({
        restaurantId: chainData.restaurant._id,
        branchId: chainData.branch._id,
        tableId: chainData.table._id,
        sessionId: 'test_payment_session',
        assignedWaiterId: waiterId,
        totalAmount: 1000,
        serviceChargeAmount: 100, // 10%
        grossTotal: 1100,
        totalPaid: 0,
        balanceDue: 1100,
        paymentStatus: 'unpaid',
        status: 'served',
        items: [{ productId: standardProduct._id, name: 'Special Kitfo', qty: 2, unitPrice: 500, subtotal: 1000 }],
      });
      orderId = order._id;
    });

    it('records partial payment and updates remaining balance accurately', async () => {
      // First friend pays 400 ETB in cash
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          amount: 400,
          paymentMethod: 'cash',
          tipAmount: 30, // 30 ETB cash tip
        });

      expect(res.status).toBe(200);
      const order = res.body.order;
      expect(order.paymentStatus).toBe('partially_paid');
      expect(order.totalPaid).toBe(400);
      expect(order.balanceDue).toBe(700); // 1100 - 400
      expect(order.totalTips).toBe(30);
      expect(order.payments.length).toBe(1);
      expect(order.payments[0].amount).toBe(400);
      expect(order.payments[0].paymentMethod).toBe('cash');
    });

    it('completes full settlement on second payment and marks order paid', async () => {
      // Part 1: Pay 500 ETB
      await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ amount: 500, paymentMethod: 'cash' });

      // Part 2: Settle remaining 600 ETB via Telebirr + 100 ETB tip
      const res = await request(app)
        .post(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          amount: 600,
          paymentMethod: 'telebirr',
          paymentReference: 'TB-78901234',
          tipAmount: 100,
        });

      expect(res.status).toBe(200);
      const order = res.body.order;
      expect(order.paymentStatus).toBe('paid');
      expect(order.totalPaid).toBe(1100);
      expect(order.balanceDue).toBe(0);
      expect(order.totalTips).toBe(100);
      expect(order.payments.length).toBe(2);
      expect(order.payments[1].paymentReference).toBe('TB-78901234');
    });
  });

  describe('5. Waiter Shift Summary & Tip Accounting', () => {
    it('aggregates tables served, total sales, and cash vs digital tips for the waiter', async () => {
      const res = await request(app)
        .get('/api/orders/waiter/shift-summary')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const summary = res.body.summary;

      expect(summary.tablesServed).toBeGreaterThanOrEqual(1);
      expect(summary.totalSales).toBeGreaterThanOrEqual(1000);
      expect(summary.totalTips).toBeGreaterThanOrEqual(0);
      expect(typeof summary.cashTips).toBe('number');
      expect(typeof summary.digitalTips).toBe('number');
    });
  });
});
