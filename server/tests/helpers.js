const request = require('supertest');
const { getApp } = require('./setup');
const crypto = require('crypto');

const registerAndLogin = async (overrides = {}) => {
  const app = getApp();
  const defaultData = {
    restaurantName: `Test Rest ${Date.now()}`,
    ownerName: 'Owner Test',
    email: `owner${Date.now()}@test.com`,
    password: 'password123',
  };
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...defaultData, ...overrides });
  
  if (res.status !== 201) throw new Error(`Register failed: ${res.text}`);
  return res.body;
};

const createBranch = async (accessToken, restaurantId, overrides = {}) => {
  const app = getApp();
  const defaultData = {
    name: 'Main Branch',
    address: '123 Main St',
    currency: 'USD',
    timezone: 'UTC',
  };
  const res = await request(app)
    .post('/api/branches')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ ...defaultData, ...overrides });

  if (res.status !== 201) throw new Error(`Create branch failed: ${res.text}`);
  return res.body.branch;
};

const createTable = async (accessToken, branchId, overrides = {}) => {
  const app = getApp();
  const defaultData = {
    label: 'Table 1',
    branchId,
  };
  const res = await request(app)
    .post('/api/tables')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ ...defaultData, ...overrides });

  if (res.status !== 201) throw new Error(`Create table failed: ${res.text}`);
  return res.body.table;
};

const createCategory = async (accessToken, overrides = {}) => {
  const app = getApp();
  const defaultData = {
    name: 'Mains',
  };
  const res = await request(app)
    .post('/api/categories')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ ...defaultData, ...overrides });

  if (res.status !== 201) throw new Error(`Create category failed: ${res.text}`);
  return res.body.category;
};

const createProduct = async (accessToken, categoryId, overrides = {}) => {
  const app = getApp();
  const defaultData = {
    name: 'Burger',
    price: 10,
    categoryId,
  };
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ ...defaultData, ...overrides });

  if (res.status !== 201) throw new Error(`Create product failed: ${res.text}`);
  return res.body.product;
};

const setupFullOrderChain = async (overrides = {}) => {
  const app = getApp();
  const auth = await registerAndLogin(overrides.auth);
  const branch = await createBranch(auth.accessToken, auth.restaurant._id, overrides.branch);
  const table = await createTable(auth.accessToken, branch._id, overrides.table);
  const category = await createCategory(auth.accessToken, overrides.category);
  const product = await createProduct(auth.accessToken, category._id, overrides.product);

  // Trigger a scan to generate sessionToken
  const scanRes = await request(app)
    .get(`/api/public/table/${table.qrToken}`);
  
  if (scanRes.status !== 200) throw new Error(`Table scan failed: ${scanRes.text}`);

  return {
    ...auth,
    branch,
    table: scanRes.body.table,
    category,
    product,
    sessionToken: scanRes.body.sessionToken,
    sessionId: crypto.randomUUID()
  };
};

module.exports = {
  registerAndLogin,
  createBranch,
  createTable,
  createCategory,
  createProduct,
  setupFullOrderChain
};
