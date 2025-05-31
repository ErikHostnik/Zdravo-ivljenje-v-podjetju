// controllers/TwoFactorController.js
const TwoFactorRequest = require('../models/TwoFactorRequestModel.js');
const User = require('../models/UserModel.js');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const multer = require('multer');

// ... (obstoječi multer za upload slik za treniranje ostane nespremenjen) ...
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

module.exports = {
  // ---- (1) Obstoječa metoda za ustvarjanje 2FA zahteve ----
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

  // ---- (2) Obstoječa metoda za nalaganje slik za treniranje ----
  uploadImages: function (req, res) {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(500).json({ message: "Napaka pri nalaganju slik", error: err });
      }

      const userId = req.body.user || req.params.userId;
      const tmpDir = path.join(__dirname, '../../uploads/tmp', userId);
      const dataDir = path.join(__dirname, '../../scripts/face_recognition/data', userId);

      // Ustvari podatkovni direktorij (če obstaja, ga zbriši najprej) ...
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      fs.mkdirSync(dataDir, { recursive: true });

      try {
        const files = fs.readdirSync(tmpDir);

        // Kopiraj originalne slike iz tmpDir v dataDir ...
        for (const file of files) {
          const sourcePath = path.join(tmpDir, file);
          const destPath = path.join(dataDir, file);
          fs.copyFileSync(sourcePath, destPath);
        }
      } catch (copyError) {
        return res.status(500).json({ message: "Napaka pri kopiranju slik", error: copyError.message });
      }

      // Zaženi Python pipeline za treniranje/augmentacijo slik ...
      const scriptPath = path.join(__dirname, '../../scripts/face_recognition/process_pipeline.py');
      const cmd = `py "${scriptPath}" "${dataDir}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(` Napaka pri zagonu process_pipeline.py:`, error);
          return res.status(500).json({ message: "Napaka pri obdelavi slik", error: error.message });
        }

        console.log(` process_pipeline.py zaključena.`);
        console.log(stdout);
        if (stderr) console.error(stderr);

        const preprocessedDir = path.join(dataDir, 'preprocessed');

        try {
          // Premakni vse slike iz preprocessed nazaj v dataDir ...
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
          console.warn(` Napaka pri premiku končnih slik iz preprocessed:`, moveError.message);
        }

        try {
          // Izbriši vse ne‐augmentirane slike (če ne vsebujejo '_aug') ...
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
          console.warn(` Napaka pri čiščenju končnih slik:`, cleanupError.message);
        }

        // Počisti začasne slike v tmpDir
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
          console.log(` Začasna mapa ${tmpDir} odstranjena.`);
        } catch (cleanupError) {
          console.warn(` Napaka pri čiščenju začasnih slik:`, cleanupError.message);
        }

        res.json({ message: "Slike uspešno naložene in obdelava je zaključena." });
      });
    });
  },

  // ---- (3) NOVA metoda: verifyFace (preveri en obraz + odobri ali zavrne TwoFactorRequest) ----
  verifyFace: async function (req, res) {
    /*
      Pričakujemo JSON telo:
      {
        "imageBase64": "<Base64 string>",
        "userId": "<MongoDB ObjectId kot string>"
      }
      in v URL parametru -> req.params.id = twoFactorRequestId
    */
    try {
      const twoFaId = req.params.id;
      const { imageBase64, userId } = req.body;

      if (!imageBase64 || !userId) {
        return res.status(400).json({ message: "Manjkajoči podatki (imageBase64 ali userId)." });
      }

      // 1) Poišči TwoFactorRequest (in hkrati pridobi user objekt, da dobimo faceModelPath)
      const request = await TwoFactorRequest.findById(twoFaId).populate('user');
      if (!request) {
        return res.status(404).json({ message: "2FA zahteva ne obstaja." });
      }
      if (request.approved || request.rejected) {
        return res.status(400).json({ message: "2FA zahteva je že obdelana." });
      }
      // "user" je že populate‐an v request.user
      const user = request.user;
      if (!user) {
        return res.status(404).json({ message: "Uporabnik pri zahtevi ne obstaja." });
      }

      // 2) Preverimo, ali je faceModelPath nastavljena
      const faceModelPath = user.faceModelPath;
      if (!faceModelPath || faceModelPath.trim().length === 0) {
        return res.status(500).json({ message: "Ne najdem faceModelPath za uporabnika." });
      }

      // 3) Dekodiraj Base64 v datoteko
      // Ustvarimo začasno mapo, npr. uploads/tmp/[userId]/verify/
      const tmpVerifyDir = path.join(__dirname, '../../uploads/tmp', userId, 'verify');
      fs.mkdirSync(tmpVerifyDir, { recursive: true });

      // Shranimo sliko kot JPEG
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const filename = `${Date.now()}.jpg`;
      const imagePath = path.join(tmpVerifyDir, filename);
      fs.writeFileSync(imagePath, imageBuffer);

      // 4) Pokličemo Python skripto, ki vrne JSON s poljem "match": true/false
      //    Predpostavimo, da je verify_face.py v scripts/face_recognition/
      const scriptPath = path.join(__dirname, '../../scripts/face_recognition/verify_face.py');
      // Primer klica: python verify_face.py --model /pot/do/modela --image /pot/do/slike
      const cmd = `py "${scriptPath}" --model "${faceModelPath}" --image "${imagePath}"`;

      exec(cmd, async (error, stdout, stderr) => {
        if (error) {
          console.error(`Napaka pri zagonu verify_face.py:`, error);
          // označimo kot zavrnjeno, ker preverjanje ni uspelo
          request.rejected = true;
          await request.save();
          return res.status(500).json({ message: "Napaka pri preverjanju obraza.", error: error.message });
        }

        // Analiza stdout-a: pričakujemo, da skripta izpiše nekaj kot: {"match": true} ali {"match": false}
        let parsed = null;
        try {
          parsed = JSON.parse(stdout);
        } catch (parseErr) {
          console.error('Ne morem parse‐ati JSON iz verify_face.py:', parseErr);
          request.rejected = true;
          await request.save();
          return res.status(500).json({ message: "Obrazni preizkus ni vrnil pravilnega formata." });
        }

        const matched = parsed.match === true;
        if (matched) {
          request.approved = true;
          await request.save();
          // Po potrebi izbrisemo začasno sliko
          try { fs.unlinkSync(imagePath); } catch (_) {}
          return res.json({ message: "✅ Obraz se ujema. Dostop odobren.", approved: true });
        } else {
          request.rejected = true;
          await request.save();
          try { fs.unlinkSync(imagePath); } catch (_) {}
          return res.json({ message: "❌ Obraz se ne ujema. Dostop zavrnjen.", approved: false });
        }
      });
    } catch (err) {
      console.error("Napaka v verifyFace:", err);
      return res.status(500).json({ message: "Notranja napaka pri preverjanju 2FA face.", error: err.message });
    }
  },

  // ---- (4) Obstoječi approve, reject, status ostanejo nespremenjeni ----

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
