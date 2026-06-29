import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  User,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
// getReactNativePersistence types may not be declared in all firebase/auth versions;
// require() bypasses the TS declaration while still resolving at runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require("firebase/auth") as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => import("firebase/auth").Persistence;
};
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  push,
  query,
  orderByChild,
  limitToLast,
  remove,
  increment,
  runTransaction,
  onDisconnect,
} from "firebase/database";
import { FIREBASE_CONFIG } from "../constants/config";
import { oneSignalService } from "./onesignal";
import {
  VeeUser,
  VoiceRoom,
  GiftTransaction,
  ChatMessage,
  Seat,
  FriendRequest,
  PrivateChat,
  PrivateMessage,
  PKBattle,
  HonorBadge,
  UserReport,
  Announcement,
} from "../types";

const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];

let _auth: ReturnType<typeof getAuth>;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  _auth = getAuth(app);
}
export const auth = _auth;
export const db = getDatabase(app);

const generateVeeId = (): string => {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `v${digits}`;
};

function parseUser(uid: string, val: Record<string, unknown>): VeeUser {
  const followers = val.followers ? Object.keys(val.followers as Record<string, unknown>) : [];
  const following = val.following ? Object.keys(val.following as Record<string, unknown>) : [];
  const honorBadges = val.honorBadges
    ? Object.values(val.honorBadges as Record<string, unknown>)
    : [];
  const animationFrames = val.animationFrames
    ? Object.values(val.animationFrames as Record<string, unknown>)
    : [];
  return {
    uid,
    veeId: (val.veeId as string) ?? "",
    displayName: (val.displayName as string) ?? "",
    avatar: (val.avatar as string) ?? "",
    bio: (val.bio as string) ?? "",
    diamonds: (val.diamonds as number) ?? 0,
    coins: (val.coins as number) ?? 0,
    level: (val.level as number) ?? 1,
    experience: (val.experience as number) ?? 0,
    followers,
    following,
    followersCount: followers.length,
    followingCount: following.length,
    role: (val.role as "user" | "admin") ?? "user",
    isAdmin: val.role === "admin" || val.isAdmin === true,
    isBanned: (val.isBanned as boolean) ?? false,
    banReason: val.banReason != null ? (val.banReason as string) : undefined,
    warnings: (val.warnings as number) ?? 0,
    honorBadges: honorBadges as HonorBadge[],
    animationFrames: animationFrames as import("../types").AnimationFrame[],
    activeFrame: val.activeFrame != null ? (val.activeFrame as string) : undefined,
    allowFriendRequests: (val.allowFriendRequests as boolean) ?? true,
    decorations: val.decorations ? Object.values(val.decorations as Record<string, unknown>) as string[] : [],
    totalGiftsSent: (val.totalGiftsSent as number) ?? 0,
    totalGiftsReceived: (val.totalGiftsReceived as number) ?? 0,
    createdAt: (val.createdAt as number) ?? Date.now(),
    lastSeen: (val.lastSeen as number) ?? Date.now(),
  };
}

function buildSeats(hostId?: string, hostName?: string, hostAvatar?: string): Seat[] {
  return Array.from({ length: 6 }, (_, i) => ({
    index: i,
    userId: i === 0 && hostId ? hostId : null,
    userName: i === 0 && hostName ? hostName : null,
    userAvatar: i === 0 && hostAvatar ? hostAvatar : null,
    isMuted: false,
    isHandRaised: false,
    isLocked: false,
    isSpeaking: false,
    roomRole: (i === 0 ? "owner" : "member") as "owner" | "admin" | "member",
  }));
}

function parseRoom(key: string, val: Record<string, unknown>): VoiceRoom {
  const seatsRaw = val.seats;
  let seats: Seat[];
  if (!seatsRaw) {
    seats = buildSeats();
  } else if (Array.isArray(seatsRaw)) {
    seats = seatsRaw as Seat[];
  } else {
    seats = (Object.values(seatsRaw as Record<string, unknown>) as Seat[]).sort(
      (a, b) => a.index - b.index
    );
  }

  let pkBattle: PKBattle | null = null;
  if (val.pkBattle && (val.pkBattle as Record<string, unknown>).isActive) {
    pkBattle = val.pkBattle as PKBattle;
  }

  const adminIds = val.adminIds
    ? Object.keys(val.adminIds as Record<string, unknown>)
    : [];

  return {
    id: key,
    name: (val.name as string) ?? "",
    topic: (val.topic as string) ?? "",
    description: (val.description as string) ?? "",
    hostId: (val.hostId as string) ?? "",
    hostName: (val.hostName as string) ?? "",
    hostAvatar: (val.hostAvatar as string) ?? "",
    coverImage: (val.coverImage as string) ?? "",
    adminIds,
    seats,
    isLocked: (val.isLocked as boolean) ?? false,
    isActive: (val.isActive as boolean) ?? true,
    listenerCount: (val.listenerCount as number) ?? 0,
    memberCount: (val.memberCount as number) ?? 0,
    totalGifts: (val.totalGifts as number) ?? 0,
    pkBattle,
    tags: val.tags ? (Object.values(val.tags as Record<string, unknown>) as string[]) : [],
    backgroundImage: val.backgroundImage != null ? (val.backgroundImage as string) : undefined,
    theme: val.theme != null ? (val.theme as string) : undefined,
    welcomeMessage: val.welcomeMessage != null ? (val.welcomeMessage as string) : undefined,
    welcomeMessageEnabled: (val.welcomeMessageEnabled as boolean) ?? false,
    createdAt: (val.createdAt as number) ?? 0,
  };
}

