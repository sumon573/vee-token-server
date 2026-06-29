import React, { createContext, useCallback, useContext, useState } from "react";
import { firebaseService } from "../services/firebase";
import { ECONOMY } from "../constants/config";
import { Gift, GiftTransaction } from "../types";
import { useAuth } from "./AuthContext";

export interface GiftAnimation {
  id: string;
  senderName: string;
  senderAvatar: string;
  gift: Gift;
  count: number;
}

interface EconomyContextValue {
  gifts: Gift[];
  activeAnimations: GiftAnimation[];
  sendGift: (gift: Gift, count: number, receiverId: string, receiverName: string, roomId: string) => Promise<boolean>;
  dismissAnimation: (id: string) => void;
  canAfford: (diamondCost: number) => boolean;
}

const EconomyContext = createContext<EconomyContextValue | null>(null);

export function EconomyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const gifts: Gift[] = ECONOMY.gifts;
  const [activeAnimations, setActiveAnimations] = useState<GiftAnimation[]>([]);

  const canAfford = useCallback(
    (cost: number) => (user?.diamonds ?? 0) >= cost,
    [user?.diamonds]
  );

  const sendGift = useCallback(
    async (gift: Gift, count: number, receiverId: string, receiverName: string, roomId: string): Promise<boolean> => {
      if (!user) return false;
      const total = gift.diamondCost * count;
      if (!canAfford(total)) return false;

      const tx: Omit<GiftTransaction, "id"> = {
        senderId: user.uid,
        senderName: user.displayName,
        senderAvatar: user.avatar,
        receiverId,
        receiverName,
        roomId,
        gift,
        count,
        totalDiamonds: total,
        timestamp: Date.now(),
      };

      try {
        const result = await firebaseService.sendGift(tx, roomId);
        if (result === "insufficient") return false;
        await firebaseService.updateFanBadge(receiverId, user.uid, total).catch(() => {});
        await firebaseService.addExperience(user.uid, Math.ceil(total / 5)).catch(() => {});

        const animId = `${Date.now()}_${Math.random()}`;
        setActiveAnimations((prev) => {
          const existing = prev.find((a) => a.gift.id === gift.id);
          if (existing) {
            return prev.map((a) => a.gift.id === gift.id ? { ...a, count: a.count + count } : a);
          }
          return [...prev.slice(-3), { id: animId, senderName: user.displayName, senderAvatar: user.avatar, gift, count }];
        });

        setTimeout(() => {
          setActiveAnimations((prev) => prev.filter((a) => a.id !== animId));
        }, 4000);
        return true;
      } catch {
        return false;
      }
    },
    [user, canAfford]
  );

  const dismissAnimation = useCallback((id: string) => {
    setActiveAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <EconomyContext.Provider value={{ gifts, activeAnimations, sendGift, dismissAnimation, canAfford }}>
      {children}
    </EconomyContext.Provider>
  );
}

export function useEconomy(): EconomyContextValue {
  const ctx = useContext(EconomyContext);
  if (!ctx) throw new Error("useEconomy must be inside EconomyProvider");
  return ctx;
}
