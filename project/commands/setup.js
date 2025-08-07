const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { setSettings } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('설정')
    .setDescription('웹서버 이름과 길드 ID를 설정합니다.')
    .addStringOption(option => option
      .setName('웹서버이름')
      .setDescription('join URL에 들어갈 이름')
      .setRequired(true))
    .addStringOption(option => option
      .setName('서버아이디')
      .setDescription('디스코드 서버 ID')
      .setRequired(true)),

  async execute(interaction) {
    const webName = interaction.options.getString('웹서버이름').trim();
    const guildId = interaction.options.getString('서버아이디').trim();

    await setSettings(interaction.guildId, { webName, guildId });

    const embed = new EmbedBuilder()
      .setTitle('⚙️ 설정 완료')
      .setDescription(`웹서버 이름: \`${webName}\`\n서버아이디: \`${guildId}\``)
      .setColor('Blue');

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
