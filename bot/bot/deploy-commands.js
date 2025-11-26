const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const rest = new REST({ version: '10' }).setToken(
  process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN
);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    // Get guild ID from environment or use global commands
    const guildId = process.env.DISCORD_GUILD_ID;

    if (guildId) {
      // Register guild-specific commands (instant update)
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
        { body: commands }
      );
      console.log(`✅ Successfully registered guild commands for guild ${guildId}`);
    } else {
      // Register global commands (takes up to 1 hour to update)
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Successfully registered global application commands.');
    }

  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
