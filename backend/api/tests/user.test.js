const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../api"); 
const User = require("../models/UserModel.js"); 
require("dotenv").config({path: "./.env"});

describe("User API testi", () => {

  afterEach(async () => {
    await User.deleteMany({ email: "test@example.com" });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("ustvari novega uporabnika", async () => {
    const res = await request(app)
      .post("/api/users")  
      .send({
        username: "testuser",
        email: "test@example.com",
        password: "test123"
      });
    expect(res.statusCode).toBe(201);
  });

  it("prijavi obstoječega uporabnika", async () => {
    await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "test123"
    });

    const res = await request(app)
      .post("/api/users/login")  
      .send({
        username: "testuser",
        password: "test123"
      });
    expect(res.statusCode).toBe(200);
  });

  it("ne uspe prijava z napačnim geslom", async () => {
    await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "pravilnoGeslo"
    });

    const res = await request(app)
      .post("/api/users/login")
      .send({
        username: "testuser",
        password: "napačnoGeslo"
      });

    expect(res.statusCode).toBe(401); 
  });

  it('posodobi uporabnikove podatke', async () => {
      const user = await User.findOne({ username: 'eriktester' });

      const res = await request(app).put(`/api/users/${user._id}`).send({
          stepCount: 5000,
          distance: 4.2
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.stepCount).toBe(5000);
      expect(res.body.distance).toBe(4.2);
  });

});
