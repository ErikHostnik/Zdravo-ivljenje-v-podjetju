const TwoFactorRequest = require('../models/TwoFactorRequestModel.js');
const User = require('../models/UserModel.js');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const multer = require('multer');

// Detect if the application is running inside Docker
const isDocker = process.env.IS_DOCKER === 'true';

// Base path adjustments for Docker vs local
const basePath = isDocker ? '/usr/src/app' : __dirname;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.body.user || req.params.userId;
    const tmpDir = path.join(basePath, 'uploads/tmp', userId);  // Adjusted path for Docker/local
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

  // Prenos slik za 2FA in obdelava preko Python pipeline
  uploadImages: function (req, res) {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(500).json({ message: "Napaka pri nalaganju slik", error: err });
      }

      const userId = req.body.user || req.params.userId;
      const tmpDir = path.join(basePath, 'uploads/tmp', userId);  // Adjusted path for Docker/local
      const dataDir = path.join(basePath, 'scripts/face_recognition/data', userId);  // Adjusted path for Docker/local

      // Ustvari direktorij za dataDir, če obstaja ga pobriši najprej
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      fs.mkdirSync(dataDir, { recursive: true });

      try {
        const files = fs.readdirSync(tmpDir);

        // Kopira originalne slike iz tmpDir v dataDir
        for (const file of files) {
          const sourcePath = path.join(tmpDir, file);
          const destPath = path.join(dataDir, file);
          fs.copyFileSync(sourcePath, destPath);
        }
      } catch (copyError) {
        return res.status(500).json({ message: "Napaka pri kopiranju slik", error: copyError.message });
      }

      // Klic Python pipeline skripte za obdelavo slik
      const scriptPath = path.join(basePath, 'scripts/face_recognition/process_pipeline.py');  // Adjusted path for Docker/local
      const cmd = `python "${scriptPath}" "${dataDir}"`;

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
          // Premaknemo vse slike iz preprocessed nazaj v dataDir
          if (fs.existsSync(preprocessedDir)) {
            const preprocessedFiles = fs.readdirSync(preprocessedDir);
            for (const file of preprocessedFiles) {
              const srcPath = path.join(preprocessedDir, file);
              const destPath = path.join(dataDir, file);
              fs.renameSync(srcPath, destPath);
            }
            // Izbriši zdaj prazno preprocessed mapo
            fs.rmdirSync(preprocessedDir);
          }
        } catch (moveError) {
          console.warn(` Napaka pri premiku končnih slik iz preprocessed:`, moveError.message);
        }

        try {
          // Izbriši vse datoteke in mape, ki niso augmentirane slike (ne vsebujejo '_aug')
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

  /**
   * POST /api/2fa/recognize/:userId
   * Metoda sproži Python skripto, ki naredi face-recognition na podatkih v data/userId.
   */
  recognize: async function (req, res) {
    try {
      const userId = req.params.userId;

      // (Neobvezno) Preverba JWT/auth—primer, če uporabljate auth-middleware, je lahko req.user.id:
      // if (req.user.id !== userId) {
      //   return res.status(403).json({ message: 'Niste pooblaščeni za prepoznavanje za tega uporabnika.' });
      // }

      // Sestavite pot do mape, kjer so že obdelane (augmentirane) slike:
      const dataDir = path.join(basePath, 'scripts/face_recognition/data', userId);  // Adjusted path for Docker/local
      // Pot do Python skripte:
      const scriptPath = path.join(basePath, 'scripts/face_recognition/recognition_model.py');  // Adjusted path for Docker/local

      // Prepričajte se, da mapa dataDir obstaja:
      if (!fs.existsSync(dataDir)) {
        return res.status(400).json({ message: `Podatki za uporabnika ${userId} ne obstajajo.` });
      }

      // Zaženemo Python skripto s parametrom dataDir
      exec(`python "${scriptPath}" "${dataDir}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`[recognition] Napaka pri zagonu:`, error);
          return res.status(500).json({
            message: 'Napaka pri prepoznavanju obrazov',
            error: error.message
          });
        }

        console.log('[recognition] Rezultat stdout:', stdout);
        if (stderr) console.warn('[recognition] STDERR:', stderr);

        return res.json({ message: 'Prepoznavanje obrazov je zaključeno.' });
      });

    } catch (err) {
      console.error('[recognize controller] Uncaught error:', err);
      res.status(500).json({ message: 'Napaka pri sprožitvi prepoznave', error: err });
    }
  },

  // Popravljena metoda verifyFace: ob uspešnem ujemanju avtomatsko pokliče approve
  verifyFace: async function (req, res) {
    try {
      const userId = req.params.userId;
      const twoFaId = req.body.twoFaId; // ID dvostopenjske zahteve iz Flutterja
      const imageFile = req.file;

      console.log('✅ Začetek verifyFace');
      console.log('📸 userId:', userId);
      console.log('🆔 twoFaId:', twoFaId);
      console.log('📸 imageFile:', imageFile);

      if (!imageFile) {
        console.log('❌ Slika ni bila poslana.');
        return res.status(400).json({ success: false, message: "Slika ni bila poslana." });
      }
      if (!twoFaId) {
        console.log('❌ twoFaId ni bil poslan.');
        return res.status(400).json({ success: false, message: "twoFaId je obvezen parameter." });
      }

      const modelPath = path.join(basePath, 'scripts/face_recognition/models', `${userId}.yml`);  // Adjusted path for Docker/local
      console.log('📂 Model Path:', modelPath);

      if (!fs.existsSync(modelPath)) {
        console.log('❌ Model ne obstaja.');
        return res.status(400).json({ success: false, message: "Model za to osebo ne obstaja." });
      }

      const verifyDir = path.join(basePath, 'uploads/verify');  // Adjusted path for Docker/local
      fs.mkdirSync(verifyDir, { recursive: true });
      const verifyPath = path.join(verifyDir, `${userId}_verify.jpg`);
      fs.copyFileSync(imageFile.path, verifyPath);

      console.log('🖼️ Shranjena začasna slika na:', verifyPath);

      const scriptPath = path.join(basePath, 'scripts/face_recognition/verify_face.py');  // Adjusted path for Docker/local
      const cmd = `python "${scriptPath}" --model "${modelPath}" --image "${verifyPath}"`;
      console.log('🚀 Klic Python skripte:', cmd);

      exec(cmd, async (error, stdout, stderr) => {
        console.log('🔍 Rezultat exec klica:');
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
        console.log('ERROR:', error);

        try {
          fs.unlinkSync(imageFile.path);
          fs.unlinkSync(verifyPath);
          console.log('🧹 Začasne datoteke pobrisane');
        } catch (err) {
          console.log('⚠️ Napaka pri brisanju datotek:', err.message);
        }

        if (error) {
          console.error(`❌ Napaka pri preverjanju obraza: ${error.message}`);
          return res.status(500).json({ success: false, message: "Napaka pri preverjanju obraza", error: error.message });
        }

        try {
          const result = JSON.parse(stdout);
          console.log('✅ JSON rezultat iz Python:', result);

          if (result.error) {
            console.log('❌ Python error:', result.error);
            return res.status(400).json({ success: false, message: result.error });
          }

          if (!result.match) {
            console.log(`❌ Obraz se ni ujemal (confidence: ${result.confidence})`);
            return res.status(401).json({
              success: false,
              message: "Preverjanje obraza ni uspelo",
              confidence: result.confidence
            });
          }

          try {
            const request = await TwoFactorRequest.findById(twoFaId);
            if (!request) {
              console.log('❌ TwoFactorRequest ne obstaja:', twoFaId);
              return res.status(404).json({ success: false, message: "2FA zahteva ne obstaja." });
            }
            request.approved = true;
            await request.save();
            console.log('✅ TwoFactorRequest je odobrena:', twoFaId);
          } catch (dbErr) {
            console.error(' Napaka pri shranjevanju TwoFactorRequest:', dbErr);
            return res.status(500).json({ success: false, message: "Napaka pri odobritvi 2FA", error: dbErr.message });
          }

          return res.json({
            success: true,
            match: result.match,
            confidence: result.confidence,
            label: result.label
          });

        } catch (parseError) {
          console.log('❌ Napaka pri JSON.parse:', parseError.message);
          return res.status(500).json({
            success: false,
            message: "Napaka pri obdelavi rezultatov",
            error: parseError.message,
            raw: stdout
          });
        }
      });
    } catch (err) {
      console.log('❌ Napaka v try-catch:', err.message);
      return res.status(500).json({ success: false, message: "Napaka pri preverjanju obraza", error: err.message });
    }
  }
};
