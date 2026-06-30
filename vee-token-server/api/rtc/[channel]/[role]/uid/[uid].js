const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const APP_ID = process.env.AGORA_APP_ID;
  const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

  if (!APP_ID || !APP_CERTIFICATE) {
    return res.status(500).json({ error: "Server configuration error: missing Agora credentials" });
  }

  const { channel, role, uid } = req.query;

  if (!channel || !role || !uid) {
    return res.status(400).json({ error: "Missing required parameters: channel, role, uid" });
  }

  const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expireTime = Math.floor(Date.now() / 1000) + 3600;
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

    return res.status(200).json({
      rtcToken: token,
      uid: numericUid,
      channel,
      role,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return res.status(500).json({ error: "Failed to generate Agora token" });
  }
};
