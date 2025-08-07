const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');

const token = 'MTQwMjU4MjI0NzE2MDQxNDIwOA.Gj4rZk.zTnPp8Ppcdw1EuO3LcmhRQurIGYWOItBbd9MVk';
const clientId = '1402582247160414208';

if (!token || !clientId) {
  console.error('❌ BOT_TOKEN 또는 CLIENT_ID가 정의되어 있지 않습니다.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if (!command.data || !command.data.name || typeof command.execute !== 'function') {
    console.warn(`⚠️ ${file}는 올바른 명령어 구조가 아닙니다. 스킵됩니다.`);
    continue;
  }

  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('📤 슬래시 명령어 등록 중...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ 슬래시 명령어 등록 완료!');
  } catch (error) {
    console.error('❌ 명령어 등록 실패:', error);
  }
})();

client.once('ready', () => {
  console.log(`✅ 봇 로그인됨: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error('❌ 명령어 실행 오류:', error);
    const errorMessage = { content: '명령어 실행 중 오류가 발생했습니다.', ephemeral: true };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

client.login(token);
