require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const {
  CLIENT_ID,
  CLIENT_SECRET,
  BOT_TOKEN,
  GUILD_ID,
  REDIRECT_URI
} = process.env;

app.use(cors({
  origin: "https://server.qva.monster",
  optionsSuccessStatus: 200
}));

app.use(express.static(path.join(__dirname, "public")));

const fixedState = "336481137472";

app.get("/auth", (req, res) => {
  const state = fixedState;
  const scope = encodeURIComponent("identify guilds.join");
  const redirectUri = encodeURIComponent(REDIRECT_URI);
  const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
  res.redirect(oauthUrl);
});

app.get("/join/main", async (req, res) => {
  const { code, state } = req.query;

  if (state !== fixedState) return res.status(400).send("Invalid state");

  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenRes = await axios.post("https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const { access_token } = tokenRes.data;

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userId = userRes.data.id;

    try {
      await axios.get(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
      });
      return res.redirect("/?joined=already");
    } catch (err) {
      if (!err.response || err.response.status !== 404) throw err;
    }

    await axios.put(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
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
