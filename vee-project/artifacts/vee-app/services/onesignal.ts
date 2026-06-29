import { Platform } from "react-native";
import { ONESIGNAL } from "../constants/config";

let oneSignalInitialized = false;

const ONE_SIGNAL_REST_API_KEY = "f437qxns6eyq4xbpos4vjkqa2";

export const oneSignalService = {
  async init(): Promise<void> {
    if (oneSignalInitialized || Platform.OS === "web") return;
    try {
      const { OneSignal } = await import("react-native-onesignal" as string);
      OneSignal.initialize(ONESIGNAL.appId);
      OneSignal.Notifications.requestPermission(true);
      oneSignalInitialized = true;
    } catch {
      console.warn("OneSignal SDK not available. Build with EAS to enable push notifications.");
    }
  },

  async setExternalId(userId: string): Promise<void> {
    if (!oneSignalInitialized) return;
    try {
      const { OneSignal } = await import("react-native-onesignal" as string);
      OneSignal.login(userId);
    } catch {}
  },

  async logout(): Promise<void> {
    if (!oneSignalInitialized) return;
    try {
      const { OneSignal } = await import("react-native-onesignal" as string);
      OneSignal.logout();
    } catch {}
  },

  /**
   * Send a push notification to a specific user by their Firebase UID (external ID).
   * Uses the OneSignal REST API — works from any platform, no SDK init required.
   */
  async sendNotification(
    toExternalId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    try {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          Authorization: `Basic ${ONE_SIGNAL_REST_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_id: ONESIGNAL.appId,
          include_external_user_ids: [toExternalId],
          channel_for_external_user_ids: "push",
          headings: { en: title },
          contents: { en: body },
          data: data ?? {},
          priority: 10,
          ttl: 86400,
        }),
      });
    } catch (e) {
      console.warn("[OneSignal] Failed to send notification:", e);
    }
  },

  async sendRoomInvite(targetUserId: string, roomId: string, roomName: string): Promise<void> {
    await this.sendNotification(
      targetUserId,
      "Room Invite 🎙️",
      `You're invited to join: ${roomName}`,
      { roomId, type: "room_invite" }
    );
  },
};
