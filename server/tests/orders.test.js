const request = require('supertest');
const { getApp } = require('./setup');
const { setupFullOrderChain } = require('./helpers');
const crypto = require('crypto');

describe('Orders API', () => {
  let app;
  let chainData;

  beforeAll(async () => {
    app = getApp();
    chainData = await setupFullOrderChain({
      product: { name: 'Test Pizza', price: 15 }
    });
  });

  describe('POST /api/orders/public', () => {
    it('should create an order successfully with server-side pricing', async () => {
      const payload = {
        tableId: chainData.table._id,
        restaurantId: chainData.restaurant._id,
        branchId: chainData.branch._id,
        sessionId: chainData.sessionId,
        sessionToken: chainData.sessionToken,
        guestName: 'John Doe',
        clientOrderId: crypto.randomUUID(),
        items: [
          { productId: chainData.product._id, qty: 2 }
        ]
      };
      
      const res = await request(app).post('/api/orders/public').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.totalAmount).toBe(30); // 15 * 2
      expect(res.body.order.status).toBe('placed');
    });

    it('should reject when missing required fields (400)', async () => {
      const payload = {
        tableId: chainData.table._id,
        // missing restaurantId, etc
      };
      
      const res = await request(app).post('/api/orders/public').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject with invalid session token (401)', async () => {
      const payload = {
        tableId: chainData.table._id,
        restaurantId: chainData.restaurant._id,
        branchId: chainData.branch._id,
        sessionId: chainData.sessionId,
        sessionToken: 'invalid_token_123',
        guestName: 'John Doe',
        items: [
          { productId: chainData.product._id, qty: 1 }
        ]
      };
      
      const res = await request(app).post('/api/orders/public').send(payload);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should handle idempotency correctly (same clientOrderId)', async () => {
      const clientOrderId = crypto.randomUUID();
      const payload = {
        tableId: chainData.table._id,
        restaurantId: chainData.restaurant._id,
        branchId: chainData.branch._id,
        sessionId: chainData.sessionId,
        sessionToken: chainData.sessionToken,
        clientOrderId,
        items: [
          { productId: chainData.product._id, qty: 1 }
        ]
      };
      
      const res1 = await request(app).post('/api/orders/public').send(payload);
      expect(res1.status).toBe(201);
      expect(res1.body.reused).toBeUndefined();

      const res2 = await request(app).post('/api/orders/public').send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.reused).toBe(true);
      expect(res2.body.order._id).toBe(res1.body.order._id);
    });
  });

  describe('Order Status and Management', () => {
    let orderId;

    beforeAll(async () => {
      const payload = {
        tableId: chainData.table._id,
        restaurantId: chainData.restaurant._id,
        branchId: chainData.branch._id,
        sessionId: chainData.sessionId,
        sessionToken: chainData.sessionToken,
        items: [{ productId: chainData.product._id, qty: 1 }]
      };
      const res = await request(app).post('/api/orders/public').send(payload);
      orderId = res.body.order._id;
    });

    it('GET /api/orders/public/:id/status - success with valid session token', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${orderId}/status?sessionToken=${chainData.sessionToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('placed');
    });

    it('GET /api/orders/public/:id/status - reject without token (400)', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${orderId}/status`);
      
      expect(res.status).toBe(400);
    });

    it('GET /api/orders/public/:id/status - reject with wrong token (403)', async () => {
      const res = await request(app)
        .get(`/api/orders/public/${orderId}/status?sessionToken=wrong_token`);
      
      expect(res.status).toBe(403);
    });

    it('PATCH /api/orders/:id/status - staff can update', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${chainData.accessToken}`)
        .send({ status: 'preparing' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.status).toBe('preparing');
    });

    it('PATCH /api/orders/:id/status - unauthenticated rejected (401)', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: 'ready' });
      
      expect(res.status).toBe(401);
    });

    it('PATCH /api/orders/:id/payment - staff can mark paid', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${chainData.accessToken}`)
        .send({ paymentMethod: 'cash' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.paymentStatus).toBe('paid');
      expect(res.body.order.paymentMethod).toBe('cash');
    });

    it('GET /api/orders - staff can list orders for their restaurant', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${chainData.accessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
      
      const found = res.body.orders.find(o => o._id === orderId);
      expect(found).toBeDefined();
    });
  });
});
