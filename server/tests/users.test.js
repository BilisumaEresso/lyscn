const request = require('supertest');
const { getApp } = require('./setup');
const { registerAndLogin } = require('./helpers');

describe('Users / Staff Management API', () => {
  let app;
  let ownerA;
  let ownerB;

  beforeAll(async () => {
    app = getApp();
    ownerA = await registerAndLogin();
    ownerB = await registerAndLogin();
  });

  describe('GET /api/users', () => {
    it('should list users belonging to the authenticated restaurant', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${ownerA.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(1);

      const ownerInList = res.body.users.find((u) => u.email === ownerA.user.email);
      expect(ownerInList).toBeDefined();
      expect(ownerInList.role).toBe('owner');
      expect(ownerInList.passwordHash).toBeUndefined();
    });

    it('should reject unauthenticated request (401)', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users', () => {
    it('should allow owner to create a kitchen staff member', async () => {
      const payload = {
        name: 'Chef Mario',
        email: `mario${Date.now()}@kitchen.test`,
        role: 'kitchen',
        password: 'securepassword123',
      };

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Chef Mario');
      expect(res.body.user.role).toBe('kitchen');
      expect(res.body.user.restaurantId).toBe(String(ownerA.restaurant._id));
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject invalid role (400)', async () => {
      const payload = {
        name: 'Fake Role',
        email: `faker${Date.now()}@test.com`,
        role: 'superadmin',
        password: 'password123',
      };

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/users/:id', () => {
    let staffMember;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({
          name: 'Waiter Luigi',
          email: `luigi${Date.now()}@test.com`,
          role: 'waiter',
          password: 'password123',
        });
      staffMember = res.body.user;
    });

    it('should allow owner to promote waiter to manager', async () => {
      const res = await request(app)
        .patch(`/api/users/${staffMember._id}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ role: 'manager' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('manager');
    });

    it('should prevent demoting the owner (403)', async () => {
      const res = await request(app)
        .patch(`/api/users/${ownerA.user._id}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({ role: 'waiter' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/:id & Tenant Isolation', () => {
    let staffMemberA;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerA.accessToken}`)
        .send({
          name: 'Deletable Staff',
          email: `delete${Date.now()}@test.com`,
          role: 'waiter',
          password: 'password123',
        });
      staffMemberA = res.body.user;
    });

    it('Owner B cannot modify or deactivate Owner A staff member (404)', async () => {
      const res = await request(app)
        .delete(`/api/users/${staffMemberA._id}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`);

      expect(res.status).toBe(404);
    });

    it('Owner A can deactivate their staff member', async () => {
      const res = await request(app)
        .delete(`/api/users/${staffMemberA._id}`)
        .set('Authorization', `Bearer ${ownerA.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
