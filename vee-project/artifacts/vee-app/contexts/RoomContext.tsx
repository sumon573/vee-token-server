import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { firebaseService } from "../services/firebase";
import { agoraService } from "../services/agora";
import { ChatMessage, EmojiReaction, HandRaiseRequest, RoomPoll, Seat, VoiceRoom } from "../types";
import { useAuth } from "./AuthContext";

interface LiveMember {
  uid: string;
  displayName: string;
  avatar: string;
  joinedAt: number;
}

interface RoomContextValue {
  currentRoom: VoiceRoom | null;
  messages: ChatMessage[];
  handRaiseRequests: HandRaiseRequest[];
  activePolls: RoomPoll[];
  reactions: EmojiReaction[];
  liveMembers: LiveMember[];
  isMicEnabled: boolean;
  isInSeat: boolean;
  mySeatIndex: number;
  isMinimized: boolean;
  isHandRaised: boolean;
  myRoomRole: "owner" | "admin" | "member" | null;
  pkTimeLeft: number;

  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  takeSeat: (seatIndex: number) => Promise<"ok" | "occupied" | "locked" | "reserved">;
  leaveSeat: () => Promise<void>;
  toggleMic: () => void;
  lockSeat: (seatIndex: number, locked: boolean) => Promise<void>;
  kickFromSeat: (seatIndex: number) => Promise<void>;
  muteSeat: (seatIndex: number) => Promise<void>;
  unmuteSeat: (seatIndex: number) => Promise<void>;
  forceMicDown: (seatIndex: number) => Promise<void>;
  lockRoom: (locked: boolean) => Promise<void>;
  promoteToRoomAdmin: (uid: string) => Promise<void>;
  demoteFromRoomAdmin: (uid: string) => Promise<void>;
  updateRoomTopic: (topic: string) => Promise<void>;
  updateRoomCover: (coverImage: string) => Promise<void>;
  startPKBattle: (targetRoomId: string, targetHostId: string, targetHostName: string, durationSeconds?: number) => Promise<void>;
  endPKBattle: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  setMinimized: (v: boolean) => void;
  closeRoom: () => Promise<void>;
  sendEmojiReaction: (emoji: string) => Promise<void>;
  createPoll: (question: string, options: string[]) => Promise<void>;
  votePoll: (pollId: string, optionIndex: number) => Promise<void>;
  closePoll: (pollId: string) => Promise<void>;
  raiseHand: () => Promise<void>;
  lowerHand: () => Promise<void>;
  acceptHandRaise: (req: HandRaiseRequest) => Promise<void>;
  rejectHandRaise: (req: HandRaiseRequest) => Promise<void>;
  setRoomTheme: (theme: string) => Promise<void>;
  setWelcomeMessage: (msg: string, enabled: boolean) => Promise<void>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [handRaiseRequests, setHandRaiseRequests] = useState<HandRaiseRequest[]>([]);
  const [activePolls, setActivePolls] = useState<RoomPoll[]>([]);
  const [reactions, setReactions] = useState<EmojiReaction[]>([]);
  const [isMinimized, setMinimized] = useState(false);
  const [pkTimeLeft, setPkTimeLeft] = useState(0);
  const [liveMembers, setLiveMembers] = useState<LiveMember[]>([]);

  const roomUnsubRef = useRef<(() => void) | null>(null);
  const msgUnsubRef = useRef<(() => void) | null>(null);
  const handUnsubRef = useRef<(() => void) | null>(null);
  const pollUnsubRef = useRef<(() => void) | null>(null);
  const reactUnsubRef = useRef<(() => void) | null>(null);
  const presenceUnsubRef = useRef<(() => void) | null>(null);
  const pkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const currentRoomRef = useRef<VoiceRoom | null>(null);

  currentRoomRef.current = currentRoom;

  const mySeatIndex = currentRoom?.seats.findIndex((s) => s.userId === user?.uid) ?? -1;
  const isInSeat = mySeatIndex >= 0;
  const isHandRaised = handRaiseRequests.some((r) => r.userId === user?.uid);

  const myRoomRole: "owner" | "admin" | "member" | null = currentRoom
    ? currentRoom.hostId === user?.uid
      ? "owner"
      : currentRoom.adminIds.includes(user?.uid ?? "")
      ? "admin"
      : "member"
    : null;

