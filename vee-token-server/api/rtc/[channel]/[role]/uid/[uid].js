const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

const ALLOWED_ROLES = new Set(["publisher", "subscriber"]);
const CHANNEL_RE = /^[a-zA-Z0-9!#$%&()*+,\-.:;<=>?@[\]^_{|}~\s]{1,64}$/;

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
    console.error("Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE env vars");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const { channel, role, uid } = req.query;

  if (!channel || typeof channel !== "string") {
    return res.status(400).json({ error: "Missing or invalid parameter: channel" });
  }
  if (!CHANNEL_RE.test(channel)) {
    return res.status(400).json({ error: "Invalid channel name" });
  }
  if (!role || !ALLOWED_ROLES.has(role)) {
    return res.status(400).json({ error: "Invalid role. Must be 'publisher' or 'subscriber'" });
  }
  if (!uid) {
    return res.status(400).json({ error: "Missing parameter: uid" });
  }

  const numericUid = parseInt(uid, 10);
  if (isNaN(numericUid) || numericUid < 0) {
    return res.status(400).json({ error: "Invalid uid. Must be a non-negative integer" });
  }

  const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const now = Math.floor(Date.now() / 1000);
  const expireTime = now + 3600;

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
      expiresAt: expireTime,
    });
  } catch (error) {
    console.error("Agora token generation error:", error.message);
    return res.status(500).json({ error: "Failed to generate Agora token" });
  }
};
