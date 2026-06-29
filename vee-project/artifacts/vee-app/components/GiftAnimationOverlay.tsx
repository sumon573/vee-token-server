import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from "react-native";
import { UserAvatar } from "./UserAvatar";
import { Gift } from "../types";

interface GiftAnim {
  id: string;
  senderName: string;
  senderAvatar: string;
  gift: Gift;
  count: number;
  isCombo?: boolean;
}

interface Props {
  animations: GiftAnim[];
  onDismiss: (id: string) => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function GiftCard({ anim, onDismiss }: { anim: GiftAnim; onDismiss: (id: string) => void }) {
  const slideX = useRef(new Animated.Value(-260)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const comboScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true, tension: 70, friction: 9 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    if (anim.count > 1) {
      Animated.sequence([
        Animated.spring(comboScale, { toValue: 1.4, useNativeDriver: true }),
        Animated.spring(comboScale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    }

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        onDismiss(anim.id);
      });
    }, 3600);
    return () => clearTimeout(timer);
  }, [anim.count]);

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateX: slideX }] }]}>
      <UserAvatar uri={anim.senderAvatar} size={36} />
      <View style={styles.cardBody}>
        <Text style={styles.senderName} numberOfLines={1}>{anim.senderName}</Text>
        <Text style={styles.giftLabel}>sent {anim.gift.name}</Text>
      </View>
      <Text style={styles.giftEmoji}>{anim.gift.emoji}</Text>
      {anim.count > 1 && (
        <Animated.View style={[styles.comboBadge, { transform: [{ scale: comboScale }] }]}>
          <Text style={styles.comboText}>×{anim.count}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** Full-screen premium animation for the most expensive ("large") gifts. */
function PremiumGiftCard({ anim, onDismiss }: { anim: GiftAnim; onDismiss: (id: string) => void }) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.2)).current;
  const rise = useRef(new Animated.Value(80)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 500, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.6, duration: 400, useNativeDriver: true }),
      ]).start(() => onDismiss(anim.id));
    }, 3600);

    return () => {
      pulseLoop.stop();
      clearTimeout(timer);
    };
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={[styles.premiumFill, { opacity: backdrop }]} pointerEvents="none">
      <Animated.View style={[styles.rayHalo, { transform: [{ rotate }, { scale: pulse }] }]} />
      <Animated.View style={{ alignItems: "center", transform: [{ scale }, { translateY: rise }] }}>
        <Animated.Text style={[styles.premiumEmoji, { transform: [{ scale: pulse }] }]}>
          {anim.gift.emoji}
        </Animated.Text>
        <View style={styles.premiumSender}>
          <UserAvatar uri={anim.senderAvatar} size={28} />
          <Text style={styles.premiumName} numberOfLines={1}>{anim.senderName}</Text>
        </View>
        <Text style={styles.premiumGiftName}>{anim.gift.name}</Text>
        {anim.count > 1 && <Text style={styles.premiumCombo}>×{anim.count}</Text>}
      </Animated.View>
    </Animated.View>
  );
}

export function GiftAnimationOverlay({ animations, onDismiss }: Props) {
  if (animations.length === 0) return null;
  const premium = animations.filter((a) => a.gift.animation === "large");
  const normal = animations.filter((a) => a.gift.animation !== "large");

  return (
    <>
      {premium.length > 0 && (
        <View style={styles.premiumLayer} pointerEvents="none">
          {/* show only the most recent premium gift full-screen */}
          <PremiumGiftCard key={premium[premium.length - 1].id} anim={premium[premium.length - 1]} onDismiss={onDismiss} />
        </View>
      )}
      <View style={styles.overlay} pointerEvents="none">
        {normal.map((anim) => (
          <GiftCard key={anim.id} anim={anim} onDismiss={onDismiss} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    bottom: 230,
    gap: 8,
    zIndex: 50,
    paddingLeft: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,40,0.92)",
    borderRadius: 28,
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(123,47,247,0.5)",
    maxWidth: 240,
    shadowColor: "#7B2FF7",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  cardBody: { flex: 1 },
  senderName: { color: "#fff", fontWeight: "700", fontSize: 12, maxWidth: 90 },
  giftLabel: { color: "#8888AA", fontSize: 11 },
  giftEmoji: { fontSize: 28 },
  comboBadge: {
    backgroundColor: "#F5A623",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 28,
    alignItems: "center",
  },
  comboText: { color: "#000", fontWeight: "900", fontSize: 13 },
  premiumLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  premiumFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,6,24,0.78)",
  },
  rayHalo: {
    position: "absolute",
    width: SCREEN_W * 1.4,
    height: SCREEN_W * 1.4,
    borderRadius: SCREEN_W * 0.7,
    backgroundColor: "rgba(123,47,247,0.18)",
    borderWidth: 2,
    borderColor: "rgba(245,166,35,0.35)",
  },
  premiumEmoji: {
    fontSize: Math.min(SCREEN_W, SCREEN_H) * 0.34,
    textAlign: "center",
  },
  premiumSender: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  premiumName: { color: "#fff", fontWeight: "800", fontSize: 16, maxWidth: SCREEN_W * 0.6 },
  premiumGiftName: { color: "#F5A623", fontWeight: "900", fontSize: 22, marginTop: 6, letterSpacing: 0.5 },
  premiumCombo: { color: "#fff", fontWeight: "900", fontSize: 30, marginTop: 2 },
});
