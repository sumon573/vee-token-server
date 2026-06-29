import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  uri?: string | null;
  size?: number;
  borderColor?: string;
  borderWidth?: number;
}

export function UserAvatar({ uri, size = 44, borderColor, borderWidth = 0 }: Props) {
  const colors = useColors();
  const placeholder = `https://ui-avatars.com/api/?background=7B2FF7&color=fff&size=${size * 2}`;
  const src = uri && uri.length > 0 ? uri : placeholder;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: borderColor ?? colors.border,
          borderWidth,
          backgroundColor: colors.secondary,
        },
      ]}
    >
      <Image
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        defaultSource={undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
