const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../api');
const User = require('../models/UserModel');
const MongoStore = require('connect-mongo');

beforeAll(async () => {
    const mongoURI = 'mongodb+srv://root:hojladrijadrom@zdravozivpodjetja.1hunr7p.mongodb.net/?retryWrites=true&w=majority&appName=ZdravoZivPodjetja';
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
    console.log('Test user deleted');

    if (MongoStore && MongoStore.getConnection) {
        try {
            await MongoStore.getConnection().close();
            console.log('MongoStore connection closed');
        } catch (error) {
            console.log('Error closing MongoStore connection:', error);
        }
    }

    try {
        await mongoose.connection.close();
        console.log('Mongoose connection closed');
    } catch (error) {
        console.log('Error closing mongoose connection:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
});

describe('POST /api/users', () => {
    it('should create a new user and return user data', async () => {
        const res = await request(app)
            .post('/api/users')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                stepCount: 1000,
                distance: 10,
                routes: [],
                createdAt: new Date().toISOString(),
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('_id');
        expect(res.body.email).toBe('test@example.com');
        expect(res.body.username).toBe('testuser');
    });
});
