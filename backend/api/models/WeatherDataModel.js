var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var WeatherDataSchema = new Schema({
  'date': { type: Date, default: Date.now },
  'location': { 
    'lat': Number,
    'lon': Number
  },
  'temperature': { type: Number },
  'weatherConditions': { type: String } // Npr. 'sunny', 'rainy'
});

module.exports = mongoose.model('WeatherData', WeatherDataSchema);
