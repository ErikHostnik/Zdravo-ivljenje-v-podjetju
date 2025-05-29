const TwoFactorRequest = require('../models/TwoFactorRequestModel.js');
const User = require('../models/UserModel.js');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const multer = require('multer');

// Konfiguracija Multerja za shranjevanje slik
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.body.user || req.params.userId;
    const dir = path.join(__dirname, '../data', userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { files: 100, fileSize: 5 * 1024 * 1024 }, // max 100 files, 5MB each
}).array('images', 100);

module.exports = {
  // Ustvari 2FA zahtevo in pošlji MQTT sporočilo
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

  // Prenos slik za 2FA
  uploadImages: function (req, res) {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(500).json({ message: "Napaka pri nalaganju slik", error: err });
      }

      const userId = req.body.user || req.params.userId;
      // Shrani slike v skriptno mapo /scripts/face_recognition/data/userid
      const dataDir = path.join(__dirname, '../../scripts/face_recognition/data', userId);
      fs.mkdirSync(dataDir, { recursive: true }); // Ustvari, če ne obstaja

      console.log(`📂 Slike shranjene v: ${dataDir}`);
      console.log(`📸 Naloženih slik: ${req.files.length}`);

      // Zgradi funkcijo za zagon python skripte z await
      function runScript(scriptName, dataPath) {
        return new Promise((resolve, reject) => {
          const scriptPath = path.join(__dirname, '../../scripts/face_recognition', scriptName);
          const cmd = `py "${scriptPath}" "${dataPath}"`;
          exec(cmd, (error, stdout, stderr) => {
            if (error) {
              console.error(` Napaka pri zagonu ${scriptName}:`, error);
              reject(error);
            } else {
              console.log(` Skripta ${scriptName} zaključena.`);
              console.log(stdout);
              resolve();
            }
          });
        });
      }

      try {
        // Zaženi skripte ena za drugo sinhrono
        await runScript('face_data_collector.py', dataDir);
        await runScript('preprocess_faces.py', dataDir);
        await runScript('augment_faces.py', dataDir);

        res.json({ message: "Slike uspešno naložene in obdelava je zaključena." });
      } catch (e) {
        res.status(500).json({ message: "Napaka pri obdelavi slik", error: e.toString() });
      }
    });
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
};
