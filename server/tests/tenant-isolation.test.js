const request = require('supertest');
const { getApp } = require('./setup');
const { setupFullOrderChain, registerAndLogin } = require('./helpers');
const crypto = require('crypto');

describe('Tenant Isolation', () => {
  let app;
  let tenantA;
  let tenantB;
  let orderA;

  beforeAll(async () => {
    app = getApp();
    
    // Set up full chain for Tenant A
    tenantA = await setupFullOrderChain({
      auth: { restaurantName: 'Rest A', email: `ownerA${Date.now()}@test.com` },
      product: { name: 'Burger A', price: 10 }
    });

    // Set up simple auth for Tenant B
    tenantB = await registerAndLogin({
      restaurantName: 'Rest B', email: `ownerB${Date.now()}@test.com`
    });

    // Place order for Tenant A
    const orderPayload = {
      tableId: tenantA.table._id,
      restaurantId: tenantA.restaurant._id,
      branchId: tenantA.branch._id,
      sessionId: tenantA.sessionId,
      sessionToken: tenantA.sessionToken,
      items: [{ productId: tenantA.product._id, qty: 1 }]
    };
    
    const res = await request(app).post('/api/orders/public').send(orderPayload);
    orderA = res.body.order;
  });

  it('Restaurant B staff cannot list Restaurant A orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${tenantB.accessToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orders).toEqual([]); // Empty list, not an error
  });

  it('Restaurant B staff cannot update Restaurant A order status (404)', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderA._id}/status`)
      .set('Authorization', `Bearer ${tenantB.accessToken}`)
      .send({ status: 'preparing' });
    
    expect(res.status).toBe(404);
  });

  it('Upload delete rejects cross-tenant publicId (403)', async () => {
    const publicIdA = `layoscan/${tenantA.restaurant._id}/media/test_image_123`;
    
    const res = await request(app)
      .delete('/api/upload')
      .set('Authorization', `Bearer ${tenantB.accessToken}`)
      .send({ publicId: publicIdA });
    
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/belong to your restaurant/);
  });
});
