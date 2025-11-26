const DiscordLogger = require('../utils/logger');
const { db } = require('../utils/firebase');
const { ActivityType } = require('discord.js');
const { processQueue } = require('../utils/emailQueue');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {

    client.logger = new DiscordLogger(client, db);
    console.log(`✅ Bot ready: ${client.user.tag}`);
    console.log(`✅ Logger initialized`);
    
    client.user.setActivity('Jambi Store Customer', { type: ActivityType.Watching });

    // Start email queue worker (every 1 minute)
    console.log('📧 Starting email queue worker...');
    setInterval(() => {
      processQueue();
    }, 60 * 1000);
    
    // Run immediately on startup
    processQueue();
  },
};
