import { Platform, PermissionsAndroid } from "react-native";
import { AGORA } from "../constants/config";

type AgoraEngine = {
  initialize: (config: object) => void;
  setAudioProfile: (profile: number, scenario: number) => void;
  setClientRole: (role: number) => void;
  joinChannel: (token: string, channelId: string, uid: number, options: object) => void;
  leaveChannel: () => void;
  enableLocalAudio: (enabled: boolean) => void;
  muteLocalAudioStream: (muted: boolean) => void;
  muteAllRemoteAudioStreams: (muted: boolean) => void;
  addListener: (event: string, cb: (...args: unknown[]) => void) => void;
  removeAllListeners: (event?: string) => void;
  release: () => void;
};

let _engine: AgoraEngine | null = null;
let _engineAvailable = false;
let _currentChannel: string | null = null;
let _currentUid = 0;
let _onTokenWillExpire: (() => void) | null = null;
let _onConnectionChanged: ((state: number, reason: number) => void) | null = null;

const ChannelProfileLiveBroadcasting = 1;
const ClientRoleBroadcaster = 1;
const ClientRoleAudience = 2;
const AudioProfileMusicStandard = 1;
const AudioScenarioChatRoom = 5;

function hashUid(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2147483647;
}

/**
 * Request microphone permission at runtime.
 * On Android we call PermissionsAndroid; on iOS the permission is granted by
 * the Agora SDK when enableLocalAudio is first called (backed by the
 * NSMicrophoneUsageDescription key in app.json).
 */
export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "Vee needs microphone access so you can speak in voice rooms.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function fetchToken(channel: string, uid: number, role: "publisher" | "subscriber"): Promise<string> {
  const serverUrl = AGORA.tokenServerUrl;
  try {
    const res = await fetch(`${serverUrl}/rtc/${encodeURIComponent(channel)}/${role}/uid/${uid}`);
    if (!res.ok) throw new Error(`Token server returned ${res.status}`);
    const data = await res.json() as { rtcToken: string };
    return data.rtcToken;
  } catch (err) {
    console.warn("[Agora] Token fetch failed, using empty token:", err);
    return "";
  }
}

async function getEngine(): Promise<AgoraEngine | null> {
  if (_engine) return _engine;
  try {
    const { createAgoraRtcEngine } = await import("react-native-agora" as string);
    _engine = createAgoraRtcEngine() as AgoraEngine;
    _engine.initialize({
      appId: AGORA.appId,
      channelProfile: ChannelProfileLiveBroadcasting,
    });
    _engine.setAudioProfile(AudioProfileMusicStandard, AudioScenarioChatRoom);
    _engineAvailable = true;

    _engine.addListener("onConnectionStateChanged", (state: unknown, reason: unknown) => {
      _onConnectionChanged?.(state as number, reason as number);
    });

    _engine.addListener("onTokenPrivilegeWillExpire", () => {
      _onTokenWillExpire?.();
    });

    return _engine;
  } catch {
    console.warn("[Agora] SDK not available — voice disabled. Build with EAS to enable.");
    _engineAvailable = false;
    return null;
  }
}

export const isVoiceAvailable = () => _engineAvailable;

export const agoraService = {
  async init(): Promise<boolean> {
    const eng = await getEngine();
    return eng !== null;
  },

  async joinRoom(
    roomId: string,
    userId: string,
    _userName: string,
    _onUserUpdate?: (updateType: string, userList: { userID: string }[]) => void,
    onRoomStateUpdate?: (state: string) => void
  ): Promise<boolean> {
    const eng = await getEngine();
    if (!eng) return false;

    const uid = hashUid(userId);
    _currentChannel = roomId;
    _currentUid = uid;

    _onConnectionChanged = (state: number) => {
      const stateMap: Record<number, string> = { 1: "CONNECTING", 3: "CONNECTED", 4: "RECONNECTING", 5: "FAILED" };
      onRoomStateUpdate?.(stateMap[state] ?? "UNKNOWN");
    };

    _onTokenWillExpire = async () => {
      if (!_currentChannel) return;
      const newToken = await fetchToken(_currentChannel, _currentUid, "publisher");
      if (newToken && _engine) {
        (_engine as unknown as { renewToken: (t: string) => void }).renewToken(newToken);
      }
    };

    eng.setClientRole(ClientRoleAudience);
    eng.enableLocalAudio(false);

    const token = await fetchToken(roomId, uid, "subscriber");
    eng.joinChannel(token, roomId, uid, { clientRoleType: ClientRoleAudience });

    // Enable hearing remote speakers immediately after joining
    eng.muteAllRemoteAudioStreams(false);

    return true;
  },

  async leaveRoom(_roomId?: string): Promise<void> {
    if (!_engine) return;
    try {
      _engine.leaveChannel();
      _engine.enableLocalAudio(false);
    } catch (e) {
      console.warn("[Agora] Error leaving room:", e);
    }
    _currentChannel = null;
  },

  async startSpeaking(_streamId: string): Promise<void> {
    const eng = await getEngine();
    if (!eng || !_currentChannel) return;

    // Request mic permission before enabling local audio
    const hasPerm = await requestMicPermission();
    if (!hasPerm) {
      console.warn("[Agora] Microphone permission denied");
      return;
    }

    const token = await fetchToken(_currentChannel, _currentUid, "publisher");
    eng.setClientRole(ClientRoleBroadcaster);
    eng.enableLocalAudio(true);
    eng.muteLocalAudioStream(false);

    if (token) {
      (_engine as unknown as { renewToken: (t: string) => void })?.renewToken?.(token);
    }
  },

  stopSpeaking(_streamId?: string): void {
    if (!_engine) return;
    _engine.setClientRole(ClientRoleAudience);
    _engine.muteLocalAudioStream(true);
    _engine.enableLocalAudio(false);
  },

  startListening(_streamId: string): void {
    if (!_engine) return;
    _engine.muteAllRemoteAudioStreams(false);
  },

  stopListening(_streamId: string): void {
    if (!_engine) return;
    _engine.muteAllRemoteAudioStreams(true);
  },

  toggleMic(enabled: boolean): void {
    if (!_engine) return;
    _engine.muteLocalAudioStream(!enabled);
  },

  muteAll(muted: boolean): void {
    if (!_engine) return;
    _engine.muteAllRemoteAudioStreams(muted);
  },

  async destroy(): Promise<void> {
    if (!_engine) return;
    try {
      _engine.removeAllListeners();
      _engine.release();
    } catch {}
    _engine = null;
    _engineAvailable = false;
    _currentChannel = null;
    _onTokenWillExpire = null;
    _onConnectionChanged = null;
  },

  getStreamId(roomId: string, userId: string): string {
    return `${roomId}_${userId}`;
  },
};
