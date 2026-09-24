const request = require('supertest');
const { getApp } = require('./setup');
const { registerAndLogin } = require('./helpers');

describe('Auth API', () => {
  let app;

  beforeAll(() => {
    app = getApp();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and create default branch and table (201)', async () => {
      const payload = {
        restaurantName: 'New Rest',
        ownerName: 'Bob',
        email: `bob${Date.now()}@test.com`,
        password: 'securepassword123',
      };
      const res = await request(app).post('/api/auth/register').send(payload);
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(payload.email.toLowerCase());
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.restaurant).toBeDefined();
      expect(res.body.branch).toBeDefined();
      expect(res.body.branch.name).toBe('Main Branch');
      expect(res.body.table).toBeDefined();
      expect(res.body.table.label).toBe('Table 1');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject registration with password shorter than 8 characters (400)', async () => {
      const payload = {
        restaurantName: 'Short Pass Bistro',
        ownerName: 'Dan',
        email: `dan${Date.now()}@test.com`,
        password: 'short',
      };
      const res = await request(app).post('/api/auth/register').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 8 characters/i);
    });

    it('should reject registration with missing fields (400)', async () => {
      const payload = {
        ownerName: 'Bob',
        email: 'bob@test.com',
        // missing restaurantName, password
      };
      const res = await request(app).post('/api/auth/register').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate email (409)', async () => {
      const payload = {
        restaurantName: 'Rest A',
        ownerName: 'Alice',
        email: `alice${Date.now()}@test.com`,
        password: 'password123',
      };
      await request(app).post('/api/auth/register').send(payload);
      
      // Send again
      const res = await request(app).post('/api/auth/register').send(payload);
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    let authData;
    let loginPayload;

    beforeAll(async () => {
      loginPayload = {
        restaurantName: 'Login Rest',
        ownerName: 'Charlie',
        email: `charlie${Date.now()}@test.com`,
        password: 'password123',
      };
      authData = await registerAndLogin(loginPayload);
    });

    it('should login successfully (200)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: loginPayload.email,
        password: loginPayload.password,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.restaurant).toBeDefined();
    });

    it('should reject wrong password (401)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: loginPayload.email,
        password: 'wrongpassword',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject nonexistent email (401)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@nowhere.com',
        password: 'password123',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh & Token Rotation', () => {
    let authData;

    beforeAll(async () => {
      authData = await registerAndLogin();
    });

    it('should issue new access token and rotate refresh token with valid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: authData.refreshToken,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');

      // Attempting to reuse the old refresh token must trigger reuse detection and fail
      const reuseRes = await request(app).post('/api/auth/refresh').send({
        refreshToken: authData.refreshToken,
      });
      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.success).toBe(false);
    });

    it('should reject invalid refresh token (401)', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'invalid_token_string',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing refresh token (400)', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke the refresh token on logout', async () => {
      const auth = await registerAndLogin();

      const logoutRes = await request(app).post('/api/auth/logout').send({
        refreshToken: auth.refreshToken,
      });
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Subsequent refresh with logged out token should be rejected
      const refreshRes = await request(app).post('/api/auth/refresh').send({
        refreshToken: auth.refreshToken,
      });
      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authData;

    beforeAll(async () => {
      authData = await registerAndLogin();
    });

    it('should return user and restaurant when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authData.accessToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.restaurant).toBeDefined();
      expect(res.body.user.email).toBe(authData.user.email.toLowerCase());
    });

    it('should reject when not authenticated (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
