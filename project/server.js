require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const {
  CLIENT_ID,
  CLIENT_SECRET,
  BOT_TOKEN,
  REDIRECT_URI
} = process.env;

app.use(cors({
  origin: "https://server.qva.monster",
  optionsSuccessStatus: 200
}));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const fixedState = "336481137472";

const db = new sqlite3.Database('./settings.db', (err) => {
  if (err) {
    console.error("DB 연결 실패:", err.message);
    process.exit(1);
  }
  console.log("SQLite DB connected.");
});

db.run(`CREATE TABLE IF NOT EXISTS settings (
  customName TEXT PRIMARY KEY,
  guildId TEXT NOT NULL
)`);

function getGuildIdByCustomName(customName) {
  return new Promise((resolve, reject) => {
    db.get("SELECT guildId FROM settings WHERE customName = ?", [customName], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      resolve(row.guildId);
    });
  });
}

app.get("/auth", (req, res) => {
  const state = fixedState;
  const scope = encodeURIComponent("identify guilds.join email");
  
  const webName = req.query.webName || 'main';

  const redirectUri = encodeURIComponent(`${REDIRECT_URI}/${webName}`);

  const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;

  res.redirect(oauthUrl);
});


app.get("/join/:customName", async (req, res) => {
  const customName = req.params.customName;
  const { code, state } = req.query;

  if (state !== fixedState) return res.status(400).send("Invalid state");
  if (!code) return res.status(400).send("Missing code");

  try {
    const guildId = await getGuildIdByCustomName(customName);
    if (!guildId) {
      return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
    }

    const tokenRes = await axios.post("https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${REDIRECT_URI}/${customName}`
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const { access_token } = tokenRes.data;

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userId = userRes.data.id;

    try {
      await axios.get(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
      });
      return res.redirect("/?joined=already");
    } catch (err) {
      if (!err.response || err.response.status !== 404) throw err;
    }

    await axios.put(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      access_token
    }, {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    res.redirect("/?joined=true");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.redirect("/?joined=fail");
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
