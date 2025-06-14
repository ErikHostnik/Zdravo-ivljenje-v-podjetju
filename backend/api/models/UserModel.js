const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const UserSchema = new Schema({
  username: { type: String, required: true, lowercase: true, trim: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  stepCount: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  stepGoal: { type: Number, default: 10000 }, 
  activities: [{ type: Schema.Types.ObjectId, ref: 'SensorData' }],
  model: { type: String, default: 'default' },

  dailyStats: [
    {
      date: { type: Date, required: true },
      stepCount: { type: Number, default: 0 },
      distance: { type: Number, default: 0 },
      avgSpeed: { type: Number, default: 0 },
      minSpeed: { type: Number, default: 0 },
      maxSpeed: { type: Number, default: 0 },
      altitudeDistance: { type: Number, default: 0 }


    }
  ]
});

// Hashiranje gesla pred shranjevanjem
UserSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

// Posodobljena metoda za prijavo
UserSchema.statics.authenticate = async function (username, password) {
  try {
    const cleanUsername = username.trim().toLowerCase();
    const user = await this.findOne({ username: cleanUsername }).exec();

    if (!user) {
      return null; 
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return null; 
    }

    return user;
  } catch (err) {
    throw err;
  }
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
