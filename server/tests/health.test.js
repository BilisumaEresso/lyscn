const request = require('supertest');
const { getApp } = require('./setup');

describe('Health Checks', () => {
  let app;

  beforeAll(() => {
    app = getApp();
  });

  it('should return 200 OK for /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'LayoScan API',
      checks: {
        database: 'connected',
      },
    });
  });

  it('should include service name in response', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.service).toBe('LayoScan API');
  });
});
