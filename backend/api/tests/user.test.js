const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../api');
const User = require('../models/UserModel');

beforeAll(async () => {
  const mongoURI = process.env.MONGODB_URI ||
    'mongodb+srv://root:hojladrijadrom@zdravozivpodjetja.1hunr7p.mongodb.net/?retryWrites=true&w=majority&appName=ZdravoZivPodjetja';
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

  await User.deleteOne({ username: 'testuser' });

  await mongoose.connection.close();
});

describe('POST /api/users', () => {
  it('should create a new user and return user data', async () => {
    const payload = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      stepCount: 1000,
      distance: 10,
      activities: [],
      createdAt: new Date().toISOString(),
    };

    const res = await request(app)
      .post('/api/users')
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.username).toBe(payload.username);
    expect(res.body.email).toBe(payload.email);
    expect(res.body.stepCount).toBe(payload.stepCount);
    expect(res.body.distance).toBe(payload.distance);
    expect(res.body.activities).toEqual(payload.activities);
  });
});
