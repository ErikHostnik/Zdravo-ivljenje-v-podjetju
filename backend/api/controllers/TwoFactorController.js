const TwoFactorRequest = require('../models/TwoFactorRequestModel.js');
const User = require('../models/User.js'); // Preveri, da imaš User model
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const client = require('../mqtt/client'); // Tvoj MQTT klient (če ga imaš v projektu)

module.exports = {
  // Ustvari zahtevo (samo objava MQTT brez 2FA setupa)
  create: async function (req, res) {
    try {
      const existing = await TwoFactorRequest.findOne({ user: req.body.user, approved: false, rejected: false });
      if (existing) return res.status(400).json({ message: "Zahteva že obstaja." });

      const newRequest = new TwoFactorRequest({ user: req.body.user });
      await newRequest.save();

      const topic = `2fa/request/${req.body.user}`;
      const message = JSON.stringify({ requestId: newRequest._id.toString() });
      client.publish(topic, message, () => {
        console.log(`📡 Poslana 2FA zahteva na MQTT temo: ${topic}`);
      });

      res.status(201).json(newRequest);
    } catch (err) {
      res.status(500).json({ message: "Napaka pri ustvarjanju 2FA zahteve", error: err });
    }
  },

  // Potrdi zahtevo
  approve: async function (req, res) {
    try {
      const request = await TwoFactorRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "Zahteva ne obstaja." });

      request.approved = true;
      await request.save();
      res.json({ message: "Dostop odobren." });
    } catch (err) {
      res.status(500).json({ message: "Napaka pri potrditvi zahteve", error: err });
    }
  },

  // Zavrni zahtevo
  reject: async function (req, res) {
    try {
      const request = await TwoFactorRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "Zahteva ne obstaja." });

      request.rejected = true;
      await request.save();
      res.json({ message: "Dostop zavrnjen." });
    } catch (err) {
      res.status(500).json({ message: "Napaka pri zavrnitvi zahteve", error: err });
    }
  },

  // Preveri status zahteve
  status: async function (req, res) {
    try {
      const request = await TwoFactorRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ message: "Zahteva ne obstaja." });

      res.json({ approved: request.approved, rejected: request.rejected });
    } catch (err) {
      res.status(500).json({ message: "Napaka pri preverjanju statusa", error: err });
    }
  },

  // 2FA Setup: Zagon skript za zajem, poravnavo in augmentacijo obrazov
  setup: async function (req, res) {
    try {
      const userId = req.body.user;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "Uporabnik ne obstaja." });

      // Ustvari TwoFactorRequest (če še ne obstaja)
      const existing = await TwoFactorRequest.findOne({ user: userId, approved: false, rejected: false });
      if (existing) return res.status(400).json({ message: "Zahteva že obstaja." });

      const newRequest = new TwoFactorRequest({ user: userId });
      await newRequest.save();

      // Pot za shranjevanje slik
      const userDir = path.join(__dirname, '..', 'data', user.username);
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

      // Definiraj skripte
      const scripts = [
        `python3 ./scripts/face_data_collector.py --output ${userDir}`,
        `python3 ./scripts/preprocess_faces.py --input ${userDir}`,
        `python3 ./scripts/augment_faces.py --input ${userDir}`
      ];

      // Zaženemo vse skripte (ena za drugo)
      scripts.forEach((cmd) => {
        exec(cmd, (err, stdout, stderr) => {
          if (err) {
            console.error(`❌ Napaka pri izvajanju: ${cmd}`, err);
          } else {
            console.log(`✅ Skripta izvedena: ${cmd}`);
          }
        });
      });

      res.status(201).json({ message: "2FA setup sprožen", requestId: newRequest._id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Napaka pri 2FA setupu", error: err });
    }
  }
};
