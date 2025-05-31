const TwoFactorRequest = require('../models/TwoFactorRequestModel.js');
const User = require('../models/UserModel.js');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const multer = require('multer');

// Multer za trening (shranjevanje več slik)
const trainingStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.body.user || req.params.userId;
    const tmpDir = path.join(__dirname, '../../uploads/tmp', userId);
    fs.mkdirSync(tmpDir, { recursive: true });
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
    cb(null, uniqueName);
  }
});

const uploadTraining = multer({
  storage: trainingStorage,
  limits: { files: 100, fileSize: 5 * 1024 * 1024 },
}).array('images', 100);

// Multer za preverjanje (shranjevanje ene slike)
const verifyStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/verify_tmp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadVerify = multer({ storage: verifyStorage }).single('image');

module.exports = {
  uploadTraining,
  uploadVerify,

  create: async function (req, res) {
    try {
      const existing = await TwoFactorRequest.findOne({
        user: req.body.user,
        approved: false,
        rejected: false
      });
      
      if (existing) {
        return res.status(400).json({ message: "Zahteva že obstaja." });
      }

      const newRequest = new TwoFactorRequest({ user: req.body.user });
      await newRequest.save();

      // Pošlji MQTT sporočilo
      const topic = `2fa/request/${req.body.user}`;
      const message = JSON.stringify({ requestId: newRequest._id.toString() });
      
      // Predpostavka: MQTT client je definiran globalno
      global.mqttClient.publish(topic, message, () => {
        console.log(`📡 Poslana 2FA zahteva na MQTT temo: ${topic}`);
      });

      res.status(201).json(newRequest);
    } catch (err) {
      res.status(500).json({ 
        message: "Napaka pri ustvarjanju 2FA zahteve", 
        error: err.message 
      });
    }
  },

  uploadImages: function (req, res) {
    this.uploadTraining(req, res, async (err) => {
      if (err) {
        return res.status(500).json({ 
          message: "Napaka pri nalaganju slik", 
          error: err.message 
        });
      }

      const userId = req.body.user || req.params.userId;
      const tmpDir = path.join(__dirname, '../../uploads/tmp', userId);
      const dataDir = path.join(__dirname, '../../scripts/face_recognition/data', userId);

      // Počisti in pripravi direktorij
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      fs.mkdirSync(dataDir, { recursive: true });

      try {
        // Kopiraj slike iz tmp v data
        const files = fs.readdirSync(tmpDir);
        for (const file of files) {
          const sourcePath = path.join(tmpDir, file);
          const destPath = path.join(dataDir, file);
          fs.copyFileSync(sourcePath, destPath);
        }
      } catch (copyError) {
        return res.status(500).json({ 
          message: "Napaka pri kopiranju slik", 
          error: copyError.message 
        });
      }

      // Zagon Python skripte za obdelavo
      const scriptPath = path.join(__dirname, '../../scripts/face_recognition/process_pipeline.py');
      const cmd = `python "${scriptPath}" "${dataDir}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Napaka pri zagonu process_pipeline.py:`, error);
          return res.status(500).json({ 
            message: "Napaka pri obdelavi slik", 
            error: error.message 
          });
        }

        console.log(`process_pipeline.py zaključena:\n${stdout}`);
        if (stderr) console.error(`Napake:\n${stderr}`);

        // Počisti začasne datoteke
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
          console.log(`Začasna mapa ${tmpDir} odstranjena.`);
        } catch (cleanupError) {
          console.warn(`Napaka pri čiščenju tmp: ${cleanupError.message}`);
        }

        res.json({ message: "Slike uspešno obdelane in model ustvarjen." });
      });
    });
  },

  verifyFace: async function (req, res) {
    try {
      // POPRAVEK: Preveri če req.body obstaja in sicer uporabi prazen objekt
      const body = req.body || {};
      const userId = body.userId;
      const twoFaId = body.twoFaId;
      
      if (!userId || !twoFaId) {
        return res.status(400).json({ 
          message: "Manjkajo userId ali twoFaId." 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          message: "Slika ni bila naložena." 
        });
      }

      const imagePath = req.file.path;
      const request = await TwoFactorRequest.findById(twoFaId).populate('user');
      
      if (!request) {
        fs.unlinkSync(imagePath);
        return res.status(404).json({ 
          message: "2FA zahteva ne obstaja." 
        });
      }

      if (request.approved || request.rejected) {
        fs.unlinkSync(imagePath);
        return res.status(400).json({ 
          message: "Zahteva je že obdelana." 
        });
      }

      const user = request.user;
      if (!user || !user.faceModel) {
        fs.unlinkSync(imagePath);
        return res.status(404).json({ 
          message: "Uporabnik nima modela obraza." 
        });
      }

      const modelPath = user.faceModel;
      const scriptPath = path.join(__dirname, '../../scripts/face_recognition/verify_face.py');
      const cmd = `python "${scriptPath}" --model "${modelPath}" --image "${imagePath}"`;

      exec(cmd, async (error, stdout, stderr) => {
        // Vedno izbriši začasno sliko
        try {
          fs.unlinkSync(imagePath);
        } catch (cleanError) {
          console.warn(`Napaka pri brisanju slike: ${cleanError.message}`);
        }

        if (error) {
          console.error(`Napaka pri zagonu verify_face.py:`, error);
          request.rejected = true;
          await request.save();
          return res.status(500).json({ 
            message: "Napaka pri preverjanju obraza.", 
            error: error.message 
          });
        }

        let result;
        try {
          result = JSON.parse(stdout.trim());
        } catch (parseError) {
          console.error('Napaka pri parsanju JSON:', parseError);
          request.rejected = true;
          await request.save();
          return res.status(500).json({ 
            message: "Neveljaven odgovor od sistema.", 
            error: parseError.message 
          });
        }

        if (result.match) {
          request.approved = true;
          await request.save();
          return res.json({ 
            success: true, 
            message: "Obraz prepoznan! Dostop odobren." 
          });
        } else {
          request.rejected = true;
          await request.save();
          return res.status(401).json({ 
            success: false, 
            message: "Obraz ni bil prepoznan." 
          });
        }
      });
    } catch (err) {
      console.error("Napaka v verifyFace:", err);
      return res.status(500).json({ 
        message: "Notranja napaka.", 
        error: err.message 
      });
    }
  },

  approve: async function (req, res) {
    try {
      const request = await TwoFactorRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Zahteva ne obstaja." });
      }

      request.approved = true;
      await request.save();
      res.json({ message: "Dostop odobren." });
    } catch (err) {
      res.status(500).json({ 
        message: "Napaka pri potrditvi", 
        error: err.message 
      });
    }
  },

  reject: async function (req, res) {
    try {
      const request = await TwoFactorRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Zahteva ne obstaja." });
      }

      request.rejected = true;
      await request.save();
      res.json({ message: "Dostop zavrnjen." });
    } catch (err) {
      res.status(500).json({ 
        message: "Napaka pri zavrnitvi", 
        error: err.message 
      });
    }
  },

  status: async function (req, res) {
    try {
      const request = await TwoFactorRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Zahteva ne obstaja." });
      }

      res.json({ 
        approved: request.approved, 
        rejected: request.rejected 
      });
    } catch (err) {
      res.status(500).json({ 
        message: "Napaka pri preverjanju", 
        error: err.message 
      });
    }
  }
};