require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// Configuration
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const HEALTH_ENDPOINT = `${TARGET_URL}/api/_internal/health`;
const CHECK_INTERVAL = 30 * 1000; // 30 seconds
const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID;
const MONITOR_SECRET = process.env.MONITOR_SECRET;

// Thresholds
const THRESHOLDS = {
  cpu: 85,
  memory: 85,
  disk: 80,
  latency: 1000
};

// State
let lastAlerts = {}; // Map<alertType, timestamp>
const ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes per alert type
let isHealthy = true;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`✅ Monitor Bot Logged in as ${client.user.tag}`);
  console.log(`🎯 Monitoring Target: ${HEALTH_ENDPOINT}`);
  
  // Start Monitoring Loop
  setInterval(checkHealth, CHECK_INTERVAL);
  checkHealth(); // Initial check
});

async function checkHealth() {
  try {
    const start = Date.now();
    const response = await fetch(HEALTH_ENDPOINT, {
      headers: { 'x-monitoring-secret': MONITOR_SECRET }
    });
    const duration = Date.now() - start;

    // 1. Check HTTP Status
    if (!response.ok) {
      await sendAlert('HTTP_ERROR', `Target returned ${response.status} ${response.statusText}`, 'red');
      isHealthy = false;
      return;
    }

    const data = await response.json();

    // 2. Check System Stats
    const issues = [];

    if (data.system.cpuUsage > THRESHOLDS.cpu) {
      issues.push(`🔥 High CPU: ${data.system.cpuUsage}%`);
    }
    if (data.system.memoryUsage > THRESHOLDS.memory) {
      issues.push(`💾 High Memory: ${data.system.memoryUsage}%`);
    }
    if (data.firestore.latency > THRESHOLDS.latency) {
      issues.push(`🐢 High Firestore Latency: ${data.firestore.latency}ms`);
    }
    if (data.firestore.status !== 'ok') {
      issues.push(`❌ Firestore Error: ${data.firestore.status}`);
    }

    // 3. Handle Issues
    if (issues.length > 0) {
      await sendAlert('SYSTEM_ISSUE', issues.join('\n'), 'orange', data);
      isHealthy = false;
    } else {
      // Recovery Check
      if (!isHealthy) {
        await sendAlert('RECOVERY', '✅ System returned to normal parameters.', 'green', data);
        isHealthy = true;
      }
    }

  } catch (error) {
    console.error('Check Failed:', error);
    await sendAlert('DOWN', `❌ Monitor failed to reach target: ${error.message}`, 'red');
    isHealthy = false;
  }
}

async function sendAlert(type, message, color, data = null) {
  // Rate Limiting
  const lastSent = lastAlerts[type];
  if (lastSent && Date.now() - lastSent < ALERT_COOLDOWN && type !== 'RECOVERY') {
    return; // Skip alert
  }

  const channel = client.channels.cache.get(ALERT_CHANNEL_ID);
  if (!channel) {
    console.error(`Alert channel ${ALERT_CHANNEL_ID} not found!`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🚨 Monitor Alert: ${type}`)
    .setDescription(message)
    .setColor(color === 'red' ? 0xFF0000 : color === 'orange' ? 0xFFA500 : 0x00FF00)
    .setTimestamp();

  if (data) {
    embed.addFields(
      { name: 'CPU', value: `${data.system.cpuUsage}%`, inline: true },
      { name: 'RAM', value: `${data.system.memoryUsage}%`, inline: true },
      { name: 'Latency', value: `${data.firestore.latency}ms`, inline: true }
    );
  }

  try {
    await channel.send({ embeds: [embed] });
    lastAlerts[type] = Date.now();
    console.log(`Sent alert: ${type}`);
  } catch (err) {
    console.error('Failed to send alert:', err);
  }
}

client.login(process.env.DISCORD_TOKEN);
