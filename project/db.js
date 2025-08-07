const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI 환경변수가 필요합니다.');

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('qvarestoremain');
  }
  return db;
}

async function getSettings(guildId) {
  const database = await connectDB();
  return database.collection('settings').findOne({ guildId });
}

async function setSettings(guildId, data) {
  const database = await connectDB();
  return database.collection('settings').updateOne(
    { guildId },
    { $set: data },
    { upsert: true }
  );
}


module.exports = {
  connectDB,
  getSettings,
  setSettings,
};
