require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

client.once('ready', () => {
  console.log(`${client.user.tag}`);

  const app = express();
  const PORT = process.env.API_PORT || 3000;

  app.get('/api/server-info', async (req, res) => {
    try {
      const guildId = process.env.GUILD_ID;
      const guild = client.guilds.cache.get(guildId);

      if (!guild) return res.status(404).json({ error: 'Guild not found' });

      await guild.members.fetch(); 

      const onlineCount = guild.members.cache.filter(
        (m) => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd'
      ).size;

      const totalCount = guild.memberCount;

      return res.json({
        name: guild.name,
        iconURL: guild.iconURL({ dynamic: true, size: 1024 }),
        online: onlineCount,
        total: totalCount
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: '서버 오류' });
    }
  });

  app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}/api/server-info`);
  });
});

client.login(process.env.BOT_TOKEN);
