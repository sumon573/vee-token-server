export interface HonorBadge {
  id: string;
  name: string;
  color: string;
  icon: string;
  earnedAt: number;
}

export interface AnimationFrame {
  id: string;
  name: string;
  url: string;
  earnedAt: number;
}

export interface UserWarning {
  id: string;
  adminUid: string;
  adminName: string;
  reason: string;
  createdAt: number;
}

export interface VeeUser {
  uid: string;
  veeId: string;
  displayName: string;
  avatar: string;
  bio: string;
  diamonds: number;
  coins: number;
  level: number;
  experience: number;
  followers: string[];
  following: string[];
  followersCount: number;
  followingCount: number;
  role: "user" | "admin";
  isAdmin: boolean;
  isBanned: boolean;
  banReason?: string;
  warnings: number;
  honorBadges: HonorBadge[];
  animationFrames: AnimationFrame[];
  activeFrame?: string;
  allowFriendRequests?: boolean;
  decorations: string[];
  totalGiftsSent: number;
  totalGiftsReceived: number;
  createdAt: number;
  lastSeen: number;
}

export interface PKBattle {
  isActive: boolean;
  challengerRoomId: string;
  challengerHostId: string;
  challengerHostName: string;
  challengerScore: number;
  targetRoomId: string;
  targetHostId: string;
  targetHostName: string;
  targetScore: number;
  startedAt: number;
  endsAt: number;
  durationSeconds: number;
}

export interface Seat {
  index: number;
  userId: string | null;
  userName: string | null;
  userAvatar: string | null;
  isMuted: boolean;
  isAdminMuted?: boolean;
  isHandRaised: boolean;
  isLocked: boolean;
  isSpeaking: boolean;
  roomRole: "owner" | "admin" | "member";
}

export interface RoomPoll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  endsAt: number;
  isActive: boolean;
}

export interface EmojiReaction {
  id: string;
  uid: string;
  userName: string;
  emoji: string;
  timestamp: number;
}

export interface FanBadge {
  hostUid: string;
  fanUid: string;
  level: number;
  label: string;
  color: string;
  totalGifted: number;
  updatedAt: number;
}

export interface RoomTheme {
  id: string;
  name: string;
  gradient: [string, string];
  accent: string;
}

export const ROOM_THEMES: RoomTheme[] = [
  { id: "purple", name: "Purple", gradient: ["#7B2FF7", "#0A0A1A"], accent: "#7B2FF7" },
  { id: "rose", name: "Rose", gradient: ["#FF6B9D", "#1A0A1A"], accent: "#FF6B9D" },
  { id: "ocean", name: "Ocean", gradient: ["#00B4DB", "#0A0A1A"], accent: "#00B4DB" },
  { id: "gold", name: "Gold", gradient: ["#F5A623", "#1A0A00"], accent: "#F5A623" },
  { id: "teal", name: "Teal", gradient: ["#00D4A0", "#001A14"], accent: "#00D4A0" },
  { id: "red", name: "Fire", gradient: ["#FF4D6A", "#1A0005"], accent: "#FF4D6A" },
  { id: "mint", name: "Mint", gradient: ["#00C9A7", "#0A1A14"], accent: "#00C9A7" },
  { id: "cosmic", name: "Cosmic", gradient: ["#9B5FFF", "#0A0A2A"], accent: "#9B5FFF" },
];

export const FAN_BADGE_LEVELS = [
  { level: 1, label: "Fan", color: "#9E9E9E", minGifted: 1 },
  { level: 2, label: "Supporter", color: "#4CAF50", minGifted: 50 },
  { level: 3, label: "Fan Club", color: "#2196F3", minGifted: 200 },
  { level: 4, label: "Super Fan", color: "#9C27B0", minGifted: 500 },
  { level: 5, label: "VIP Fan", color: "#FF9800", minGifted: 1500 },
  { level: 6, label: "Legend", color: "#F5A623", minGifted: 5000 },
];

export interface VoiceRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  coverImage: string;
  adminIds: string[];
  seats: Seat[];
  isLocked: boolean;
  password?: string;
  isActive: boolean;
  listenerCount: number;
  memberCount: number;
  totalGifts: number;
  pkBattle: PKBattle | null;
  tags: string[];
  backgroundImage?: string;
  theme?: string;
  welcomeMessage?: string;
  welcomeMessageEnabled?: boolean;
  createdAt: number;
}

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  diamondCost: number;
  animation: "small" | "medium" | "large";
}

export interface GiftTransaction {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  roomId: string;
  gift: Gift;
  count: number;
  totalDiamonds: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  type: "chat" | "gift" | "join" | "leave" | "system" | "announcement";
  gift?: GiftTransaction;
  timestamp: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatar: string;
  veeId: string;
  value: number;
  rank: number;
}

export interface HandRaiseRequest {
  userId: string;
  userName: string;
  userAvatar: string;
  seatIndex?: number;
  timestamp: number;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  fromVeeId: string;
  timestamp: number;
  status: "pending" | "accepted" | "rejected";
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  imageUrl?: string;
  timestamp: number;
}

export interface PrivateChat {
  id: string;
  otherUid: string;
  otherUser: VeeUser | null;
  lastMessage: string;
  lastSenderName: string;
  lastTimestamp: number;
}

export interface UserReport {
  id: string;
  reporterUid: string;
  reporterName: string;
  reportedUid: string;
  reportedName: string;
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "dismissed";
  createdAt: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  sentByUid: string;
  sentByName: string;
  createdAt: number;
}
