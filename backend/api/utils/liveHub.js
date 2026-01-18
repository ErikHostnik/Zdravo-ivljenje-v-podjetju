const clientsByUser = new Map();

function ensureSet(userId) {
  let s = clientsByUser.get(userId);
  if (!s) {
    s = new Set();
    clientsByUser.set(userId, s);
  }
  return s;
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function addClient(userId, res) {
  const set = ensureSet(userId);
  set.add(res);
  return () => {
    set.delete(res);
    if (set.size === 0) clientsByUser.delete(userId);
  };
}

function broadcast(userId, event, data) {
  const set = clientsByUser.get(userId);
  if (!set) return;
  for (const res of set) {
    try {
      sendEvent(res, event, data);
    } catch {}
  }
}

module.exports = { addClient, broadcast, sendEvent };
