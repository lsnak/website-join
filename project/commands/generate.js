const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { connectDB } = require('../db');

function generateLicense() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  function randomString(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  const part1 = randomString(7);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `qvarestore-${part1}-${part2}`;
}

async function checkDuplicate(collection, code) {
  const found = await collection.findOne({ code });
  return !!found;
}

async function insertLicense(collection, code, days, userId = null) {
  const now = new Date().toISOString();
  await collection.insertOne({
    code,
    days,
    userId,
    registeredAt: now,
    active: false
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('라이센스생성')
    .setDescription('라이센스를 생성합니다.')
    .addIntegerOption(option =>
      option.setName('일수').setDescription('라이센스 기간 (일)').setRequired(true))
    .addIntegerOption(option =>
      option.setName('갯수').setDescription('생성할 라이센스 갯수').setRequired(true)),

  async execute(interaction) {
    const days = interaction.options.getInteger('일수');
    const count = interaction.options.getInteger('갯수');

    if (days <= 0 || count <= 0) {
      return interaction.reply({ content: '일수와 갯수는 1 이상의 숫자여야 합니다.', ephemeral: true });
    }

    try {
      const db = await connectDB();
      const collection = db.collection('licenses');

      const licenses = [];

      for (let i = 0; i < count; i++) {
        let license;
        let isDuplicate;
        do {
          license = generateLicense();
          isDuplicate = await checkDuplicate(collection, license);
        } while (isDuplicate);
        await insertLicense(collection, license, days);
        licenses.push(license);
      }

      const embed = new EmbedBuilder()
        .setTitle('라이센스 생성 완료')
        .setColor('#43b581')
        .setDescription(`기간: ${days}일\n생성된 라이센스 개수: ${count}\n\n생성된 라이센스는 데이터베이스에 안전하게 저장되었습니다.`)
        .addFields(
          { name: '생성된 라이센스 코드', value: licenses.join('\n') }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error('라이센스 생성 오류:', err);
      return interaction.reply({ content: '라이센스 생성 중 오류가 발생했습니다.', ephemeral: true });
    }
  }
};
