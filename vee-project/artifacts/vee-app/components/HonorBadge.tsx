import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { HonorBadge as HonorBadgeType } from "../types";
import { useColors } from "@/hooks/useColors";

interface Props {
  badge: HonorBadgeType;
  small?: boolean;
}

export function HonorBadge({ badge, small = false }: Props) {
  const colors = useColors();
  const size = small ? 20 : 28;
  const fontSize = small ? 9 : 11;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: badge.color + "33",
          borderColor: badge.color,
          height: size,
          paddingHorizontal: small ? 4 : 6,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.label, { color: badge.color, fontSize }]}>{badge.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
