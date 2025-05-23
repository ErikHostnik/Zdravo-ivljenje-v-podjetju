// models/TwoFactorRequest.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TwoFactorRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approved: { type: Boolean, default: false },
  rejected: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 300 } // expires in 5 min
});

module.exports = mongoose.model('TwoFactorRequest', TwoFactorRequestSchema);