  // Enforce admin-mute: when Firebase shows our seat as isAdminMuted, force mic off
  useEffect(() => {
    if (!currentRoom || !user) return;
    const mySeat = currentRoom.seats.find((s) => s.userId === user.uid);
    if (mySeat?.isAdminMuted && isMicEnabled) {
      agoraService.toggleMic(false);
      setIsMicEnabled(false);
    }
  }, [currentRoom?.seats, user?.uid]);

  useEffect(() => {
    if (pkTimerRef.current) { clearInterval(pkTimerRef.current); pkTimerRef.current = null; }
    if (!currentRoom?.pkBattle?.isActive) { setPkTimeLeft(0); return; }
    const update = () => {
      const left = Math.max(0, Math.floor((currentRoom.pkBattle!.endsAt - Date.now()) / 1000));
      setPkTimeLeft(left);
      if (left === 0 && currentRoom.pkBattle?.isActive) {
        firebaseService.endPKBattle(currentRoom.id).catch(() => {});
      }
    };
    update();
    pkTimerRef.current = setInterval(update, 1000);
    return () => { if (pkTimerRef.current) clearInterval(pkTimerRef.current); };
  }, [currentRoom?.pkBattle?.isActive, currentRoom?.pkBattle?.endsAt]);

  const cleanup = useCallback(() => {
    roomUnsubRef.current?.();
    msgUnsubRef.current?.();
    handUnsubRef.current?.();
    pollUnsubRef.current?.();
    reactUnsubRef.current?.();
    presenceUnsubRef.current?.();
    roomUnsubRef.current = null;
    msgUnsubRef.current = null;
    handUnsubRef.current = null;
    pollUnsubRef.current = null;
    reactUnsubRef.current = null;
    presenceUnsubRef.current = null;
  }, []);

  const leaveRoom = useCallback(async () => {
    if (!user || !currentRoomIdRef.current) return;
    const roomId = currentRoomIdRef.current;
    const room = currentRoomRef.current;

    if (room?.seats.some((s) => s.userId === user.uid)) {
      const updatedSeats = room.seats.map((s) =>
        s.userId === user.uid
          ? { ...s, userId: null, userName: null, userAvatar: null, isMuted: false, isAdminMuted: false, isSpeaking: false, roomRole: "member" as const }
          : s
      );
      await firebaseService.updateRoom(roomId, { seats: updatedSeats }).catch(() => {});
    }

    await firebaseService.lowerHand(roomId, user.uid).catch(() => {});

    await firebaseService.sendMessage(roomId, {
      userId: user.uid,
      userName: user.displayName,
      userAvatar: user.avatar,
      text: `${user.displayName} left`,
      type: "leave",
      timestamp: Date.now(),
    }).catch(() => {});

    // Remove presence (also removed automatically on disconnect via onDisconnect)
    await firebaseService.leaveRoomPresence(roomId, user.uid).catch(() => {});

    if (room) {
      await firebaseService.updateRoom(roomId, { listenerCount: Math.max(0, (room.listenerCount ?? 1) - 1) }).catch(() => {});
    }

    await agoraService.leaveRoom(roomId).catch(() => {});
    cleanup();
    currentRoomIdRef.current = null;
    setCurrentRoom(null);
    setMessages([]);
    setHandRaiseRequests([]);
    setActivePolls([]);
    setReactions([]);
    setLiveMembers([]);
    setIsMicEnabled(false);
    setMinimized(false);
  }, [user, cleanup]);

