require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'this_is_a_very_secret_jwt_key_for_testing_123';
process.env.JWT_REFRESH_SECRET = 'this_is_a_very_secret_refresh_key_for_testing_456';
process.env.RATE_LIMIT_DISABLED = 'true';

jest.setTimeout(60000);

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  
  await mongoose.connect(uri);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});

module.exports = {
  getApp: () => require('../src/app'),
};
