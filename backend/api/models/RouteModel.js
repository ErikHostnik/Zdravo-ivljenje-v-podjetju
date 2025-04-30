var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RouteSchema = new Schema({
  'startLocation': { lat: Number, lon: Number },
  'endLocation': { lat: Number, lon: Number },
  'path': [{ lat: Number, lon: Number }], // Seznam GPS točk
  'weatherData': { 
    'temperature': { type: Number },
    'humidity': { type: Number },
    'conditions': { type: String } // Npr. 'clear', 'cloudy', 'rainy'
  },
  'date': { type: Date, default: Date.now }
});

module.exports = mongoose.model('Route', RouteSchema);
