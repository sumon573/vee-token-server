const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

const APP_ID = process.env.AGORA_APP_ID || "1fa2a7a0c8424c0ab2c69db4d4ddb673";
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "bb33638a31244873b822d6fcd0b6cb7a";
const TOKEN_EXPIRY_SECONDS = 3600;

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { channel, role, uid } = req.query;

  if (!channel || !role || !uid) {
    res.status(400).json({ error: "Missing required parameters: channel, role, uid" });
    return;
  }

  if (!APP_ID || !APP_CERTIFICATE) {
    res.status(500).json({ error: "Server misconfiguration: missing Agora credentials" });
    return;
  }

  const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expireTime = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
  const numericUid = parseInt(uid, 10) || 0;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channel,
      numericUid,
      rtcRole,
      expireTime,
      expireTime
    );

    res.status(200).json({
      rtcToken: token,
      uid: uid,
      channel: channel,
      role: role,
      expireAt: expireTime
    });
  } catch (err) {
    console.error("Token generation failed:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
};
