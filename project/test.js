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

console.log("Loaded ENV vars:");
console.log("CLIENT_ID:", CLIENT_ID ? "OK" : "Missing");
console.log("CLIENT_SECRET:", CLIENT_SECRET ? "OK" : "Missing");
console.log("BOT_TOKEN:", BOT_TOKEN ? "OK" : "Missing");
console.log("GUILD_ID:", GUILD_ID ? "OK" : "Missing");
console.log("REDIRECT_URI:", REDIRECT_URI ? REDIRECT_URI : "Missing");

app.use(cors({
  origin: "https://server.qva.monster",
  optionsSuccessStatus: 200
}));

app.use(express.static(path.join(__dirname, "public")));

const STATE = "dcpNC1f46ujEYKDf4DRT5SbEwSboQf";

app.get("/auth", (req, res) => {
  const state = STATE;
  const scope = encodeURIComponent("identify guilds.join");
  const redirectUri = encodeURIComponent(REDIRECT_URI);
  const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
  console.log("Redirecting to Discord OAuth2:", oauthUrl);
  res.redirect(oauthUrl);
});

app.get("/join/main", async (req, res) => {
  const { code, state } = req.query;
  console.log("Received /join/main with code:", code);
  console.log("Received state:", state);

  if (!state || state !== FIXED_STATE) {
    console.log("Invalid or missing state");
    return res.status(400).send("Invalid or missing state");
  }

  if (!code) {
    console.log("Missing authorization code");
    return res.status(400).send("Missing authorization code");
  }

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

    console.log("Token response data:", tokenRes.data);
    const { access_token } = tokenRes.data;

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userId = userRes.data.id;
    console.log("User ID:", userId);

    try {
      await axios.get(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
      });
      console.log("User already in guild");
      return res.redirect("/?joined=already");
    } catch (err) {
      if (!err.response || err.response.status !== 404) {
        console.error("Error checking guild member:", err.response?.data || err.message);
        throw err;
      }
      console.log("User not in guild, proceeding to add");
    }

    await axios.put(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
      access_token
    }, {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    console.log("User added to guild successfully");
    res.redirect("/?joined=true");

  } catch (err) {
    if (err.response) {
      console.error("Discord API Error:", err.response.status, err.response.data);
    } else {
      console.error("Error:", err.message);
    }
    res.redirect("/?joined=fail");
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
