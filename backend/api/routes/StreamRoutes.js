require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { addClient, sendEvent } = require('../utils/liveHub');

const router = express.Router();

router.get('/live/:userId', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const userId = req.params.userId;
  const remove = addClient(userId, res);

  sendEvent(res, 'status', { ok: true, ts: Date.now() });

  const ping = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    } catch {}
  }, 15000);

  req.on('close', () => {
    clearInterval(ping);
    remove();
    try { res.end(); } catch {}
  });
});

module.exports = router;
