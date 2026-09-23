const request = require('supertest');
const { getApp } = require('./setup');
const { registerAndLogin, createBranch, createTable } = require('./helpers');
const Table = require('../src/models/Table');
const Branch = require('../src/models/Branch');

describe('Public Table API', () => {
  let app;
  let authData;
  let branch;
  let table;

  beforeAll(async () => {
    app = getApp();
    authData = await registerAndLogin();
    branch = await createBranch(authData.accessToken, authData.restaurant._id);
    await Branch.updateOne(
      { _id: branch._id },
      {
        location: {
          lat: 40.7128,
          lng: -74.0060,
          radiusMeters: 200,
        },
        locationStrictMode: true,
      }
    );
    table = await createTable(authData.accessToken, branch._id, { label: 'Table Public' });
  });

  it('GET /api/public/table/:qrToken - valid token returns restaurant, branch, table, sessionToken', async () => {
    const res = await request(app).get(`/api/public/table/${table.qrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.restaurant).toBeDefined();
    expect(res.body.branch).toBeDefined();
    expect(res.body.table).toBeDefined();
    expect(res.body.table.label).toBe('Table Public');
    expect(res.body.sessionToken).toBeDefined();
    expect(typeof res.body.sessionToken).toBe('string');
  });

  it('GET /api/public/table/:qrToken - invalid token returns 404', async () => {
    const res = await request(app).get('/api/public/table/nonexistent_qr_token');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/public/table/:qrToken - subsequent scan returns same sessionToken if not expired', async () => {
    const res1 = await request(app).get(`/api/public/table/${table.qrToken}`);
    expect(res1.status).toBe(200);
    const token1 = res1.body.sessionToken;

    const res2 = await request(app).get(`/api/public/table/${table.qrToken}`);
    expect(res2.status).toBe(200);
    const token2 = res2.body.sessionToken;

    expect(token1).toBe(token2);
  });

  it('POST /api/public/table/:qrToken/verify-location - reject invalid sessionToken (401)', async () => {
    const res = await request(app)
      .post(`/api/public/table/${table.qrToken}/verify-location`)
      .send({
        sessionToken: 'invalid_session_token',
        lat: 40.7128,
        lng: -74.0060,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/public/table/:qrToken/verify-location - valid location within radius returns verified: true', async () => {
    const scanRes = await request(app).get(`/api/public/table/${table.qrToken}`);
    const sessionToken = scanRes.body.sessionToken;

    const res = await request(app)
      .post(`/api/public/table/${table.qrToken}/verify-location`)
      .send({
        sessionToken,
        lat: 40.7128, // Same as branch
        lng: -74.0060,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.verified).toBe(true);
    expect(res.body.distanceMeters).toBeLessThanOrEqual(50);
  });

  it('POST /api/public/table/:qrToken/verify-location - location outside radius in strict mode returns 403', async () => {
    const scanRes = await request(app).get(`/api/public/table/${table.qrToken}`);
    const sessionToken = scanRes.body.sessionToken;

    const res = await request(app)
      .post(`/api/public/table/${table.qrToken}/verify-location`)
      .send({
        sessionToken,
        lat: 51.5074, // London (far away from NY)
        lng: -0.1278,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.verified).toBe(false);
  });

  it('GET /api/public/table/:qrToken - expired session without orders gets released and assigned a new sessionToken', async () => {
    // Force table session to be expired in the past
    const scanRes = await request(app).get(`/api/public/table/${table.qrToken}`);
    const oldToken = scanRes.body.sessionToken;

    await Table.updateOne(
      { _id: table._id },
      { sessionExpiresAt: new Date(Date.now() - 60000), status: 'occupied' }
    );

    const res = await request(app).get(`/api/public/table/${table.qrToken}`);
    expect(res.status).toBe(200);
    expect(res.body.sessionToken).toBeDefined();
    expect(res.body.sessionToken).not.toBe(oldToken);
  });
});
