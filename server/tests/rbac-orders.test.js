const request = require('supertest');
const { getApp } = require('./setup');
const { setupFullOrderChain } = require('./helpers');
const crypto = require('crypto');

describe('RBAC Order Lifecycle & Staff Workflow', () => {
  let app;
  let chainData;
  let coordinatorToken;
  let kitchenToken;
  let waiter1Token;
  let waiter1User;
  let waiter2User;

  beforeAll(async () => {
    app = getApp();
    chainData = await setupFullOrderChain({
      product: { name: 'Doro Wat Special', price: 250 }
    });

    // 1. Create Coordinator staff
    const coordRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${chainData.accessToken}`)
      .send({
        name: 'Desk Coordinator Almaz',
        phone: '0911000001',
        role: 'coordinator',
        pin: '1234',
        password: 'password123',
      });
    expect(coordRes.status).toBe(201);
    expect(coordRes.body.user.role).toBe('coordinator');
    expect(coordRes.body.user.hasPin).toBe(true);

    // 2. Create Kitchen Chef staff
    const kitchenRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${chainData.accessToken}`)
      .send({
        name: 'Chef Tariku',
        phone: '0911000002',
        role: 'kitchen',
        station: 'kitchen',
        pin: '2345',
        password: 'password123',
      });
    expect(kitchenRes.status).toBe(201);

    // 3. Create Waiter 1 (assigned specifically to chainData.table._id)
    const waiter1Res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${chainData.accessToken}`)
      .send({
        name: 'Waiter Dawit',
        phone: '0911000003',
        role: 'waiter',
        assignedTables: [chainData.table._id],
        isOnDuty: true,
        pin: '3456',
        password: 'password123',
      });
    expect(waiter1Res.status).toBe(201);
    waiter1User = waiter1Res.body.user;

    // 4. Create Waiter 2 (general floor)
    const waiter2Res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${chainData.accessToken}`)
      .send({
        name: 'Waiter Meron',
        phone: '0911000004',
        role: 'waiter',
        isOnDuty: true,
        pin: '4567',
        password: 'password123',
      });
    expect(waiter2Res.status).toBe(201);
    waiter2User = waiter2Res.body.user;

    // Test PIN Login for staff
    const coordLogin = await request(app)
      .post('/api/auth/pin-login')
      .send({ identifier: '0911000001', pin: '1234' });
    expect(coordLogin.status).toBe(200);
    coordinatorToken = coordLogin.body.accessToken;

    const kitchenLogin = await request(app)
      .post('/api/auth/pin-login')
      .send({ identifier: '0911000002', pin: '2345' });
    expect(kitchenLogin.status).toBe(200);
    kitchenToken = kitchenLogin.body.accessToken;

    const waiterLogin = await request(app)
      .post('/api/auth/pin-login')
      .send({ identifier: '0911000003', pin: '3456' });
    expect(waiterLogin.status).toBe(200);
    waiter1Token = waiterLogin.body.accessToken;
  });

  it('enforces RBAC transition rules and automatic waiter assignment', async () => {
    // 1. Customer places order
    const orderPayload = {
      tableId: chainData.table._id,
      restaurantId: chainData.restaurant._id,
      branchId: chainData.branch._id,
      sessionId: chainData.sessionId,
      sessionToken: chainData.sessionToken,
      guestName: 'Bilisuma',
      clientOrderId: crypto.randomUUID(),
      items: [{ productId: chainData.product._id, qty: 1 }],
    };

    const placeRes = await request(app).post('/api/orders/public').send(orderPayload);
    expect(placeRes.status).toBe(201);
    const orderId = placeRes.body.order._id;
    expect(placeRes.body.order.status).toBe('placed');

    // 2. Kitchen tries to accept placed order -> should be rejected (403)
    const kitchenPrematureRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ status: 'accepted' });
    expect(kitchenPrematureRes.status).toBe(403);

    // 3. Coordinator accepts placed order -> status becomes accepted
    const coordAcceptRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ status: 'accepted' });
    expect(coordAcceptRes.status).toBe(200);
    expect(coordAcceptRes.body.order.status).toBe('accepted');
    expect(coordAcceptRes.body.order.acceptedBy).toBeDefined();

    // 4. Kitchen advances order to preparing
    const kitchenPrepRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ status: 'preparing' });
    expect(kitchenPrepRes.status).toBe(200);
    expect(kitchenPrepRes.body.order.status).toBe('preparing');
    expect(kitchenPrepRes.body.order.preparedBy).toBeDefined();

    // 5. Kitchen marks order as ready -> triggers automatic assignment to assigned table waiter (Dawit)
    const kitchenReadyRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ status: 'ready' });
    expect(kitchenReadyRes.status).toBe(200);
    expect(kitchenReadyRes.body.order.status).toBe('ready');
    expect(kitchenReadyRes.body.order.assignedWaiterId).toBeDefined();
    expect(kitchenReadyRes.body.order.assignedWaiterName).toBe('Waiter Dawit');

    // 6. Kitchen tries to mark payment -> rejected (403)
    const kitchenPayRes = await request(app)
      .patch(`/api/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ paymentMethod: 'cash' });
    expect(kitchenPayRes.status).toBe(403);

    // 7. Assigned Waiter delivers to table and marks served
    const waiterServeRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${waiter1Token}`)
      .send({ status: 'served' });
    expect(waiterServeRes.status).toBe(200);
    expect(waiterServeRes.body.order.status).toBe('served');
    expect(waiterServeRes.body.order.servedBy).toBeDefined();

    // 8. Waiter settles payment using Telebirr
    const payRes = await request(app)
      .patch(`/api/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${waiter1Token}`)
      .send({ paymentMethod: 'telebirr' });
    expect(payRes.status).toBe(200);
    expect(payRes.body.order.paymentStatus).toBe('paid');
    expect(payRes.body.order.paymentMethod).toBe('telebirr');
  });

  it('allows order claiming and coordinator reassignment', async () => {
    // Customer places second order
    const orderPayload = {
      tableId: chainData.table._id,
      restaurantId: chainData.restaurant._id,
      branchId: chainData.branch._id,
      sessionId: chainData.sessionId,
      sessionToken: chainData.sessionToken,
      guestName: 'Kaleb',
      clientOrderId: crypto.randomUUID(),
      items: [{ productId: chainData.product._id, qty: 1 }],
    };

    const placeRes = await request(app).post('/api/orders/public').send(orderPayload);
    const orderId = placeRes.body.order._id;

    // Coordinator reassigns to Waiter 2 (Meron)
    const assignRes = await request(app)
      .patch(`/api/orders/${orderId}/assign`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ waiterId: waiter2User._id });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.order.assignedWaiterName).toBe('Waiter Meron');

    // Waiter 1 claims it back
    const claimRes = await request(app)
      .patch(`/api/orders/${orderId}/assign`)
      .set('Authorization', `Bearer ${waiter1Token}`)
      .send({});
    expect(claimRes.status).toBe(200);
    expect(claimRes.body.order.assignedWaiterName).toBe('Waiter Dawit');
  });
});
