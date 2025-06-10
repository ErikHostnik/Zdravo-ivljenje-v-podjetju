const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../api"); 
const User = require("../models/UserModel.js"); 
const SensorData = require("../models/SensorDataModel.js");
require("dotenv").config({path: "./.env"});

describe("SensorData API testi", () => {

  afterEach(async () => {
    await User.deleteMany({ email: "sensor@example.com" });
    await SensorData.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("ne ustvari senzorskih podatkov brez uporabnika (400)", async () => {
    const payload = { weather: { temperature: 22, conditions: "Clear" } };
    const res = await request(app)
      .post("/api/sensordata")
      .send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("dobim senzorske podatke po ID", async () => {
    const user = await User.create({
      username: "sensortester",
      email: "sensor@example.com",
      password: "test123"
    });
    const doc = await SensorData.create({
      user: user._id,
      weather: { temperature: 15, conditions: "Cloudy" }
    });

    const res = await request(app)
      .get(`/api/sensordata/${doc._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(String(doc._id));
    expect(res.body.weather.temperature).toBe(15);
  });

  it("posodobi vremenske podatke senzorskega zapisa", async () => {
    const user = await User.create({
      username: "sensortester",
      email: "sensor@example.com",
      password: "test123"
    });
    const doc = await SensorData.create({
      user: user._id,
      weather: { temperature: 10, conditions: "Rainy" }
    });

    const updated = { weather: { temperature: 12, conditions: "Overcast" } };
    const res = await request(app)
      .put(`/api/sensordata/${doc._id}`)
      .send(updated);

    expect(res.statusCode).toBe(200);
    expect(res.body.weather.temperature).toBe(12);
    expect(res.body.weather.conditions).toBe("Overcast");
  });

});
