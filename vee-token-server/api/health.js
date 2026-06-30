const VERSION = require("../package.json").version;

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const missing = [];
  if (!process.env.AGORA_APP_ID) missing.push("AGORA_APP_ID");
  if (!process.env.AGORA_APP_CERTIFICATE) missing.push("AGORA_APP_CERTIFICATE");

  if (missing.length > 0) {
    return res.status(500).json({
      status: "unhealthy",
      service: "vee-token-server",
      version: VERSION,
      timestamp: new Date().toISOString(),
      error: `Missing required environment variable(s): ${missing.join(", ")}`,
    });
  }

  return res.status(200).json({
    status: "healthy",
    service: "vee-token-server",
    version: VERSION,
    timestamp: new Date().toISOString(),
  });
};
