const SensordataModel = require('../models/SensorDataModel.js');
const { bufferToBits } = require('../utils/bitpack');
const { decompress } = require('../utils/kodiranjeRLE');

const START_LAT = 46.0569;
const START_LON = 14.5058;
const STEP_METERS = 0.7;
const STEP_THRESHOLD = 1.2;

function fromQFactory(scale, offset){ return q => (q - offset) / scale; }
function detectStep(prev, curr){
  if (!prev) return false;
  const mp = Math.sqrt(prev.x**2 + prev.y**2 + prev.z**2);
  const mc = Math.sqrt(curr.x**2 + curr.y**2 + curr.z**2);
  return mc > STEP_THRESHOLD && mp <= STEP_THRESHOLD;
}
function reconstructPath(xs, ys, zs){
  let lat = START_LAT, lon = START_LON;
  const pts = [];
  let last = null;
  for (let i = 0; i < xs.length; i++){
    const s = { x: xs[i], y: ys[i], z: zs[i] };
    const stepped = detectStep(last, s);
    if (stepped){
      const angle = Math.atan2(s.y, s.x);
      const dx_m = Math.cos(angle) * STEP_METERS;
      const dy_m = Math.sin(angle) * STEP_METERS;
      lat += dy_m / 111111;
      lon += dx_m / (111111 * Math.cos(lat * Math.PI / 180));
    }
    last = s;
    pts.push([lat, lon]);
  }
  return pts;
}

module.exports = {
  list: async function (req, res) {
    try {
      const sensorDatas = await SensordataModel.find();
      return res.json(sensorDatas);
    } catch (err) {
      return res.status(500).json({ message: 'Error when getting SensorData.', error: err });
    }
  },

  show: async function (req, res) {
    const id = req.params.id;
    try {
      const sensorData = await SensordataModel.findById(id);
      if (!sensorData) return res.status(404).json({ message: 'No such SensorData' });
      return res.json(sensorData);
    } catch (err) {
      return res.status(500).json({ message: 'Error when getting SensorData.', error: err });
    }
  },

  getById: async function (req, res) {
    try{
      const id = req.params.id;
      const decoded = req.query.decoded === '1';
      const path = req.query.path === '1';
      const doc = await SensordataModel.findById(id).lean();
      if (!doc) return res.status(404).json({ message: 'Not found' });

      if (!decoded){
        return res.json({
          _id: doc._id,
          user: doc.user,
          stats: doc.stats,
          compressed: doc.compressed ? {
            count: doc.compressed.count,
            xBits: doc.compressed.xBits,
            yBits: doc.compressed.yBits,
            zBits: doc.compressed.zBits,
            ratio: doc.compressed.ratio
          } : null,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        });
      }

      if (!doc.compressed || !doc.compressed.x || !doc.compressed.y || !doc.compressed.z) {
        return res.status(400).json({ message: 'No compressed data available' });
      }

      const c = doc.compressed;
      const fromQ = fromQFactory(c.scale, c.offset);
      const bx = bufferToBits(c.x, c.xBits);
      const by = bufferToBits(c.y, c.yBits);
      const bz = bufferToBits(c.z, c.zBits);
      const qx = decompress(bx);
      const qy = decompress(by);
      const qz = decompress(bz);
      const xs = qx.map(fromQ).slice(0, c.count);
      const ys = qy.map(fromQ).slice(0, c.count);
      const zs = qz.map(fromQ).slice(0, c.count);

      if (path){
        const points = reconstructPath(xs, ys, zs);
        return res.json({
          _id: doc._id,
          user: doc.user,
          stats: doc.stats,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          ratio: c.ratio,
          path: points
        });
      }

      return res.json({
        _id: doc._id,
        user: doc.user,
        stats: doc.stats,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        ratio: c.ratio,
        decoded: { x: xs, y: ys, z: zs }
      });
    }catch(err){
      return res.status(500).json({ message: err.message });
    }
  },

  create: async function (req, res) {
    try {
      const newSensorData = new SensordataModel({
        user: req.user._id,
        activity: req.body.activity,
        weather: req.body.weather
      });
      const saved = await newSensorData.save();
      return res.status(201).json(saved);
    } catch (err) {
      return res.status(500).json({ message: 'Error when creating SensorData', error: err });
    }
  },

  update: async function (req, res) {
    const id = req.params.id;
    try {
      const sensorData = await SensordataModel.findById(id);
      if (!sensorData) return res.status(404).json({ message: 'No such SensorData' });
      sensorData.timestamp = req.body.timestamp ?? sensorData.timestamp;
      sensorData.steps = req.body.steps ?? sensorData.steps;
      sensorData.speed = req.body.speed ?? sensorData.speed;
      sensorData.temperature = req.body.temperature ?? sensorData.temperature;
      sensorData.location = req.body.location  ?? sensorData.location;
      sensorData.weather= req.body.weather ?? sensorData.weather;
      const updated = await sensorData.save();
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: 'Error when updating SensorData.', error: err });
    }
  },

  remove: async function (req, res) {
    const id = req.params.id;
    try {
      const deleted = await SensordataModel.findByIdAndRemove(id);
      if (!deleted) return res.status(404).json({ message: 'No such SensorData' });
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ message: 'Error when deleting the SensorData.', error: err });
    }
  },

  listByUser: async function (req, res) {
    const userId = req.params.userId;
    try {
      const data = await SensordataModel.find({ user: userId });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ message: 'Error fetching user\'s SensorData', error: err });
    }
  }
};
