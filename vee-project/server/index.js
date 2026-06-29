const express = require("express");
const cors = require("cors");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

const app = express();
app.use(cors());
app.use(express.json());

const APP_ID = process.env.AGORA_APP_ID || "1fa2a7a0c8424c0ab2c69db4d4ddb673";
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "bb33638a31244873b822d6fcd0b6cb7a";

const TOKEN_EXPIRY_SECONDS = 3600;

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Vee Agora Token Server" });
});

app.get("/rtc/:channel/:role/:tokentype/:uid", (req, res) => {
  const { channel, role, tokentype, uid } = req.params;

  if (!channel || !role || !tokentype || !uid) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expireTime = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
  const privilegeExpireTime = expireTime;

  let token;
  try {
    if (tokentype === "userAccount") {
      token = RtcTokenBuilder.buildTokenWithAccount(
        APP_ID,
        APP_CERTIFICATE,
        channel,
        uid,
        rtcRole,
        expireTime,
        privilegeExpireTime
      );
    } else {
      const numericUid = parseInt(uid, 10) || 0;
      token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channel,
        numericUid,
        rtcRole,
        expireTime,
        privilegeExpireTime
      );
    }
    return res.json({ rtcToken: token, uid, channel, role });
  } catch (err) {
    console.error("Token generation error:", err);
    return res.status(500).json({ error: "Failed to generate token" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Agora token server running on port ${PORT}`);
  console.log(`Token endpoint: GET /rtc/:channel/:role/:tokentype/:uid`);
});
