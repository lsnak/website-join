const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('../db'); // db.js 경로 맞게 수정

const LICENSE_FILE = path.join(__dirname, '..', 'licenses.txt');

function loadLicenses() {
  if (!fs.existsSync(LICENSE_FILE)) return [];
  return fs.readFileSync(LICENSE_FILE, 'utf8')
    .split('\n')
    .map(l => l.trim().toLowerCase())
    .filter(Boolean);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('라이센스등록')
    .setDescription('라이센스를 등록합니다.')
    .addStringOption(option =>
      option.setName('코드')
        .setDescription('라이센스 코드')
        .setRequired(true)
    ),

  async execute(interaction) {
    const inputCode = interaction.options.getString('코드').trim().toLowerCase();
    const licenses = loadLicenses();

    if (!licenses.includes(inputCode)) {
      return interaction.reply({ content: '❌ 유효하지 않은 라이센스 코드입니다.', ephemeral: true });
    }

    try {
      const db = await connectDB();
      const collection = db.collection('licenses');

      const existing = await collection.findOne({ code: inputCode });
      if (existing) {
        return interaction.reply({ content: '❌ 이미 등록된 라이센스 코드입니다.', ephemeral: true });
      }

      const now = new Date().toISOString();
      await collection.insertOne({
        code: inputCode,
        userId: interaction.user.id,
        registeredAt: now,
        active: true
      });

      const embed = new EmbedBuilder()
        .setTitle('✅ 라이센스 등록 완료')
        .setDescription(`라이센스 코드: \`${inputCode}\`\n등록자: <@${interaction.user.id}>`)
        .setColor('Green');

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('MongoDB 오류:', error);
      await interaction.reply({ content: '❌ 데이터베이스 오류가 발생했습니다.', ephemeral: true });
    }
  }
};
