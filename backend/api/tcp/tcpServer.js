const net = require('net');
const SensorData = require('../models/SensorDataModel');
const User = require('../models/UserModel');
const { compress, decompress } = require('../utils/kodiranjeRLE');
const { bitsToBuffer } = require('../utils/bitpack');
const { broadcast } = require('../utils/liveHub');

const TCP_PORT = 9000;
const START_LAT = 46.0569;
const START_LON = 14.5058;
const STEP_METERS = 0.7;
const STEP_THRESHOLD = 1.2;

function detectStep(prev, curr) {
  if (!prev) return false;
  const magPrev = Math.sqrt(prev.x ** 2 + prev.y ** 2 + prev.z ** 2);
  const magCurr = Math.sqrt(curr.x ** 2 + curr.y ** 2 + curr.z ** 2);
  return magCurr > STEP_THRESHOLD && magPrev <= STEP_THRESHOLD;
}

module.exports.startTcpServer = function () {
  const server = net.createServer(async socket => {
    console.log('[TCP] STM32 connected');
    socket.write('OK\r\n');

    const user = await User.findOne({ username: 'stm32' });
    if (!user) { console.error('[TCP] User "stm32" not found'); socket.destroy(); return; }
    const userId = user._id.toString();

    let lastSample = null;
    let buffer = '';
    let lastPacketTs = null;

    let stepCount = 0;
    let distance = 0;
    let speedSum = 0;
    let speedMin = Infinity;
    let speedMax = -Infinity;
    let samples = 0;

    let currentLat = START_LAT;
    let currentLon = START_LON;

    const SCALE = 10;
    const OFFSET = 128;
    const toQ = v => Math.max(0, Math.min(255, Math.round(v * SCALE) + OFFSET));
    const fromQ = q => (q - OFFSET) / SCALE;

    const xs = [];
    const ys = [];
    const zs = [];

    broadcast(userId, 'session', { state: 'started', ts: Date.now() });

    const watchdog = setInterval(() => {
      if (!lastPacketTs) return;
      if (Date.now() - lastPacketTs > 20000) {
        console.log('[TCP] Timeout – closing socket');
        socket.end();
      }
    }, 2000);

    socket.on('data', data => {
      lastPacketTs = Date.now();
      buffer += data.toString();

      while (buffer.includes('\n')) {
        const line = buffer.slice(0, buffer.indexOf('\n')).trim();
        buffer = buffer.slice(buffer.indexOf('\n') + 1);
        if (!line) continue;

        try {
          const pkt = JSON.parse(line);

          const sample = { x: Number(pkt.x), y: Number(pkt.y), z: Number(pkt.z), id: pkt.id ?? null };
          const speed = Math.sqrt(sample.x * sample.x + sample.y * sample.y + sample.z * sample.z);

          if (lastSample) {
            const dx = sample.x - lastSample.x;
            const dy = sample.y - lastSample.y;
            const dz = sample.z - lastSample.z;
            distance += Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.01;
          }

          const stepped = detectStep(lastSample, sample);
          if (stepped) {
            stepCount++;
            const angle = Math.atan2(sample.y, sample.x);
            const dx_m = Math.cos(angle) * STEP_METERS;
            const dy_m = Math.sin(angle) * STEP_METERS;
            currentLat += dy_m / 111111;
            currentLon += dx_m / (111111 * Math.cos(currentLat * Math.PI / 180));
          }

          speedSum += speed;
          speedMin = Math.min(speedMin, speed);
          speedMax = Math.max(speedMax, speed);
          samples++;

          lastSample = sample;

          xs.push(toQ(sample.x));
          ys.push(toQ(sample.y));
          zs.push(toQ(sample.z));

          const live = {
            ts: Date.now(),
            id: sample.id,
            x: sample.x,
            y: sample.y,
            z: sample.z,
            mag: speed,
            step: stepped,
            stepCount,
            distance,
            avgSpeed: speedSum / samples,
            minSpeed: speedMin === Infinity ? 0 : speedMin,
            maxSpeed: speedMax === -Infinity ? 0 : speedMax,
            lat: currentLat,
            lon: currentLon
          };

          broadcast(userId, 'sample', live);
        } catch {
          console.warn('[TCP] Invalid JSON:', line);
        }
      }
    });

    socket.on('end', async () => {
      clearInterval(watchdog);
      console.log('[TCP] STM32 disconnected – saving compressed only');
      broadcast(userId, 'session', { state: 'ended', ts: Date.now() });

      if (!samples) { console.warn('[TCP] Empty session – nothing saved'); return; }

      const stats = {
        stepCount,
        distance,
        avgSpeed: speedSum / samples,
        minSpeed: speedMin === Infinity ? 0 : speedMin,
        maxSpeed: speedMax === -Infinity ? 0 : speedMax,
        altitudeDistance: 0
      };

      const cx = compress(xs);
      const cy = compress(ys);
      const cz = compress(zs);

      const rx = decompress(cx).map(fromQ);
      const ry = decompress(cy).map(fromQ);
      const rz = decompress(cz).map(fromQ);

      const ok = rx.length === xs.length && ry.length === ys.length && rz.length === zs.length;
      const rawBits = xs.length * 8 * 3;
      const compBits = cx.length + cy.length + cz.length;
      const ratio = compBits / rawBits;
      console.log(`[TCP] rawBits=${rawBits} compBits=${compBits} ratio=${ratio.toFixed(3)} ok=${ok}`);

      const activity = new SensorData({
        user: user._id,
        stats,
        compressed: {
          scale: SCALE,
          offset: OFFSET,
          count: xs.length,
          xBits: cx.length,
          yBits: cy.length,
          zBits: cz.length,
          x: bitsToBuffer(cx),
          y: bitsToBuffer(cy),
          z: bitsToBuffer(cz),
          ratio
        }
      });

      const saved = await activity.save();
      user.activities.push(saved._id);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      let daily = user.dailyStats.find(d => new Date(d.date).getTime() === today.getTime());
      if (!daily) {
        daily = { date: today, stepCount: 0, distance: 0, avgSpeed: stats.avgSpeed, minSpeed: stats.minSpeed, maxSpeed: stats.maxSpeed, altitudeDistance: 0 };
        user.dailyStats.push(daily);
      }
      daily.stepCount += stats.stepCount;
      daily.distance += stats.distance;
      daily.avgSpeed = (daily.avgSpeed + stats.avgSpeed) / 2;
      daily.minSpeed = Math.min(daily.minSpeed, stats.minSpeed);
      daily.maxSpeed = Math.max(daily.maxSpeed, stats.maxSpeed);

      await user.save();
      console.log('[TCP] Activity saved:', saved._id.toString());

      broadcast(userId, 'saved', { activityId: saved._id.toString(), stats, ratio, ts: Date.now() });
    });

    socket.on('error', err => {
      clearInterval(watchdog);
      console.error('[TCP] Socket error:', err.message);
      broadcast(userId, 'session', { state: 'error', message: err.message, ts: Date.now() });
    });
  });

  server.listen(TCP_PORT, () => { console.log(`[TCP] Listening on ${TCP_PORT}`); });
};
