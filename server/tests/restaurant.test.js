const request = require('supertest');
const { getApp } = require('./setup');
const { registerAndLogin } = require('./helpers');

describe('Restaurant Controller (/api/restaurants)', () => {
  let app;
  let ownerToken;
  let restaurantId;

  beforeAll(async () => {
    app = getApp();
    const auth = await registerAndLogin({
      restaurantName: 'Brand Test Bistro',
      ownerName: 'Owner Brand',
      email: `brandtest_${Date.now()}@test.com`,
    });
    ownerToken = auth.accessToken;
    restaurantId = auth.restaurant._id;
  });

  describe('GET /api/restaurants/me', () => {
    it('returns the current authenticated tenant restaurant (200)', async () => {
      const res = await request(app)
        .get('/api/restaurants/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.restaurant).toBeDefined();
      expect(res.body.restaurant.name).toBe('Brand Test Bistro');
    });

    it('rejects unauthenticated requests (401)', async () => {
      const res = await request(app).get('/api/restaurants/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/restaurants/me', () => {
    it('updates logoUrl, coverUrl, brandColor, and description (200)', async () => {
      const updates = {
        name: 'Brand Test Bistro Updated',
        logoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/logo1.png',
        coverUrl: 'https://res.cloudinary.com/demo/image/upload/v1/cover1.jpg',
        brandColor: '#10B981',
        description: 'Cozy modern cafe',
      };

      const res = await request(app)
        .patch('/api/restaurants/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.restaurant.name).toBe(updates.name);
      expect(res.body.restaurant.logoUrl).toBe(updates.logoUrl);
      expect(res.body.restaurant.coverUrl).toBe(updates.coverUrl);
      expect(res.body.restaurant.brandColor).toBe(updates.brandColor);
      expect(res.body.restaurant.description).toBe(updates.description);
    });

    it('removes logoUrl and coverUrl when passed null (200)', async () => {
      const res = await request(app)
        .patch('/api/restaurants/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          logoUrl: null,
          coverUrl: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.restaurant.logoUrl).toBeNull();
      expect(res.body.restaurant.coverUrl).toBeNull();

      // Verify persistence via GET
      const getRes = await request(app)
        .get('/api/restaurants/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.restaurant.logoUrl).toBeNull();
      expect(getRes.body.restaurant.coverUrl).toBeNull();
    });

    it('sanitizes empty strings to null for logoUrl and coverUrl (200)', async () => {
      // First set them
      await request(app)
        .patch('/api/restaurants/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          logoUrl: 'https://example.com/logo2.png',
          coverUrl: 'https://example.com/cover2.jpg',
        });

      // Now send empty strings
      const res = await request(app)
        .patch('/api/restaurants/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          logoUrl: '',
          coverUrl: '',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.restaurant.logoUrl).toBeNull();
      expect(res.body.restaurant.coverUrl).toBeNull();
    });
  });
});
