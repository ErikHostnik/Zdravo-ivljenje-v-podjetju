// controllers/TwoFactorController.js
const TwoFactorRequest = require('../models/TwoFactorRequestModel.js');
const User = require('../models/UserModel.js');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const multer = require('multer');

// ----- (1) Multer za nalaganje slik za trening ostane enak -----
const storage = multer.diskStorage({
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
const upload = multer({
  storage: storage,
  limits: { files: 100, fileSize: 5 * 1024 * 1024 },
}).array('images', 100);

// ----- (2) Obstoječa metoda “create” ostane nespremenjena -----
module.exports = {
  create: async function (req, res) {
    try {
      const existing = await TwoFactorRequest.findOne({
        user: req.body.user,
        approved: false,
        rejected: false
      });
      if (existing) return res.status(400).json({ message: "Zahteva že obstaja." });

      const newRequest = new TwoFactorRequest({ user: req.body.user });
      await newRequest.save();

      // Pošlji MQTT sporočilo (predpostavljeno, da imaš konfiguriran “client”)
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

  // ----- (3) Obstoječa metoda “uploadImages” za treniranje ostane nespremenjena -----
  uploadImages: function (req, res) {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(500).json({ message: "Napaka pri nalaganju slik", error: err });
      }

      const userId = req.body.user || req.params.userId;
      const tmpDir = path.join(__dirname, '../../uploads/tmp', userId);
      const dataDir = path.join(__dirname, '../../scripts/face_recognition/data', userId);

      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      fs.mkdirSync(dataDir, { recursive: true });

      try {
        const files = fs.readdirSync(tmpDir);
        for (const file of files) {
          const sourcePath = path.join(tmpDir, file);
          const destPath = path.join(dataDir, file);
          fs.copyFileSync(sourcePath, destPath);
        }
      } catch (copyError) {
        return res.status(500).json({ message: "Napaka pri kopiranju slik", error: copyError.message });
      }

      const scriptPath = path.join(__dirname, '../../scripts/face_recognition/process_pipeline.py');
      const cmd = `py "${scriptPath}" "${dataDir}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Napaka pri zagonu process_pipeline.py:`, error);
          return res.status(500).json({ message: "Napaka pri obdelavi slik", error: error.message });
        }

        console.log(`process_pipeline.py zaključena.`);
        console.log(stdout);
        if (stderr) console.error(stderr);

        const preprocessedDir = path.join(dataDir, 'preprocessed');
        try {
          if (fs.existsSync(preprocessedDir)) {
            const preprocessedFiles = fs.readdirSync(preprocessedDir);
            for (const file of preprocessedFiles) {
              const srcPath = path.join(preprocessedDir, file);
              const destPath = path.join(dataDir, file);
              fs.renameSync(srcPath, destPath);
            }
            fs.rmdirSync(preprocessedDir);
          }
        } catch (moveError) {
          console.warn(`Napaka pri premiku končnih slik iz preprocessed:`, moveError.message);
        }

        try {
          const processedFiles = fs.readdirSync(dataDir);
          for (const file of processedFiles) {
            if (!file.includes('_aug')) {
              const fullPath = path.join(dataDir, file);
              const stats = fs.statSync(fullPath);
              if (stats.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(fullPath);
              }
            }
          }
        } catch (cleanupError) {
          console.warn(`Napaka pri čiščenju končnih slik:`, cleanupError.message);
        }

        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
          console.log(`Začasna mapa ${tmpDir} odstranjena.`);
        } catch (cleanupError) {
          console.warn(`Napaka pri čiščenju začasnih slik:`, cleanupError.message);
        }

        res.json({ message: "Slike uspešno naložene in obdelava je zaključena." });
      });
    });
  },

  // ----- (4) NOVA metoda: verifyFace, ki pričakuje multipart/form-data 'image' -----
  //    └── route: POST /verify (glej spodaj v TwoFactorRoutes.js)
  verifyFace: async function (req, res) {
    try {
      // 4.1) Parsiraj polja iz form-data
      const { userId, twoFaId } = req.body;
      if (!userId || !twoFaId) {
        return res.status(400).json({ message: "Manjkajoče polje userId ali twoFaId." });
      }

      // 4.2) Parsiraj naloženo sliko
      if (!req.file) {
        return res.status(400).json({ message: "Slika ni bila naložena (polje 'image')." });
      }
      const imagePath = req.file.path;

      // 4.3) Najdi TwoFactorRequest in populate 'user' (da dobimo model)
      const request = await TwoFactorRequest.findById(twoFaId).populate('user');
      if (!request) {
        // izbriši sliko, ker zahteva ne obstaja
        fs.unlinkSync(imagePath);
        return res.status(404).json({ message: "2FA zahteva ne obstaja." });
      }
      if (request.approved || request.rejected) {
        fs.unlinkSync(imagePath);
        return res.status(400).json({ message: "2FA zahteva je že bila obdelana." });
      }

      // 4.4) Preveri, ali ima user faceModelPath
      const user = request.user;
      if (!user || !user.faceModelPath) {
        fs.unlinkSync(imagePath);
        return res.status(500).json({ message: "Ne najdem faceModelPath za uporabnika." });
      }
      const faceModelPath = user.faceModelPath;

      // 4.5) Pokličemo Python skripto verify_face.py z argumenti: --model in --image
      const scriptPath = path.join(__dirname, '../../scripts/face_recognition/verify_face.py');
      const cmd = `py "${scriptPath}" --model "${faceModelPath}" --image "${imagePath}"`;

      exec(cmd, async (error, stdout, stderr) => {
        if (error) {
          console.error(`Napaka pri zagonu verify_face.py:`, error);
          request.rejected = true;
          await request.save();
          fs.unlinkSync(imagePath);
          return res.status(500).json({ message: "Napaka pri preverjanju obraza.", error: error.message });
        }

        // 4.6) Python izpiše JSON: {"match": true} ali {"match": false}
        let parsed = null;
        try {
          parsed = JSON.parse(stdout.trim());
        } catch (parseErr) {
          console.error('Ne morem parserati JSON iz verify_face.py:', parseErr);
          request.rejected = true;
          await request.save();
          fs.unlinkSync(imagePath);
          return res.status(500).json({ message: "Obrazni test ni vrnil pravilnega formata." });
        }

        const matched = parsed.match === true;
        if (matched) {
          request.approved = true;
          await request.save();
          fs.unlinkSync(imagePath);
          return res.json({ message: "✅ Obraz se ujema. Dostop odobren.", approved: true });
        } else {
          request.rejected = true;
          await request.save();
          fs.unlinkSync(imagePath);
          return res.json({ message: "❌ Obraz se ne ujema. Dostop zavrnjen.", approved: false });
        }
      });
    } catch (err) {
      console.error("Napaka v verifyFace:", err);
      return res.status(500).json({ message: "Notranja napaka pri preverjanju obraza.", error: err.message });
    }
  },

  // ----- (5) Obstoječi approve/reject/status ostanejo enaki -----
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
