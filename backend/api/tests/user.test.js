const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../api'); 
const User = require('../models/UserModel');

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/testdb';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

beforeEach(async () => {
  await User.deleteOne({ username: 'testuser' });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('POST /api/users', () => {
  it('should create a new user and return user data', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.email).toBe('test@example.com');
    expect(res.body.username).toBe('testuser');
  });
});