  const joinRoom = useCallback(async (roomId: string) => {
    if (!user) return;
    if (currentRoomIdRef.current && currentRoomIdRef.current !== roomId) await leaveRoom();
    if (currentRoomIdRef.current === roomId) return;

    currentRoomIdRef.current = roomId;
    await agoraService.init();
    await agoraService.joinRoom(roomId, user.uid, user.displayName);

    roomUnsubRef.current = firebaseService.subscribeToRoom(roomId, setCurrentRoom);
    msgUnsubRef.current = firebaseService.subscribeToRoomMessages(roomId, setMessages);
    handUnsubRef.current = firebaseService.subscribeToHandRaises(roomId, setHandRaiseRequests);
    pollUnsubRef.current = firebaseService.subscribeToRoomPolls(roomId, setActivePolls);
    reactUnsubRef.current = firebaseService.subscribeToRoomReactions(roomId, setReactions);

    // Subscribe to live presence so we can show who's currently in the room
    presenceUnsubRef.current = firebaseService.subscribeToRoomPresence(roomId, setLiveMembers);

    // Register our presence with onDisconnect so it's auto-removed on crash/kill
    await firebaseService.joinRoomPresence(roomId, user.uid, user.displayName, user.avatar).catch(() => {});

    await firebaseService.sendMessage(roomId, {
      userId: user.uid,
      userName: user.displayName,
      userAvatar: user.avatar,
      text: `${user.displayName} joined`,
      type: "join",
      timestamp: Date.now(),
    }).catch(() => {});

    await firebaseService.updateRoom(roomId, { listenerCount: (currentRoomRef.current?.listenerCount ?? 0) + 1 }).catch(() => {});
  }, [user, leaveRoom]);

  const leaveSeat = useCallback(async () => {
    if (!user || !currentRoom) return;
    const updatedSeats = currentRoom.seats.map((s) =>
      s.userId === user.uid
        ? { ...s, userId: null, userName: null, userAvatar: null, isMuted: false, isAdminMuted: false, isHandRaised: false, isSpeaking: false, roomRole: "member" as const }
        : s
    );
    await firebaseService.updateRoom(currentRoom.id, { seats: updatedSeats });
    const streamId = agoraService.getStreamId(currentRoom.id, user.uid);
    agoraService.stopSpeaking(streamId);
    setIsMicEnabled(false);
  }, [user, currentRoom]);

  const takeSeat = useCallback(async (seatIndex: number): Promise<"ok" | "occupied" | "locked" | "reserved"> => {
    if (!user || !currentRoom) return "occupied";
    const isHost = user.uid === currentRoom.hostId;
    const isRoomAdmin = currentRoom.adminIds.includes(user.uid);
    const role: "owner" | "admin" | "member" = isHost ? "owner" : isRoomAdmin ? "admin" : "member";
    if (seatIndex === 0 && role === "member") return "reserved";

    if (isInSeat) {
      const currentSeat = currentRoom.seats[mySeatIndex];
      const updatedSeats = currentRoom.seats.map((s) =>
        s.userId === user.uid
          ? { ...s, userId: null, userName: null, userAvatar: null, isMuted: false, isAdminMuted: false, isHandRaised: false, isSpeaking: false, roomRole: "member" as const }
          : s
      );
      await firebaseService.updateRoom(currentRoom.id, { seats: updatedSeats });
      const streamId = agoraService.getStreamId(currentRoom.id, user.uid);
      agoraService.stopSpeaking(streamId);
      setIsMicEnabled(false);
      if (currentSeat?.index === seatIndex) return "ok";
    }

    const result = await firebaseService.takeSeat(currentRoom.id, seatIndex, user, role);
    if (result !== "ok") return result;
    await firebaseService.lowerHand(currentRoom.id, user.uid).catch(() => {});
    const streamId = agoraService.getStreamId(currentRoom.id, user.uid);
    await agoraService.startSpeaking(streamId);
    setIsMicEnabled(true);
    return "ok";
  }, [user, currentRoom, isInSeat, mySeatIndex]);

  const toggleMic = useCallback(() => {
    if (!currentRoom || !user) return;
    const mySeat = currentRoom.seats.find((s) => s.userId === user.uid);
    if (mySeat?.isAdminMuted && !isMicEnabled) return;
    const newState = !isMicEnabled;
    agoraService.toggleMic(newState);
    setIsMicEnabled(newState);
    const updatedSeats = currentRoom.seats.map((s) =>
      s.userId === user.uid ? { ...s, isMuted: !newState, isSpeaking: newState } : s
    );
    firebaseService.updateRoom(currentRoom.id, { seats: updatedSeats });
  }, [isMicEnabled, currentRoom, user]);

