const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../api"); // tvoja Express aplikacija
const User = require("../models/UserModel.js"); // tvoja Mongoose shema za User
require("dotenv").config({path: "./.env"});

describe("User API testi", () => {

  // Po vsakem testu izbrišemo testnega uporabnika
  afterEach(async () => {
    await User.deleteMany({ email: "test@example.com" });
  });

  // Po koncu vseh testov zapremo povezavo do baze
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

});