export const firebaseService = {
  // ─── AUTH ────────────────────────────────────────────────────────────────

  async registerUser(email: string, password: string, displayName: string): Promise<VeeUser> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const veeId = generateVeeId();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7B2FF7&color=fff&size=200`;
    await updateFirebaseProfile(cred.user, { displayName, photoURL: avatarUrl });
    const now = Date.now();
    const userData = {
      uid: cred.user.uid,
      veeId,
      displayName,
      avatar: avatarUrl,
      bio: "",
      diamonds: 100,
      coins: 0,
      level: 1,
      experience: 0,
      followers: {},
      following: {},
      role: "user",
      isAdmin: false,
      isBanned: false,
      warnings: 0,
      honorBadges: {},
      animationFrames: {},
      decorations: {},
      totalGiftsSent: 0,
      totalGiftsReceived: 0,
      createdAt: now,
      lastSeen: now,
    };
    await set(ref(db, `users/${cred.user.uid}`), userData);
    await set(ref(db, `veeIdIndex/${veeId}`), cred.user.uid);
    return parseUser(cred.user.uid, userData as Record<string, unknown>);
  },

  async loginUser(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  },

  async logoutUser(): Promise<void> {
    await signOut(auth);
  },

  onAuthChanged(cb: (user: User | null) => void) {
    return onAuthStateChanged(auth, cb);
  },

  // ─── USER PROFILE ────────────────────────────────────────────────────────

  async getUserProfile(uid: string): Promise<VeeUser | null> {
    const snap = await get(ref(db, `users/${uid}`));
    if (!snap.exists()) return null;
    return parseUser(uid, snap.val() as Record<string, unknown>);
  },

  async updateUserProfile(
    uid: string,
    data: { displayName?: string; bio?: string; avatar?: string; activeFrame?: string; allowFriendRequests?: boolean }
  ): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (data.displayName !== undefined) updates.displayName = data.displayName;
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.avatar !== undefined) updates.avatar = data.avatar;
    if (data.activeFrame !== undefined) updates.activeFrame = data.activeFrame;
    if (data.allowFriendRequests !== undefined) updates.allowFriendRequests = data.allowFriendRequests;
    updates.lastSeen = Date.now();

    await update(ref(db, `users/${uid}`), updates);

    if (auth.currentUser && (data.displayName || data.avatar)) {
      await updateFirebaseProfile(auth.currentUser, {
        ...(data.displayName ? { displayName: data.displayName } : {}),
        ...(data.avatar ? { photoURL: data.avatar } : {}),
      }).catch(() => {});
    }
  },

  subscribeToUserProfile(uid: string, cb: (user: VeeUser | null) => void) {
    const unsub = onValue(ref(db, `users/${uid}`), (snap) => {
      if (!snap.exists()) { cb(null); return; }
      cb(parseUser(uid, snap.val() as Record<string, unknown>));
    });
    return unsub;
  },

  async findUserByVeeId(veeId: string): Promise<VeeUser | null> {
    const snap = await get(ref(db, `veeIdIndex/${veeId.toLowerCase()}`));
    if (!snap.exists()) {
      const snap2 = await get(ref(db, `veeIdIndex/${veeId}`));
      if (!snap2.exists()) return null;
      return this.getUserProfile(snap2.val() as string);
    }
    return this.getUserProfile(snap.val() as string);
  },

  async getAllUsers(count = 100): Promise<VeeUser[]> {
    const q = query(ref(db, "users"), limitToLast(count));
    const snap = await get(q);
    const users: VeeUser[] = [];
    snap.forEach((child) => {
      users.push(parseUser(child.key!, child.val() as Record<string, unknown>));
    });
    return users;
  },

  // ─── FOLLOW / FRIENDS ────────────────────────────────────────────────────

  async followUser(myUid: string, targetUid: string): Promise<void> {
    await update(ref(db), {
      [`users/${myUid}/following/${targetUid}`]: true,
      [`users/${targetUid}/followers/${myUid}`]: true,
    });
  },

  async unfollowUser(myUid: string, targetUid: string): Promise<void> {
    await update(ref(db), {
      [`users/${myUid}/following/${targetUid}`]: null,
      [`users/${targetUid}/followers/${myUid}`]: null,
    });
  },

  async sendFriendRequest(fromUser: VeeUser, targetUid: string): Promise<void> {
    const prefSnap = await get(ref(db, `users/${targetUid}/allowFriendRequests`));
    if (prefSnap.exists() && prefSnap.val() === false) {
      throw new Error("FRIEND_REQUESTS_DISABLED");
    }
    await set(ref(db, `friendRequests/${targetUid}/${fromUser.uid}`), {
      fromUid: fromUser.uid,
      fromName: fromUser.displayName,
      fromAvatar: fromUser.avatar,
      fromVeeId: fromUser.veeId,
      timestamp: Date.now(),
      status: "pending",
    });
    oneSignalService.sendNotification(
      targetUid,
      "New Friend Request 💌",
      `${fromUser.displayName} sent you a friend request`,
      { type: "friend_request", fromUid: fromUser.uid }
    ).catch(() => {});
  },

  async acceptFriendRequest(myUid: string, fromUid: string): Promise<void> {
    // Mutual follow + seed a chat thread so BOTH parties immediately appear in
    // each other's inbox (acceptance is the gate for chatting).
    const chatId = this.getChatId(myUid, fromUid);
    const now = Date.now();
    await update(ref(db), {
      [`users/${myUid}/following/${fromUid}`]: true,
      [`users/${fromUid}/following/${myUid}`]: true,
      [`users/${myUid}/followers/${fromUid}`]: true,
      [`users/${fromUid}/followers/${myUid}`]: true,
      // Remove the request entirely (clean data)
      [`friendRequests/${myUid}/${fromUid}`]: null,
      [`privateChats/${chatId}/participants/${myUid}`]: true,
      [`privateChats/${chatId}/participants/${fromUid}`]: true,
      [`privateChats/${chatId}/lastMessage`]: "",
      [`privateChats/${chatId}/lastSenderName`]: "",
      [`privateChats/${chatId}/lastTimestamp`]: now,
      [`userChats/${myUid}/${chatId}`]: fromUid,
      [`userChats/${fromUid}/${chatId}`]: myUid,
    });
    get(ref(db, `users/${myUid}/displayName`)).then((snap) => {
      const myName = (snap.val() as string) || "Someone";
      oneSignalService.sendNotification(
        fromUid,
        "Friend Request Accepted 🎉",
        `${myName} accepted your friend request`,
        { type: "friend_accepted" }
      ).catch(() => {});
    }).catch(() => {});
  },

  async rejectFriendRequest(myUid: string, fromUid: string): Promise<void> {
    await remove(ref(db, `friendRequests/${myUid}/${fromUid}`));
  },

  subscribeToFriendRequests(uid: string, cb: (requests: FriendRequest[]) => void) {
    const unsub = onValue(ref(db, `friendRequests/${uid}`), (snap) => {
      const reqs: FriendRequest[] = [];
      snap.forEach((child) => {
        const val = child.val() as Omit<FriendRequest, "id">;
        if (val.status === "pending") reqs.push({ id: child.key!, ...val });
      });
      cb(reqs);
    });
    return unsub;
  },

  /** Two users are friends only when they mutually follow each other. */
  areFriends(a: VeeUser, b: VeeUser): boolean {
    return a.following.includes(b.uid) && b.following.includes(a.uid);
  },

  /**
   * Resolve the relationship between the current user and a target so the
   * search screen can show the correct single action.
   */
  async getFriendshipStatus(
    me: VeeUser,
    target: VeeUser
  ): Promise<"self" | "friends" | "request-sent" | "request-received" | "none"> {
    if (me.uid === target.uid) return "self";
    if (this.areFriends(me, target)) return "friends";
    const [sentSnap, recvSnap] = await Promise.all([
      get(ref(db, `friendRequests/${target.uid}/${me.uid}`)),
      get(ref(db, `friendRequests/${me.uid}/${target.uid}`)),
    ]);
    if (sentSnap.exists() && (sentSnap.val() as { status?: string })?.status === "pending")
      return "request-sent";
    if (recvSnap.exists() && (recvSnap.val() as { status?: string })?.status === "pending")
      return "request-received";
    return "none";
  },

  // ─── PRIVATE CHAT ────────────────────────────────────────────────────────

  getChatId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join("_");
  },

  async sendPrivateMessage(fromUser: VeeUser, toUid: string, text: string): Promise<void> {
    const chatId = this.getChatId(fromUser.uid, toUid);
    const msgRef = push(ref(db, `privateChats/${chatId}/messages`));
    const now = Date.now();
    await set(msgRef, {
      senderId: fromUser.uid,
      senderName: fromUser.displayName,
      senderAvatar: fromUser.avatar,
      text,
      timestamp: now,
    });
    await update(ref(db), {
      [`privateChats/${chatId}/participants/${fromUser.uid}`]: true,
      [`privateChats/${chatId}/participants/${toUid}`]: true,
      [`privateChats/${chatId}/lastMessage`]: text,
      [`privateChats/${chatId}/lastSenderName`]: fromUser.displayName,
      [`privateChats/${chatId}/lastTimestamp`]: now,
      [`userChats/${fromUser.uid}/${chatId}`]: toUid,
      [`userChats/${toUid}/${chatId}`]: fromUser.uid,
    });
    oneSignalService.sendNotification(
      toUid,
      fromUser.displayName,
      text.length > 120 ? text.slice(0, 117) + "…" : text,
      { type: "private_message", fromUid: fromUser.uid }
    ).catch(() => {});
  },

  async sendPrivateImageMessage(fromUser: VeeUser, toUid: string, imageUrl: string): Promise<void> {
    const chatId = this.getChatId(fromUser.uid, toUid);
    const msgRef = push(ref(db, `privateChats/${chatId}/messages`));
    const now = Date.now();
    await set(msgRef, {
      senderId: fromUser.uid,
      senderName: fromUser.displayName,
      senderAvatar: fromUser.avatar,
      text: "",
      imageUrl,
      timestamp: now,
    });
    await update(ref(db), {
      [`privateChats/${chatId}/participants/${fromUser.uid}`]: true,
      [`privateChats/${chatId}/participants/${toUid}`]: true,
      [`privateChats/${chatId}/lastMessage`]: "📷 Photo",
      [`privateChats/${chatId}/lastSenderName`]: fromUser.displayName,
      [`privateChats/${chatId}/lastTimestamp`]: now,
      [`userChats/${fromUser.uid}/${chatId}`]: toUid,
      [`userChats/${toUid}/${chatId}`]: fromUser.uid,
    });
    oneSignalService.sendNotification(
      toUid,
      fromUser.displayName,
      "📷 Sent you a photo",
      { type: "private_message", fromUid: fromUser.uid }
    ).catch(() => {});
  },

  subscribeToPrivateMessages(uid1: string, uid2: string, cb: (messages: PrivateMessage[]) => void) {
    const chatId = this.getChatId(uid1, uid2);
    const msgsRef = query(
      ref(db, `privateChats/${chatId}/messages`),
      orderByChild("timestamp"),
      limitToLast(100)
    );
    const unsub = onValue(msgsRef, (snap) => {
      const msgs: PrivateMessage[] = [];
      snap.forEach((child) => {
        msgs.push({ id: child.key!, ...(child.val() as Omit<PrivateMessage, "id">) });
      });
      cb(msgs);
    });
    return unsub;
  },

  subscribeToUserChats(uid: string, cb: (chats: PrivateChat[]) => void) {
    const unsub = onValue(ref(db, `userChats/${uid}`), async (snap) => {
      if (!snap.exists()) { cb([]); return; }
      const chatMap = snap.val() as Record<string, string>;
      const chats: PrivateChat[] = [];
      for (const [chatId, otherUid] of Object.entries(chatMap)) {
        const [chatSnap, otherSnap] = await Promise.all([
          get(ref(db, `privateChats/${chatId}`)),
          get(ref(db, `users/${otherUid}`)),
        ]);
        if (chatSnap.exists()) {
          const chat = chatSnap.val() as Record<string, unknown>;
          const otherUser = otherSnap.exists()
            ? parseUser(otherUid, otherSnap.val() as Record<string, unknown>)
            : null;
          chats.push({
            id: chatId,
            otherUid,
            otherUser,
            lastMessage: (chat.lastMessage as string) ?? "",
            lastSenderName: (chat.lastSenderName as string) ?? "",
            lastTimestamp: (chat.lastTimestamp as number) ?? 0,
          });
        }
      }
      cb(chats.sort((a, b) => b.lastTimestamp - a.lastTimestamp));
    });
    return unsub;
  },

  // ─── ROOMS ───────────────────────────────────────────────────────────────

  /** Allocate an unused 6-digit numeric room id (the canonical RTDB key). */
  async generateRoomId(): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const id = String(Math.floor(100000 + Math.random() * 900000));
      const snap = await get(ref(db, `rooms/${id}`));
      if (!snap.exists()) return id;
    }
    // Extremely unlikely fallback: widen the space with a timestamp suffix.
    return String(Date.now()).slice(-8);
  },

  async createRoom(
    hostUser: VeeUser,
    name: string,
    description: string,
    tags: string[] = [],
    options: { topic?: string; coverImage?: string } = {}
  ): Promise<string> {
    const seats = buildSeats(hostUser.uid, hostUser.displayName, hostUser.avatar);
    const seatsObj = seats.reduce<Record<number, Seat>>((acc, s) => ({ ...acc, [s.index]: s }), {});
    const roomId = await this.generateRoomId();
    const now = Date.now();
    await set(ref(db, `rooms/${roomId}`), {
      name,
      topic: options.topic ?? "",
      description,
      hostId: hostUser.uid,
      hostName: hostUser.displayName,
      hostAvatar: hostUser.avatar,
      coverImage: options.coverImage || hostUser.avatar,
      adminIds: {},
      seats: seatsObj,
      isLocked: false,
      isActive: true,
      listenerCount: 1,
      memberCount: 1,
      totalGifts: 0,
      pkBattle: null,
      tags: tags.reduce<Record<number, string>>((a, t, i) => ({ ...a, [i]: t }), {}),
      createdAt: now,
    });
    return roomId;
  },

  /** Look up a single room by its numeric id (used by global room search). */
  async getRoomById(roomId: string): Promise<VoiceRoom | null> {
    const snap = await get(ref(db, `rooms/${roomId.trim()}`));
    if (!snap.exists()) return null;
    return parseRoom(snap.key!, snap.val() as Record<string, unknown>);
  },

  /**
   * Atomically claim a seat. Uses a transaction on the single seat path so two
   * users tapping the same open seat can never both win it. Returns "ok" on
   * success, or the reason the claim failed.
   */
  async takeSeat(
    roomId: string,
    seatIndex: number,
    claimant: { uid: string; displayName: string; avatar: string },
    role: "owner" | "admin" | "member"
  ): Promise<"ok" | "occupied" | "locked"> {
    const seatRef = ref(db, `rooms/${roomId}/seats/${seatIndex}`);
    let outcome: "ok" | "occupied" | "locked" = "ok";
    await runTransaction(seatRef, (current: Seat | null) => {
      if (current) {
        if (current.isLocked) { outcome = "locked"; return; }
        if (current.userId) { outcome = "occupied"; return; }
        outcome = "ok";
        return {
          ...current,
          userId: claimant.uid,
          userName: claimant.displayName,
          userAvatar: claimant.avatar,
          isMuted: false,
          isHandRaised: false,
          isSpeaking: true,
          roomRole: role,
        };
      }
      // Legacy/missing seat node — materialise it for this claimant.
      outcome = "ok";
      return {
        index: seatIndex,
        userId: claimant.uid,
        userName: claimant.displayName,
        userAvatar: claimant.avatar,
        isMuted: false,
        isHandRaised: false,
        isLocked: false,
        isSpeaking: true,
        roomRole: role,
      };
    });
    return outcome;
  },

  async updateRoom(roomId: string, data: Partial<VoiceRoom>): Promise<void> {
    if (data.seats) {
      const { seats, adminIds, tags, pkBattle, ...rest } = data;
      const seatsObj = seats.reduce<Record<number, Seat>>((acc, s) => ({ ...acc, [s.index]: s }), {});
      await update(ref(db, `rooms/${roomId}`), {
        ...(rest as Record<string, unknown>),
        seats: seatsObj,
      });
    } else {
      const { adminIds, tags, pkBattle, ...rest } = data;
      await update(ref(db, `rooms/${roomId}`), rest as Record<string, unknown>);
    }
  },

  async updateRoomTopic(roomId: string, topic: string): Promise<void> {
    await update(ref(db, `rooms/${roomId}`), { topic });
  },

  async updateRoomCover(roomId: string, coverImage: string): Promise<void> {
    await update(ref(db, `rooms/${roomId}`), { coverImage });
  },

  async closeRoom(roomId: string): Promise<void> {
    await update(ref(db, `rooms/${roomId}`), { isActive: false });
  },

  async promoteToRoomAdmin(roomId: string, uid: string): Promise<void> {
    await update(ref(db, `rooms/${roomId}/adminIds`), { [uid]: true });
    const room = await get(ref(db, `rooms/${roomId}/seats`));
    if (!room.exists()) return;
    const seats = Object.values(room.val() as Record<string, Seat>).sort((a, b) => a.index - b.index);
    const updated = seats.map((s): Seat => s.userId === uid ? { ...s, roomRole: "admin" } : s);
    const seatsObj = updated.reduce<Record<number, Seat>>((acc, s) => ({ ...acc, [s.index]: s }), {});
    await update(ref(db, `rooms/${roomId}`), { seats: seatsObj });
  },

  async demoteFromRoomAdmin(roomId: string, uid: string): Promise<void> {
    await remove(ref(db, `rooms/${roomId}/adminIds/${uid}`));
    const room = await get(ref(db, `rooms/${roomId}/seats`));
    if (!room.exists()) return;
    const seats = Object.values(room.val() as Record<string, Seat>).sort((a, b) => a.index - b.index);
    const updated = seats.map((s): Seat => s.userId === uid ? { ...s, roomRole: "member" } : s);
    const seatsObj = updated.reduce<Record<number, Seat>>((acc, s) => ({ ...acc, [s.index]: s }), {});
    await update(ref(db, `rooms/${roomId}`), { seats: seatsObj });
  },

  subscribeToRoom(roomId: string, cb: (room: VoiceRoom | null) => void) {
    const unsub = onValue(ref(db, `rooms/${roomId}`), (snap) => {
      if (!snap.exists()) { cb(null); return; }
      cb(parseRoom(snap.key!, snap.val() as Record<string, unknown>));
    });
    return unsub;
  },

  subscribeToActiveRooms(cb: (rooms: VoiceRoom[]) => void) {
    const roomsRef = query(ref(db, "rooms"), orderByChild("listenerCount"), limitToLast(50));
    const unsub = onValue(roomsRef, (snap) => {
      const rooms: VoiceRoom[] = [];
      snap.forEach((child) => {
        const val = child.val() as Record<string, unknown>;
        if (val.isActive) rooms.push(parseRoom(child.key!, val));
      });
      cb(rooms.reverse());
    });
    return unsub;
  },

  // ─── ROOM MESSAGES ───────────────────────────────────────────────────────

  subscribeToRoomMessages(roomId: string, cb: (messages: ChatMessage[]) => void) {
    const msgsRef = query(
      ref(db, `rooms/${roomId}/messages`),
      orderByChild("timestamp"),
      limitToLast(100)
    );
    const unsub = onValue(msgsRef, (snap) => {
      const msgs: ChatMessage[] = [];
      snap.forEach((child) => {
        msgs.push({ id: child.key!, ...(child.val() as Omit<ChatMessage, "id">) });
      });
      cb(msgs);
    });
    return unsub;
  },

  async sendMessage(roomId: string, msg: Omit<ChatMessage, "id">): Promise<void> {
    const msgRef = push(ref(db, `rooms/${roomId}/messages`));
    await set(msgRef, msg);
  },

  // ─── GIFTS ───────────────────────────────────────────────────────────────

  /**
   * Atomically debit the sender's diamonds, aborting if they can't afford it,
   * then credit the receiver and record the transaction. Returns "ok" on
   * success or "insufficient" if the balance was too low. The debit runs in a
   * transaction so concurrent gifts can never push a balance negative.
   */
  async sendGift(tx: Omit<GiftTransaction, "id">, roomId: string): Promise<"ok" | "insufficient"> {
    const balRef = ref(db, `users/${tx.senderId}/diamonds`);
    const res = await runTransaction(balRef, (current: number | null) => {
      const bal = current ?? 0;
      if (bal < tx.totalDiamonds) return; // abort — keeps current value
      return bal - tx.totalDiamonds;
    });
    if (!res.committed) return "insufficient";

    const coinsEarned = tx.totalDiamonds * 10;
    const txRef = push(ref(db, "transactions"));
    await set(txRef, { ...tx, roomId, timestamp: Date.now() });
    await update(ref(db), {
      [`users/${tx.senderId}/totalGiftsSent`]: increment(tx.totalDiamonds),
      [`users/${tx.receiverId}/coins`]: increment(coinsEarned),
      [`users/${tx.receiverId}/totalGiftsReceived`]: increment(tx.totalDiamonds),
      [`rooms/${roomId}/totalGifts`]: increment(tx.totalDiamonds),
    });
    oneSignalService.sendNotification(
      tx.receiverId,
      "You received a gift! 🎁",
      `${tx.senderName} sent you ${tx.count}x ${tx.gift.name}`,
      { type: "gift", roomId }
    ).catch(() => {});
    return "ok";
  },

  // ─── PK BATTLE ───────────────────────────────────────────────────────────

  async startPKBattle(
    roomId: string,
    challengerHostId: string,
    challengerHostName: string,
    targetRoomId: string,
    targetHostId: string,
    targetHostName: string,
    durationSeconds = 180
  ): Promise<void> {
    const now = Date.now();
    const pkBattle: PKBattle = {
      isActive: true,
      challengerRoomId: roomId,
      challengerHostId,
      challengerHostName,
      challengerScore: 0,
      targetRoomId,
      targetHostId,
      targetHostName,
      targetScore: 0,
      startedAt: now,
      endsAt: now + durationSeconds * 1000,
      durationSeconds,
    };
    await update(ref(db, `rooms/${roomId}`), { pkBattle });
  },

  async updatePKScore(roomId: string, side: "challenger" | "target", amount: number): Promise<void> {
    const field = side === "challenger" ? "pkBattle/challengerScore" : "pkBattle/targetScore";
    await update(ref(db, `rooms/${roomId}`), { [field]: increment(amount) });
  },

  async endPKBattle(roomId: string): Promise<void> {
    await update(ref(db, `rooms/${roomId}`), { pkBattle: null });
  },

  // ─── LEADERBOARD ─────────────────────────────────────────────────────────

  async getTopGifters(count = 10) {
    const q = query(ref(db, "users"), orderByChild("totalGiftsSent"), limitToLast(count));
    const snap = await get(q);
    const users: Array<Record<string, unknown>> = [];
    snap.forEach((child) => {
      users.push({ ...(child.val() as Record<string, unknown>), uid: child.key! });
    });
    return users.reverse().map((u, i) => ({
      ...parseUser(u.uid as string, u),
      rank: i + 1,
      value: (u.totalGiftsSent as number) ?? 0,
    }));
  },

  async getTopReceivers(count = 10) {
    const q = query(ref(db, "users"), orderByChild("totalGiftsReceived"), limitToLast(count));
    const snap = await get(q);
    const users: Array<Record<string, unknown>> = [];
    snap.forEach((child) => {
      users.push({ ...(child.val() as Record<string, unknown>), uid: child.key! });
    });
    return users.reverse().map((u, i) => ({
      ...parseUser(u.uid as string, u),
      rank: i + 1,
      value: (u.totalGiftsReceived as number) ?? 0,
    }));
  },

  // ─── ADMIN ───────────────────────────────────────────────────────────────

  async grantDiamonds(uid: string, amount: number): Promise<void> {
    await update(ref(db, `users/${uid}`), { diamonds: increment(amount) });
  },

  async setAdminRole(uid: string, isAdmin: boolean): Promise<void> {
    await update(ref(db, `users/${uid}`), {
      isAdmin,
      role: isAdmin ? "admin" : "user",
    });
  },

  async banUser(uid: string, reason = ""): Promise<void> {
    await update(ref(db, `users/${uid}`), { isBanned: true, banReason: reason });
  },

  async unbanUser(uid: string): Promise<void> {
    await update(ref(db, `users/${uid}`), { isBanned: false, banReason: "" });
  },

  async warnUser(uid: string, adminUid: string, adminName: string, reason: string): Promise<void> {
    const warningRef = push(ref(db, `users/${uid}/warningsList`));
    await set(warningRef, {
      adminUid,
      adminName,
      reason,
      createdAt: Date.now(),
    });
    await update(ref(db, `users/${uid}`), { warnings: increment(1) });
  },

  async sendBadge(toUid: string, badge: Omit<import("../types").HonorBadge, "earnedAt">): Promise<void> {
    const badgeRef = push(ref(db, `users/${toUid}/honorBadges`));
    await set(badgeRef, { ...badge, earnedAt: Date.now() });
  },

  async grantFrame(toUid: string, frame: Omit<import("../types").AnimationFrame, "earnedAt">): Promise<void> {
    const frameRef = push(ref(db, `users/${toUid}/animationFrames`));
    await set(frameRef, { ...frame, earnedAt: Date.now() });
    await update(ref(db, `users/${toUid}`), { activeFrame: frame.id });
  },

  async sendAdminGift(toUid: string, toName: string, gift: import("../types").Gift, quantity: number): Promise<void> {
    const coinsEarned = gift.diamondCost * quantity * 10;
    const txRef = push(ref(db, "transactions"));
    await set(txRef, {
      senderId: "admin",
      senderName: "Admin",
      senderAvatar: "",
      receiverId: toUid,
      receiverName: toName,
      gift,
      count: quantity,
      totalDiamonds: 0,
      timestamp: Date.now(),
      isAdminGift: true,
    });
    await update(ref(db, `users/${toUid}`), {
      coins: increment(coinsEarned),
      totalGiftsReceived: increment(gift.diamondCost * quantity),
    });
  },

  // ─── REPORTS ─────────────────────────────────────────────────────────────

  async sendReport(
    reporterUid: string,
    reporterName: string,
    reportedUid: string,
    reportedName: string,
    reason: string,
    description: string
  ): Promise<void> {
    const rRef = push(ref(db, "reports"));
    await set(rRef, {
      reporterUid,
      reporterName,
      reportedUid,
      reportedName,
      reason,
      description,
      status: "pending",
      createdAt: Date.now(),
    });
  },

  subscribeToReports(cb: (reports: UserReport[]) => void) {
    const unsub = onValue(ref(db, "reports"), (snap) => {
      const reports: UserReport[] = [];
      snap.forEach((child) => {
        reports.push({ id: child.key!, ...(child.val() as Omit<UserReport, "id">) });
      });
      cb(reports.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
  },

  async resolveReport(reportId: string, status: "reviewed" | "dismissed"): Promise<void> {
    await update(ref(db, `reports/${reportId}`), { status });
  },

  // ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────

  async sendAnnouncement(title: string, body: string, sentByUid: string, sentByName: string): Promise<void> {
    const aRef = push(ref(db, "announcements"));
    await set(aRef, { title, body, sentByUid, sentByName, createdAt: Date.now() });
  },

  subscribeToAnnouncements(cb: (announcements: Announcement[]) => void) {
    const q = query(ref(db, "announcements"), orderByChild("createdAt"), limitToLast(20));
    const unsub = onValue(q, (snap) => {
      const list: Announcement[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...(child.val() as Omit<Announcement, "id">) });
      });
      cb(list.reverse());
    });
    return unsub;
  },

  // ─── EMOJI REACTIONS ─────────────────────────────────────────────────────

  async sendEmojiReaction(roomId: string, uid: string, userName: string, emoji: string): Promise<void> {
    const rRef = push(ref(db, `rooms/${roomId}/reactions`));
    await set(rRef, { uid, userName, emoji, timestamp: Date.now() });
  },

  subscribeToRoomReactions(roomId: string, cb: (reactions: import("../types").EmojiReaction[]) => void) {
    const q = query(ref(db, `rooms/${roomId}/reactions`), orderByChild("timestamp"), limitToLast(20));
    const unsub = onValue(q, (snap) => {
      const reactions: import("../types").EmojiReaction[] = [];
      const cutoff = Date.now() - 8000;
      snap.forEach((child) => {
        const v = child.val() as Omit<import("../types").EmojiReaction, "id">;
        if (v.timestamp > cutoff) reactions.push({ id: child.key!, ...v });
      });
      cb(reactions);
    });
    return unsub;
  },

  // ─── POLLS ───────────────────────────────────────────────────────────────

  async createRoomPoll(roomId: string, question: string, options: string[], createdBy: string, createdByName: string, durationSeconds = 120): Promise<string> {
    const pRef = push(ref(db, `rooms/${roomId}/polls`));
    const now = Date.now();
    await set(pRef, {
      question,
      options,
      votes: {},
      createdBy,
      createdByName,
      createdAt: now,
      endsAt: now + durationSeconds * 1000,
      isActive: true,
    });
    return pRef.key!;
  },

  async voteOnPoll(roomId: string, pollId: string, uid: string, optionIndex: number): Promise<void> {
    await update(ref(db, `rooms/${roomId}/polls/${pollId}/votes`), { [uid]: optionIndex });
  },

  async closeRoomPoll(roomId: string, pollId: string): Promise<void> {
    await update(ref(db, `rooms/${roomId}/polls/${pollId}`), { isActive: false });
  },

  subscribeToRoomPolls(roomId: string, cb: (polls: import("../types").RoomPoll[]) => void) {
    const unsub = onValue(ref(db, `rooms/${roomId}/polls`), (snap) => {
      const polls: import("../types").RoomPoll[] = [];
      snap.forEach((child) => {
        const v = child.val() as Omit<import("../types").RoomPoll, "id">;
        const votes: Record<string, number> = v.votes ? (v.votes as Record<string, number>) : {};
        polls.push({ id: child.key!, ...v, votes, options: Array.isArray(v.options) ? v.options : Object.values(v.options as Record<string, string>) });
      });
      cb(polls.filter((p) => p.isActive && Date.now() < p.endsAt).reverse());
    });
    return unsub;
  },

  // ─── HAND RAISES ─────────────────────────────────────────────────────────

  async raiseHand(roomId: string, uid: string, userName: string, userAvatar: string): Promise<void> {
    await set(ref(db, `rooms/${roomId}/handRaises/${uid}`), { userId: uid, userName, userAvatar, timestamp: Date.now() });
  },

  async lowerHand(roomId: string, uid: string): Promise<void> {
    await remove(ref(db, `rooms/${roomId}/handRaises/${uid}`));
  },

  subscribeToHandRaises(roomId: string, cb: (raises: import("../types").HandRaiseRequest[]) => void) {
    const unsub = onValue(ref(db, `rooms/${roomId}/handRaises`), (snap) => {
      const raises: import("../types").HandRaiseRequest[] = [];
      snap.forEach((child) => {
        raises.push(child.val() as import("../types").HandRaiseRequest);
      });
      cb(raises.sort((a, b) => a.timestamp - b.timestamp));
    });
    return unsub;
  },

  // ─── ROOM SETTINGS ───────────────────────────────────────────────────────

  async setRoomTheme(roomId: string, theme: string): Promise<void> {
    await update(ref(db, `rooms/${roomId}`), { theme });
  },

  async setRoomWelcomeMessage(roomId: string, welcomeMessage: string, enabled: boolean): Promise<void> {
    await update(ref(db, `rooms/${roomId}`), { welcomeMessage, welcomeMessageEnabled: enabled });
  },

  // ─── FAN BADGES ──────────────────────────────────────────────────────────

  async updateFanBadge(hostUid: string, fanUid: string, diamondsGifted: number): Promise<void> {
    await update(ref(db, `fanBadges/${hostUid}/${fanUid}`), {
      hostUid,
      fanUid,
      totalGifted: increment(diamondsGifted),
      updatedAt: Date.now(),
    });
  },

  async getFanBadge(hostUid: string, fanUid: string): Promise<import("../types").FanBadge | null> {
    const snap = await get(ref(db, `fanBadges/${hostUid}/${fanUid}`));
    if (!snap.exists()) return null;
    const val = snap.val() as Record<string, unknown>;
    const totalGifted = (val.totalGifted as number) ?? 0;
    const { FAN_BADGE_LEVELS } = await import("../types");
    let levelInfo = FAN_BADGE_LEVELS[0];
    for (const l of FAN_BADGE_LEVELS) {
      if (totalGifted >= l.minGifted) levelInfo = l;
    }
    return { hostUid, fanUid, level: levelInfo.level, label: levelInfo.label, color: levelInfo.color, totalGifted, updatedAt: (val.updatedAt as number) ?? Date.now() };
  },

  subscribeToFanBadge(hostUid: string, fanUid: string, cb: (badge: import("../types").FanBadge | null) => void) {
    const unsub = onValue(ref(db, `fanBadges/${hostUid}/${fanUid}`), async (snap) => {
      if (!snap.exists()) { cb(null); return; }
      const val = snap.val() as Record<string, unknown>;
      const totalGifted = (val.totalGifted as number) ?? 0;
      const { FAN_BADGE_LEVELS } = await import("../types");
      let levelInfo = FAN_BADGE_LEVELS[0];
      for (const l of FAN_BADGE_LEVELS) {
        if (totalGifted >= l.minGifted) levelInfo = l;
      }
      cb({ hostUid, fanUid, level: levelInfo.level, label: levelInfo.label, color: levelInfo.color, totalGifted, updatedAt: (val.updatedAt as number) ?? Date.now() });
    });
    return unsub;
  },

  // ─── XP / LEVEL ──────────────────────────────────────────────────────────

  async addExperience(uid: string, xp: number): Promise<void> {
    await update(ref(db, `users/${uid}`), { experience: increment(xp) });
  },

  // ─── ROOM PRESENCE ───────────────────────────────────────────────────────

  async joinRoomPresence(roomId: string, userId: string, displayName: string, avatar: string): Promise<void> {
    const presenceRef = ref(db, `rooms/${roomId}/presence/${userId}`);
    await set(presenceRef, { uid: userId, displayName, avatar, joinedAt: Date.now() });
    onDisconnect(presenceRef).remove();
  },

  async leaveRoomPresence(roomId: string, userId: string): Promise<void> {
    await remove(ref(db, `rooms/${roomId}/presence/${userId}`));
  },

  subscribeToRoomPresence(
    roomId: string,
    cb: (members: Array<{ uid: string; displayName: string; avatar: string; joinedAt: number }>) => void
  ) {
    return onValue(ref(db, `rooms/${roomId}/presence`), (snap) => {
      const members: Array<{ uid: string; displayName: string; avatar: string; joinedAt: number }> = [];
      snap.forEach((child) => {
        const val = child.val() as { uid: string; displayName: string; avatar: string; joinedAt: number };
        members.push(val);
      });
      cb(members);
    });
  },

  // ─── ROOM INVITE ─────────────────────────────────────────────────────────

  async sendRoomInvite(fromUser: VeeUser, toUid: string, room: VoiceRoom): Promise<void> {
    const chatId = this.getChatId(fromUser.uid, toUid);
    const text = `🎙️ Join my voice room: ${room.name} → /room/${room.id}`;
    const msgRef = push(ref(db, `privateChats/${chatId}/messages`));
    const now = Date.now();
    await set(msgRef, {
      senderId: fromUser.uid,
      senderName: fromUser.displayName,
      senderAvatar: fromUser.avatar,
      text,
      timestamp: now,
    });
    await update(ref(db), {
      [`privateChats/${chatId}/participants/${fromUser.uid}`]: true,
      [`privateChats/${chatId}/participants/${toUid}`]: true,
      [`privateChats/${chatId}/lastMessage`]: text,
      [`privateChats/${chatId}/lastSenderName`]: fromUser.displayName,
      [`privateChats/${chatId}/lastTimestamp`]: now,
      [`userChats/${fromUser.uid}/${chatId}`]: toUid,
      [`userChats/${toUid}/${chatId}`]: fromUser.uid,
    });
    oneSignalService.sendNotification(
      toUid,
      `${fromUser.displayName} invited you 🎙️`,
      `Join the voice room: ${room.name}`,
      { type: "room_invite", roomId: room.id }
    ).catch(() => {});
  },
};
