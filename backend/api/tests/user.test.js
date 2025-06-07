const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../api"); // tvoja Express aplikacija
const User = require("../models/User"); // tvoja Mongoose shema za User

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
      .post("/api/users/register")  // prilagodi, če imaš drugačno pot
      .send({
        username: "testuser",
        email: "test@example.com",
        password: "test123"
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toHaveProperty("email", "test@example.com");
  });

  it("prijavi obstoječega uporabnika", async () => {
    // Najprej ustvarimo uporabnika (lahko ga ustvariš direktno v bazi)
    await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "test123" // Če imaš hash v shemi, uporabi pravi hash ali prilagodi test
    });

    const res = await request(app)
      .post("/api/users/login")  // prilagodi po potrebi
      .send({
        email: "test@example.com",
        password: "test123"
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

});
