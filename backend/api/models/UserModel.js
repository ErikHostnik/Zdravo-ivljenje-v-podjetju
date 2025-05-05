const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

// Shema
const UserSchema = new Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  stepCount: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  routes: [{ type: Schema.Types.ObjectId, ref: 'Route' }],
  createdAt: { type: Date, default: Date.now }
});

// Hashiranje gesla pred shranjevanjem
UserSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next(); // samo če je geslo novo ali spremenjeno
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

// Statika za prijavo
UserSchema.statics.authenticate = async function (username, password) {
  const user = await this.findOne({ username: username }).exec();

  if (!user) {
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid password");
  }

  return user;
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
