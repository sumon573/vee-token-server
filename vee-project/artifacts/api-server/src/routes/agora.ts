import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const APP_ID = process.env["AGORA_APP_ID"] ?? "1fa2a7a0c8424c0ab2c69db4d4ddb673";
const APP_CERTIFICATE = process.env["AGORA_APP_CERTIFICATE"] ?? "bb33638a31244873b822d6fcd0b6cb7a";
const TOKEN_EXPIRY_SECONDS = 3600;

type AgoraTokenModule = {
  RtcTokenBuilder: {
    buildTokenWithUid: (appId: string, cert: string, channel: string, uid: number, role: number, expireTime: number, privilegeExpireTime: number) => string;
    buildTokenWithAccount: (appId: string, cert: string, channel: string, account: string, role: number, expireTime: number, privilegeExpireTime: number) => string;
  };
  RtcRole: { PUBLISHER: number; SUBSCRIBER: number };
};

let _agora: AgoraTokenModule | null = null;

async function getAgora(): Promise<AgoraTokenModule> {
  if (_agora) return _agora;
  const mod = await import("agora-access-token") as unknown as AgoraTokenModule;
  _agora = mod;
  return mod;
}

router.get(
  "/rtc/:channel/:role/:tokentype/:uid",
  async (req: Request, res: Response) => {
    const { channel, role, tokentype, uid } = req.params as Record<string, string>;

    if (!channel || !role || !tokentype || !uid) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    try {
      const { RtcTokenBuilder, RtcRole } = await getAgora();
      const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
      const expireTime = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;

      let token: string;
      if (tokentype === "userAccount") {
        token = RtcTokenBuilder.buildTokenWithAccount(
          APP_ID, APP_CERTIFICATE, channel, uid, rtcRole, expireTime, expireTime
        );
      } else {
        token = RtcTokenBuilder.buildTokenWithUid(
          APP_ID, APP_CERTIFICATE, channel, parseInt(uid, 10) || 0, rtcRole, expireTime, expireTime
        );
      }

      req.log.info({ channel, role, tokentype }, "Agora RTC token generated");
      res.json({ rtcToken: token, uid, channel, role });
    } catch (err) {
      logger.error({ err }, "Agora token generation failed");
      res.status(500).json({ error: "Failed to generate token" });
    }
  }
);

export default router;
