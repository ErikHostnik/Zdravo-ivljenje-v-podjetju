const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SensorDataSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  activity: [
    {
      timestamp: Date,
      steps: Number,
      speed: Number,
      temperature: Number,
      latitude: Number,
      longitude: Number,
      altitude: Number,
    }
  ],
  weather: {
    temperature: Number,
    conditions: String
  }
});

module.exports = mongoose.model('SensorData', SensorDataSchema);
