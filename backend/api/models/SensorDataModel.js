const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SensorDataSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  activity: [
    {
      timestamp: Date,
      steps: Number,
      speed: Number,
      temperature: Number,
      latitude: Number,
      longitude: Number,
      latitude: {Number, default: None}
    }
  ],
  weather: {
    temperature: Number,
    conditions: String
  }
});

module.exports = mongoose.model('SensorData', SensorDataSchema);
