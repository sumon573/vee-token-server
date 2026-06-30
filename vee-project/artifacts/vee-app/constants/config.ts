import { Gift } from "../types";

export const CLOUDINARY = {
  cloudName: "db6yriudg",
  apiKey: "874753591652163",
  uploadPreset: "vee_uploads",
};

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDBUmRgtY8YzJeZeQ9eKIXdGsbbU19gM7o",
  authDomain: "vee-chat-671f0.firebaseapp.com",
  databaseURL: "https://vee-chat-671f0-default-rtdb.firebaseio.com/",
  projectId: "vee-chat-671f0",
  storageBucket: "vee-chat-671f0.firebasestorage.app",
  messagingSenderId: "638753650610",
  appId: "1:638753650610:web:8ccfadcc1a90f085eb56ab",
};

// Agora RTC credentials.
// EXPO_PUBLIC_AGORA_TOKEN_SERVER_URL must be set via EAS environment variables
// or in eas.json. Set it to your deployed Vercel token server URL.
// Example: https://your-project.vercel.app/api
const tokenServerUrl = process.env.EXPO_PUBLIC_AGORA_TOKEN_SERVER_URL;

if (!tokenServerUrl && __DEV__) {
  console.warn(
    "[Vee] EXPO_PUBLIC_AGORA_TOKEN_SERVER_URL is not set. " +
    "Voice rooms will not work. Set it in eas.json or the EAS dashboard."
  );
}

export const AGORA = {
  appId: process.env.EXPO_PUBLIC_AGORA_APP_ID ?? "1fa2a7a0c8424c0ab2c69db4d4ddb673",
  tokenServerUrl: tokenServerUrl ?? "",
};

export const ONESIGNAL = {
  appId: "7bcaa8e5-f51a-4b57-ab3a-7600ea06709c",
};

export const ECONOMY = {
  diamondToCoinsRate: 10,
  gifts: [
    { id: "candy", name: "Candy", emoji: "🍬", icon: "heart", diamondCost: 1, animation: "small" as const },
    { id: "rose", name: "Rose", emoji: "🌹", icon: "heart", diamondCost: 5, animation: "small" as const },
    { id: "lollipop", name: "Lollipop", emoji: "🍭", icon: "heart", diamondCost: 8, animation: "small" as const },
    { id: "ice_cream", name: "Ice Cream", emoji: "🍦", icon: "star", diamondCost: 10, animation: "small" as const },
    { id: "beer", name: "Cheers", emoji: "🍻", icon: "activity", diamondCost: 15, animation: "small" as const },
    { id: "cake", name: "Cake", emoji: "🎂", icon: "gift", diamondCost: 20, animation: "medium" as const },
    { id: "love_box", name: "Love Box", emoji: "💝", icon: "gift", diamondCost: 30, animation: "medium" as const },
    { id: "diamond_ring", name: "Ring", emoji: "💍", icon: "award", diamondCost: 50, animation: "medium" as const },
    { id: "crown", name: "Crown", emoji: "👑", icon: "award", diamondCost: 99, animation: "medium" as const },
    { id: "sports_car", name: "Sports Car", emoji: "🏎️", icon: "zap", diamondCost: 188, animation: "medium" as const },
    { id: "teddy", name: "Teddy Bear", emoji: "🧸", icon: "heart", diamondCost: 200, animation: "medium" as const },
    { id: "fireworks", name: "Fireworks", emoji: "🎆", icon: "zap", diamondCost: 288, animation: "large" as const },
    { id: "yacht", name: "Yacht", emoji: "🛥️", icon: "anchor", diamondCost: 500, animation: "large" as const },
    { id: "rocket", name: "Rocket", emoji: "🚀", icon: "zap", diamondCost: 888, animation: "large" as const },
    { id: "castle", name: "Castle", emoji: "🏰", icon: "home", diamondCost: 1000, animation: "large" as const },
    { id: "galaxy", name: "Galaxy", emoji: "🌌", icon: "star", diamondCost: 1888, animation: "large" as const },
    { id: "dragon", name: "Dragon", emoji: "🐉", icon: "activity", diamondCost: 3000, animation: "large" as const },
    { id: "planet", name: "Universe", emoji: "🪐", icon: "globe", diamondCost: 5000, animation: "large" as const },
  ] as Gift[],
};

export const EMOJI_REACTIONS = ["❤️", "🔥", "👏", "🎉", "💎", "😍"];

export const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500,
  7500, 10000, 13500, 18000, 24000, 32000, 42000, 55000, 72000, 100000,
];

export function getLevelProgress(experience: number): { level: number; progress: number; nextXP: number; currentXP: number } {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (experience >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  const currentXP = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextXP = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = Math.min(1, (experience - currentXP) / Math.max(1, nextXP - currentXP));
  return { level, progress, nextXP, currentXP };
}
