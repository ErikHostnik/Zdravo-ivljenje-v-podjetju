console.log("[DEBUG] ActiveDeviceService.js loaded");

function start() {
    console.log("[DEBUG] start() called in ActiveDeviceService");
}

const mqtt = require('mqtt');

const activeUsers = new Map();
const HEARTBEAT_TOPIC_PREFIX = process.env.HEARTBEAT_TOPIC_PREFIX || 'status/heartbeat/';
const HEARTBEAT_TIMEOUT_SECONDS = parseInt(process.env.HEARTBEAT_TIMEOUT_SECONDS, 10) || 90;

function pruneInactive() {
    const now = Date.now();
    for (const [userId, lastTs] of activeUsers.entries()) {
        if (now - lastTs > HEARTBEAT_TIMEOUT_SECONDS * 1000) {
            activeUsers.delete(userId);
        }
    }
}

function start() {
    const brokerUrl = process.env.MQTT_URI || 'mqtt://mosquitto:1883';
    const client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
        client.subscribe(`${HEARTBEAT_TOPIC_PREFIX}#`, err => {
            if (err) console.error('ActiveDeviceService subscribe error:', err);
        });
    });

    client.on('message', (topic, message) => {
        if (!topic.startsWith(HEARTBEAT_TOPIC_PREFIX)) return;
        const userId = topic.slice(HEARTBEAT_TOPIC_PREFIX.length);
        try {
            const { timestamp } = JSON.parse(message.toString());
            activeUsers.set(userId, Date.parse(timestamp));
        } catch {
            activeUsers.set(userId, Date.now());
        }
    });

    setInterval(pruneInactive, HEARTBEAT_TIMEOUT_SECONDS * 1000);
}

function getCount() {
    pruneInactive();
    return activeUsers.size;
}

module.exports = { start, getCount };
