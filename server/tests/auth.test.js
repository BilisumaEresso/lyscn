const request = require('supertest');
const { getApp } = require('./setup');
const { registerAndLogin } = require('./helpers');

describe('Auth API', () => {
  let app;

  beforeAll(() => {
    app = getApp();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully (201)', async () => {
      const payload = {
        restaurantName: 'New Rest',
        ownerName: 'Bob',
        email: `bob${Date.now()}@test.com`,
        password: 'securepassword',
      };
      const res = await request(app).post('/api/auth/register').send(payload);
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(payload.email);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.restaurant).toBeDefined();
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
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

  describe('POST /api/auth/refresh', () => {
    let authData;

    beforeAll(async () => {
      authData = await registerAndLogin();
    });

    it('should issue new access token with valid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: authData.refreshToken,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
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
      expect(res.body.user.email).toBe(authData.user.email);
    });

    it('should reject when not authenticated (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
