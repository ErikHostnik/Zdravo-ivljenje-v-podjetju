var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ActivitySchema = new Schema({
  'user': { type: Schema.Types.ObjectId, ref: 'User' },
  'date': { type: Date, default: Date.now },
  'steps': { type: Number, required: true },
  'distance': { type: Number, required: true }, // V kilometrih
  'speed': { type: Number, required: true }, // Hitrost v km/h
  'temperature': { type: Number }, // Temperatura v stopinjah Celzija
  'route': { type: Schema.Types.ObjectId, ref: 'Route' }
});

module.exports = mongoose.model('Activity', ActivitySchema);
