var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ChallengeSchema = new Schema({
  'name': { type: String, required: true },
  'description': { type: String },
  'startDate': { type: Date, default: Date.now },
  'endDate': { type: Date },
  'rewards': [{ type: String }], // Nagrade (npr. 'digital badge')
  'participants': [{ type: Schema.Types.ObjectId, ref: 'User' }],
  'progress': [{
    'user': { type: Schema.Types.ObjectId, ref: 'User' },
    'steps': { type: Number },
    'distance': { type: Number }
  }]
});

module.exports = mongoose.model('Challenge', ChallengeSchema);
