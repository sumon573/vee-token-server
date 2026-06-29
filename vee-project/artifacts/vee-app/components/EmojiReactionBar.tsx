import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { EMOJI_REACTIONS } from "../constants/config";

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
}

interface Props {
  onReact: (emoji: string) => void;
  incomingReactions?: { id: string; emoji: string }[];
}

function FloatingEmojiItem({ item, onDone }: { item: FloatingEmoji; onDone: (id: string) => void }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, tension: 120, friction: 6 }),
      Animated.timing(translateY, { toValue: -180, duration: 1800, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start(() => onDone(item.id));
  }, []);

  return (
    <Animated.Text
      style={[
        styles.floatEmoji,
        { left: item.x, opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      {item.emoji}
    </Animated.Text>
  );
}

export function EmojiReactionBar({ onReact, incomingReactions = [] }: Props) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);

  const addFloating = (emoji: string, xOffset?: number) => {
    const id = `${Date.now()}_${Math.random()}`;
    const x = xOffset ?? Math.floor(Math.random() * 280 + 20);
    setFloating((prev) => [...prev.slice(-8), { id, emoji, x }]);
  };

  useEffect(() => {
    if (incomingReactions.length === 0) return;
    const last = incomingReactions[incomingReactions.length - 1];
    if (last) addFloating(last.emoji);
  }, [incomingReactions.length]);

  const handlePress = (emoji: string, idx: number) => {
    onReact(emoji);
    const xBase = 20 + idx * 48;
    addFloating(emoji, xBase + Math.floor(Math.random() * 20));
  };

  return (
    <View style={styles.container}>
      <View style={styles.floatLayer} pointerEvents="none">
        {floating.map((item) => (
          <FloatingEmojiItem
            key={item.id}
            item={item}
            onDone={(id) => setFloating((prev) => prev.filter((f) => f.id !== id))}
          />
        ))}
      </View>
      <View style={styles.emojiRow}>
        {EMOJI_REACTIONS.map((emoji, idx) => (
          <TouchableOpacity
            key={emoji}
            style={styles.emojiBtn}
            onPress={() => handlePress(emoji, idx)}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  floatLayer: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    height: 200,
    pointerEvents: "none",
  },
  floatEmoji: {
    position: "absolute",
    fontSize: 28,
    bottom: 0,
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  emojiBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  emojiText: { fontSize: 24 },
});
