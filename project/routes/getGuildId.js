const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let cachedDb = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  await client.connect();
  cachedDb = client.db('qvarestoremain');
  return cachedDb;
}

router.get('/getGuildIdFromWebName/:webName', async (req, res) => {
  const { webName } = req.params;

  if (!webName) {
    return res.status(400).json({ error: "webName is required" });
  }

  try {
    const db = await connectDB();
    const data = await db.collection('settings').findOne({ webName });
    if (!data || !data.guildId) {
      return res.status(404).json({ error: "Guild ID not found for this webName" });
    }
    res.json({ guildId: data.guildId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
