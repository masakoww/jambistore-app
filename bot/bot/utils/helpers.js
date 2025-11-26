const { PermissionFlagsBits } = require('discord.js');
const { db } = require('./firebase');

// Admin role configuration
const ADMIN_ROLES = (process.env.DISCORD_ADMIN_ROLES || '').split(',').filter(Boolean);

function isAdmin(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (ADMIN_ROLES.length > 0) {
    return member.roles.cache.some(role => ADMIN_ROLES.includes(role.id));
  }
  return false;
}

async function getBotConfig() {
  try {
    const doc = await db.collection('bot_settings').doc('main_config').get();
    if (doc.exists) return doc.data();
  } catch (error) {
    console.error('❌ Error fetching bot config:', error);
  }
  return null;
}

module.exports = { isAdmin, getBotConfig, ADMIN_ROLES };
