import { ZEGOCLOUD } from "../constants/config";

type ZegoEngine = {
  loginRoom: (roomID: string, user: { userID: string; userName: string }, config?: object) => Promise<void>;
  logoutRoom: (roomID?: string) => Promise<void>;
  startPublishingStream: (streamID: string) => void;
  stopPublishingStream: (streamID?: string) => void;
  startPlayingStream: (streamID: string, canvas?: null) => void;
  stopPlayingStream: (streamID: string) => void;
  enableMicrophone: (enable: boolean) => void;
  muteAllPlayStreamAudio: (mute: boolean) => void;
  setSpeakerVolume: (volume: number) => void;
  destroyEngine: () => Promise<void>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb: (...args: unknown[]) => void) => void;
};

let _engine: ZegoEngine | null = null;
let _engineAvailable = false;

async function getEngine(): Promise<ZegoEngine | null> {
  if (_engine) return _engine;
  try {
    const { ZegoExpressEngine } = await import(
      "@zegocloud/zego-express-engine-reactnative" as string
    );
    _engine = ZegoExpressEngine.createEngineWithProfile({
      appID: ZEGOCLOUD.appID,
      appSign: ZEGOCLOUD.appSign,
      scenario: 0,
    }) as ZegoEngine;
    _engineAvailable = true;
    return _engine;
  } catch {
    console.warn("ZEGOCLOUD SDK not available – voice disabled. Build with EAS to enable.");
    _engineAvailable = false;
    return null;
  }
}

export const isVoiceAvailable = () => _engineAvailable;

export const zegoService = {
  async init(): Promise<boolean> {
    const eng = await getEngine();
    return eng !== null;
  },

  async joinRoom(
    roomId: string,
    userId: string,
    userName: string,
    onUserUpdate?: (updateType: string, userList: { userID: string }[]) => void,
    onRoomStateUpdate?: (state: string) => void
  ): Promise<boolean> {
    const eng = await getEngine();
    if (!eng) return false;
    eng.on("roomUserUpdate", (roomID: unknown, updateType: unknown, userList: unknown) => {
      onUserUpdate?.(updateType as string, userList as { userID: string }[]);
    });
    eng.on("roomStateUpdate", (roomID: unknown, state: unknown) => {
      onRoomStateUpdate?.(state as string);
    });
    // Auto-play every stream that enters the room (fixes "can't hear anyone" bug).
    // ZEGOCLOUD fires roomStreamUpdate with type ADD for all existing streams immediately
    // after loginRoom, and again whenever a new user starts publishing.
    eng.on("roomStreamUpdate", (_roomID: unknown, updateType: unknown, streamList: unknown) => {
      const streams = streamList as { streamID: string }[];
      if (updateType === "ADD") {
        streams.forEach((s) => {
          _engine?.startPlayingStream(s.streamID, null);
        });
      } else if (updateType === "DELETE") {
        streams.forEach((s) => {
          _engine?.stopPlayingStream(s.streamID);
        });
      }
    });
    await eng.loginRoom(roomId, { userID: userId, userName }, { userUpdate: true });
    return true;
  },

  async leaveRoom(roomId?: string): Promise<void> {
    if (!_engine) return;
    try {
      _engine.stopPublishingStream();
      await _engine.logoutRoom(roomId);
    } catch (e) {
      console.warn("Error leaving room:", e);
    }
  },

  async startSpeaking(streamId: string): Promise<void> {
    const eng = await getEngine();
    if (!eng) return;
    eng.startPublishingStream(streamId);
    eng.enableMicrophone(true);
  },

  stopSpeaking(streamId?: string): void {
    if (!_engine) return;
    _engine.stopPublishingStream(streamId);
  },

  startListening(streamId: string): void {
    if (!_engine) return;
    _engine.startPlayingStream(streamId, null);
  },

  stopListening(streamId: string): void {
    if (!_engine) return;
    _engine.stopPlayingStream(streamId);
  },

  toggleMic(enabled: boolean): void {
    if (!_engine) return;
    _engine.enableMicrophone(enabled);
  },

  muteAll(muted: boolean): void {
    if (!_engine) return;
    _engine.muteAllPlayStreamAudio(muted);
  },

  async destroy(): Promise<void> {
    if (!_engine) return;
    try {
      await _engine.destroyEngine();
    } catch {}
    _engine = null;
    _engineAvailable = false;
  },

  getStreamId(roomId: string, userId: string): string {
    return `${roomId}_${userId}`;
  },
};
