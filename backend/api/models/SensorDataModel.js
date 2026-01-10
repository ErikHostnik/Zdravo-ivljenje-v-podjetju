const mongoose = require('mongoose');
const { Schema } = mongoose;

const CompressedSchema = new Schema(
  {
    scale: { type: Number, required: true },
    offset: { type: Number, required: true },
    count: { type: Number, required: true },
    xBits: { type: Number, required: true },
    yBits: { type: Number, required: true },
    zBits: { type: Number, required: true },
    x: { type: Buffer, required: true },
    y: { type: Buffer, required: true },
    z: { type: Buffer, required: true },
    ratio: { type: Number, required: true }
  },
  { _id: false }
);

const SensorDataSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stats: {
      stepCount: { type: Number, default: 0 },
      distance: { type: Number, default: 0 },
      avgSpeed: { type: Number, default: 0 },
      minSpeed: { type: Number, default: 0 },
      maxSpeed: { type: Number, default: 0 },
      altitudeDistance: { type: Number, default: 0 }
    },
    compressed: CompressedSchema
  },
  { timestamps: true }
);

SensorDataSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SensorData', SensorDataSchema);
