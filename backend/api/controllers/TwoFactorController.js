const TwoFactorRequest = require('../models/TwoFactorRequestModel.js');
const User = require('../models/UserModel.js');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const multer = require('multer');

// Multer za začasno shranjevanje slik v uploads/tmp/
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.body.user || req.params.userId;
    const tmpDir = path.join(process.cwd(), 'uploads/tmp', userId);
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
        console.log(` Poslana 2FA zahteva na MQTT temo: ${topic}`);
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
      const tmpDir = path.join(process.cwd(), 'uploads/tmp', userId);
      const dataDir = path.join(process.cwd(), 'scripts/face_recognition/data', userId);

      // Ustvari direktorij za dataDir, če obstaja ga pobriši najprej.
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      fs.mkdirSync(dataDir, { recursive: true });

      // Kopiranje originalnih slik iz tmpDir v dataDir
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

      // Zaženi Python pipeline
      const scriptPath = path.join(process.cwd(), 'scripts/face_recognition/process_pipeline.py');
      const cmd = `python "${scriptPath}" "${dataDir}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`[uploadImages] Napaka pri zagonu process_pipeline.py:`, error);
          return res.status(500).json({ message: "Napaka pri obdelavi slik", error: error.message });
        }

        console.log(`[uploadImages] process_pipeline.py zaključena.`);
        console.log(stdout);
        if (stderr) console.error(stderr);

        // Premik augmentiranih slik nazaj, brisanje ostalih
        const preprocessedDir = path.join(dataDir, 'preprocessed');

        try {
          // Premakni vse slike iz preprocessed v dataDir
          if (fs.existsSync(preprocessedDir)) {
            const preprocessedFiles = fs.readdirSync(preprocessedDir);
            for (const file of preprocessedFiles) {
              const srcPath = path.join(preprocessedDir, file);
              const destPath = path.join(dataDir, file);
              fs.renameSync(srcPath, destPath);
            }

          }
        } catch (moveError) {
          console.warn(`[uploadImages] Napaka pri premiku slik:`, moveError.message);
        }

        try {
          // Očisti vse, kar ni augmentirana slika (ne vsebuje "_aug")
          const files = fs.readdirSync(dataDir);
          for (const file of files) {
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
          console.warn(`[uploadImages] Napaka pri čiščenju neaugmentiranih slik:`, cleanupError.message);
        }

        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
          console.log(`[uploadImages] tmpDir izbrisan: ${tmpDir}`);
        } catch (tmpErr) {
          console.warn(`[uploadImages] Napaka pri brisanju tmpDir:`, tmpErr.message);
        }

        res.json({ message: "Slike uspešno naložene in obdelane." });
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

      



      console.log('[recognize] dataDir:', dataDir);
      console.log('[recognize] scriptPath:', scriptPath);

      // Preveri, da mapa obstaja
      if (!fs.existsSync(dataDir)) {
        return res.status(400).json({
          message: `Podatki za uporabnika ${userId} ne obstajajo v ${dataDir}.`
        });
      }

      // Zaženi Python
      const cmd = `python "${scriptPath}" "${dataDir}"`;
      console.log('[recognize] Ukaz za exec:', cmd);

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('[recognize] Napaka pri zagonu:', error);
          return res.status(500).json({
            message: 'Napaka pri prepoznavanju obrazov',
            error: error.message
          });
        }
        console.log('[recognize] stdout:', stdout);
        if (stderr) console.warn('[recognize] stderr:', stderr);

        res.json({
          message: 'Prepoznavanje obrazov je zaključeno.',
          result: stdout.trim()
        });
      });

    } catch (err) {
      console.error('[recognize] Uncaught error:', err);
      res.status(500).json({
        message: 'Napaka pri sprožitvi prepoznave',
        error: err.message
      });
    }
  },

  // Popravljena metoda verifyFace: ob uspešnem ujemanju avtomatsko pokliče approve
  verifyFace: async function (req, res) {
    try {
      const userId = req.params.userId;
      const twoFaId = req.body.twoFaId;
      const imageFile = req.file;

      console.log('[verifyFace] userId:', userId, 'twoFaId:', twoFaId);
      if (!imageFile) {
        return res.status(400).json({ success: false, message: "Slika ni bila poslana." });
      }

      // Pot do modela
      const modelPath = path.join(
        process.cwd(),       // /app
        'scripts/face_recognition/models',
        `${userId}.yml`
      );

      console.log('[verifyFace] files in models/:', fs.readdirSync(path.join(process.cwd(), 'scripts/face_recognition/models')));
      console.log('[verifyFace] existsSync:', fs.existsSync(modelPath));

      console.log('[verifyFace] Model path:', modelPath);
      if (!fs.existsSync(modelPath)) {
        return res.status(400).json({ success: false, message: "Model za to osebo ne obstaja." });
      }

      // Priprava slike za preverjanje
      const verifyDir = path.join(__dirname, '../../uploads/verify');
      fs.mkdirSync(verifyDir, { recursive: true });
      const verifyPath = path.join(verifyDir, `${userId}_verify.jpg`);
      fs.copyFileSync(imageFile.path, verifyPath);

      // Poženemo Python skripto
      const scriptPath = path.join(
        process.cwd(),
        'scripts/face_recognition/verify_face.py'
      );
      const cmd = `python "${scriptPath}" --model "${modelPath}" --image "${verifyPath}"`;
      console.log('[verifyFace] Ukaz za exec:', cmd);
      

      exec(cmd, async (error, stdout, stderr) => {
        // Poženemo čiščenje začasnih slik
        try {
          fs.unlinkSync(imageFile.path);
          fs.unlinkSync(verifyPath);
        } catch (e) {
          console.warn('[verifyFace] Težava pri čiščenju začasnih datotek:', e.message);
        }

        // Če je Python vrgel kakšno napako na stderr ali exit kodo
        if (stderr) {
          console.warn('[verifyFace] Python stderr:', stderr);
        }
        if (error) {
          console.error('[verifyFace] Exec error:', error);
        }

        // Preverimo, ali je stdout sploh kaj
        if (!stdout || !stdout.trim()) {
          console.error('[verifyFace] Python skripta ni vrnila izhoda.');
          return res.status(500).json({
            success: false,
            message: "Python skripta ni vrnila rezultata. Preveri logs.",
            stderr: stderr || null,
            execError: error ? error.message : null
          });
        }

        // Parsing JSON-a iz zadnje vrstice
        const lines = stdout.trim().split(/\r?\n/);
        const jsonLine = lines[lines.length - 1];
        console.log('[verifyFace] JSON iz Python skripte:', jsonLine);

        let pyResult;
        try {
          pyResult = JSON.parse(jsonLine);
        } catch (parseErr) {
          console.error('[verifyFace] Neveljaven JSON iz Python skripte:', jsonLine);
          return res.status(500).json({
            success: false,
            message: "Neveljaven JSON iz Python skripte",
            error: parseErr.message,
            rawStdout: stdout
          });
        }

        if (pyResult.error) {
          return res.status(500).json({ success: false, message: pyResult.error });
        }

        // Uporabi parse-ani rezultat
        try {
          const request = await TwoFactorRequest.findById(twoFaId);
          if (!request) {
            return res.status(404).json({ success: false, message: "2FA zahteva ne obstaja." });
          }

          if (pyResult.match) {
            request.approved = true;
            await request.save();
            return res.json({
              success: true,
              match: true,
              confidence: pyResult.confidence,
              label: pyResult.label
            });
          } else {
            request.rejected = true;
            await request.save();
            return res.status(401).json({
              success: false,
              match: false,
              message: "Preverjanje obraza ni uspelo",
              confidence: pyResult.confidence
            });
          }
        } catch (dbErr) {
          console.error('[verifyFace] Napaka z bazo:', dbErr);
          return res.status(500).json({ success: false, message: "Napaka pri shranjevanju rezultata", error: dbErr.message });
        }
      });

    } catch (err) {
      console.error('[verifyFace] General error:', err);
      return res.status(500).json({ success: false, message: "Napaka pri preverjanju obraza", error: err.message });
    }
  }
};
