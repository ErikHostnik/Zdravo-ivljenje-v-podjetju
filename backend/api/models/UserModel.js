var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  'name': { type: String, required: true },
  'email': { type: String, required: true, unique: true },
  'stepCount': { type: Number, default: 0 },
  'distance': { type: Number, default: 0 },
  'routes': [{ type: Schema.Types.ObjectId, ref: 'Route' }],
  'createdAt': { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
