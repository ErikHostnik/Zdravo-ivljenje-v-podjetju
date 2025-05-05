const SensordataModel = require('../models/SensorDataModel.js');

module.exports = {
  /**
   * List all SensorData
   */
  list: async function (req, res) {
    try {
      const sensorDatas = await SensordataModel.find();
      return res.json(sensorDatas);
    } catch (err) {
      return res.status(500).json({
        message: 'Error when getting SensorData.',
        error: err
      });
    }
  },

  /**
   * Show a single SensorData by ID
   */
  show: async function (req, res) {
    const id = req.params.id;
    try {
      const sensorData = await SensordataModel.findById(id);
      if (!sensorData) {
        return res.status(404).json({ message: 'No such SensorData' });
      }
      return res.json(sensorData);
    } catch (err) {
      return res.status(500).json({
        message: 'Error when getting SensorData.',
        error: err
      });
    }
  },

  /**
   * Create new SensorData
   */
  create: async function (req, res) {
    try {
      const newSensorData = new SensordataModel({
        user: req.session.userId,
        timestamp:req.body.timestamp,
        steps: req.body.steps,
        speed: req.body.speed,
        temperature: req.body.temperature,
        location: req.body.location,
        weather:  req.body.weather
      });
      const saved = await newSensorData.save();
      return res.status(201).json(saved);
    } catch (err) {
      return res.status(500).json({
        message: 'Error when creating SensorData',
        error: err
      });
    }
  },

  /**
   * Update an existing SensorData by ID
   */
  update: async function (req, res) {
    const id = req.params.id;
    try {
      const sensorData = await SensordataModel.findById(id);
      if (!sensorData) {
        return res.status(404).json({ message: 'No such SensorData' });
      }

      sensorData.user = req.body.user ?? sensorData.user;
      sensorData.timestamp = req.body.timestamp ?? sensorData.timestamp;
      sensorData.steps = req.body.steps ?? sensorData.steps;
      sensorData.speed = req.body.speed ?? sensorData.speed;
      sensorData.temperature = req.body.temperature ?? sensorData.temperature;
      sensorData.location = req.body.location  ?? sensorData.location;
      sensorData.weather= req.body.weather ?? sensorData.weather;

      const updated = await sensorData.save();
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({
        message: 'Error when updating SensorData.',
        error: err
      });
    }
  },

  /**
   * Remove a SensorData by ID
   */
  remove: async function (req, res) {
    const id = req.params.id;
    try {
      const deleted = await SensordataModel.findByIdAndRemove(id);
      if (!deleted) {
        return res.status(404).json({ message: 'No such SensorData' });
      }
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({
        message: 'Error when deleting the SensorData.',
        error: err
      });
    }
  }
};