  const lockSeat = useCallback(async (seatIndex: number, locked: boolean) => {
    if (!currentRoom) return;
    const updatedSeats = currentRoom.seats.map((s, i) => i === seatIndex ? { ...s, isLocked: locked } : s);
    await firebaseService.updateRoom(currentRoom.id, { seats: updatedSeats });
  }, [currentRoom]);

  const kickFromSeat = useCallback(async (seatIndex: number) => {
    if (!currentRoom) return;
    const updatedSeats = currentRoom.seats.map((s, i) =>
      i === seatIndex
        ? { ...s, userId: null, userName: null, userAvatar: null, isMuted: false, isAdminMuted: false, isHandRaised: false, isSpeaking: false, roomRole: "member" as const }
        : s
    );
    await firebaseService.updateRoom(currentRoom.id, { seats: updatedSeats });
    await firebaseService.sendMessage(currentRoom.id, { userId: "system", userName: "System", userAvatar: "", text: "A member was removed from the stage", type: "system", timestamp: Date.now() });
  }, [currentRoom]);

  const muteSeat = useCallback(async (seatIndex: number) => {
    if (!currentRoom) return;
    const updatedSeats = currentRoom.seats.map((s, i) =>
      i === seatIndex ? { ...s, isMuted: true, isAdminMuted: true, isSpeaking: false } : s
    );
    await firebaseService.updateRoom(currentRoom.id, { seats: updatedSeats });
  }, [currentRoom]);

  const unmuteSeat = useCallback(async (seatIndex: number) => {
    if (!currentRoom) return;
    const updatedSeats = currentRoom.seats.map((s, i) =>
      i === seatIndex ? { ...s, isMuted: false, isAdminMuted: false } : s
    );
    await firebaseService.updateRoom(currentRoom.id, { seats: updatedSeats });
  }, [currentRoom]);

  const forceMicDown = useCallback(async (seatIndex: number) => {
    if (!currentRoom) return;
    const updatedSeats = currentRoom.seats.map((s, i) =>
      i === seatIndex ? { ...s, isMuted: true, isAdminMuted: true, isSpeaking: false } : s
    );
    await firebaseService.updateRoom(currentRoom.id, { seats: updatedSeats });
  }, [currentRoom]);

  const lockRoom = useCallback(async (locked: boolean) => {
    if (!currentRoom) return;
    await firebaseService.updateRoom(currentRoom.id, { isLocked: locked });
  }, [currentRoom]);

  const promoteToRoomAdmin = useCallback(async (uid: string) => {
    if (!currentRoom) return;
    await firebaseService.promoteToRoomAdmin(currentRoom.id, uid);
  }, [currentRoom]);

  const demoteFromRoomAdmin = useCallback(async (uid: string) => {
    if (!currentRoom) return;
    await firebaseService.demoteFromRoomAdmin(currentRoom.id, uid);
  }, [currentRoom]);

  const updateRoomTopic = useCallback(async (topic: string) => {
    if (!currentRoom) return;
    await firebaseService.updateRoomTopic(currentRoom.id, topic);
    await firebaseService.sendMessage(currentRoom.id, { userId: "system", userName: "System", userAvatar: "", text: `📌 Topic: ${topic}`, type: "system", timestamp: Date.now() });
  }, [currentRoom]);

  const updateRoomCover = useCallback(async (coverImage: string) => {
    if (!currentRoom) return;
    await firebaseService.updateRoomCover(currentRoom.id, coverImage);
  }, [currentRoom]);

  const startPKBattle = useCallback(async (targetRoomId: string, targetHostId: string, targetHostName: string, durationSeconds = 180) => {
    if (!currentRoom || !user) return;
    await firebaseService.startPKBattle(currentRoom.id, user.uid, user.displayName, targetRoomId, targetHostId, targetHostName, durationSeconds);
  }, [currentRoom, user]);

