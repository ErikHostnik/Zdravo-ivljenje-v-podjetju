const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SensorDataSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  steps: Number,
  speed: Number,
  temperature: Number,
  location: {
    lat: Number,
    lon: Number
  },
  weather: {
    temperature: Number,
    conditions: String
  }
});

module.exports = mongoose.model('SensorData', SensorDataSchema);