  const endPKBattle = useCallback(async () => {
    if (!currentRoom) return;
    await firebaseService.endPKBattle(currentRoom.id);
  }, [currentRoom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!user || !currentRoomIdRef.current) return;
    await firebaseService.sendMessage(currentRoomIdRef.current, { userId: user.uid, userName: user.displayName, userAvatar: user.avatar, text, type: "chat", timestamp: Date.now() });
  }, [user]);

  const closeRoom = useCallback(async () => {
    if (!currentRoom) return;
    await firebaseService.closeRoom(currentRoom.id);
    await leaveRoom();
  }, [currentRoom, leaveRoom]);

  const sendEmojiReaction = useCallback(async (emoji: string) => {
    if (!user || !currentRoomIdRef.current) return;
    await firebaseService.sendEmojiReaction(currentRoomIdRef.current, user.uid, user.displayName, emoji);
  }, [user]);

  const createPoll = useCallback(async (question: string, options: string[]) => {
    if (!user || !currentRoomIdRef.current) return;
    await firebaseService.createRoomPoll(currentRoomIdRef.current, question, options, user.uid, user.displayName, 120);
  }, [user]);

  const votePoll = useCallback(async (pollId: string, optionIndex: number) => {
    if (!user || !currentRoomIdRef.current) return;
    await firebaseService.voteOnPoll(currentRoomIdRef.current, pollId, user.uid, optionIndex);
  }, [user]);

  const closePoll = useCallback(async (pollId: string) => {
    if (!currentRoomIdRef.current) return;
    await firebaseService.closeRoomPoll(currentRoomIdRef.current, pollId);
  }, []);

  const raiseHand = useCallback(async () => {
    if (!user || !currentRoomIdRef.current || isInSeat) return;
    await firebaseService.raiseHand(currentRoomIdRef.current, user.uid, user.displayName, user.avatar);
  }, [user, isInSeat]);

  const lowerHand = useCallback(async () => {
    if (!user || !currentRoomIdRef.current) return;
    await firebaseService.lowerHand(currentRoomIdRef.current, user.uid);
  }, [user]);

  const acceptHandRaise = useCallback(async (req: HandRaiseRequest) => {
    if (!currentRoomIdRef.current || !currentRoom) return;
    const emptyIdx = currentRoom.seats.findIndex((s) => !s.userId && !s.isLocked && s.index !== 0);
    if (emptyIdx < 0) return;
    const updatedSeats = currentRoom.seats.map((s, i) =>
      i === emptyIdx
        ? { ...s, userId: req.userId, userName: req.userName, userAvatar: req.userAvatar, isMuted: false, isAdminMuted: false, isHandRaised: false, isSpeaking: false, roomRole: "member" as const }
        : s
    );
    await firebaseService.updateRoom(currentRoomIdRef.current, { seats: updatedSeats });
    await firebaseService.lowerHand(currentRoomIdRef.current, req.userId);
    await firebaseService.sendMessage(currentRoomIdRef.current, { userId: "system", userName: "System", userAvatar: "", text: `${req.userName} joined the stage`, type: "system", timestamp: Date.now() });
  }, [currentRoom]);

  const rejectHandRaise = useCallback(async (req: HandRaiseRequest) => {
    if (!currentRoomIdRef.current) return;
    await firebaseService.lowerHand(currentRoomIdRef.current, req.userId);
  }, []);

  const setRoomTheme = useCallback(async (theme: string) => {
    if (!currentRoomIdRef.current) return;
    await firebaseService.setRoomTheme(currentRoomIdRef.current, theme);
  }, []);

  const setWelcomeMessage = useCallback(async (msg: string, enabled: boolean) => {
    if (!currentRoomIdRef.current) return;
    await firebaseService.setRoomWelcomeMessage(currentRoomIdRef.current, msg, enabled);
  }, []);

  return (
    <RoomContext.Provider value={{
      currentRoom, messages, handRaiseRequests, activePolls, reactions, liveMembers,
      isMicEnabled, isInSeat, mySeatIndex, isMinimized, isHandRaised, myRoomRole, pkTimeLeft,
      joinRoom, leaveRoom, takeSeat, leaveSeat, toggleMic,
      lockSeat, kickFromSeat, muteSeat, unmuteSeat, forceMicDown, lockRoom,
      promoteToRoomAdmin, demoteFromRoomAdmin,
      updateRoomTopic, updateRoomCover,
      startPKBattle, endPKBattle, sendMessage,
      setMinimized, closeRoom,
      sendEmojiReaction, createPoll, votePoll, closePoll,
      raiseHand, lowerHand, acceptHandRaise, rejectHandRaise,
      setRoomTheme, setWelcomeMessage,
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be inside RoomProvider");
  return ctx;
}
