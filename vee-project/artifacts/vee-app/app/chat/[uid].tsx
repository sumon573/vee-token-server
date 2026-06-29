import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { firebaseService } from "@/services/firebase";
import { cloudinaryService } from "@/services/cloudinary";
import { PrivateMessage, VeeUser } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";

export default function ChatScreen() {
  const colors = useColors();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [otherUser, setOtherUser] = useState<VeeUser | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = firebaseService.subscribeToUserProfile(uid, (u) => {
      setOtherUser(u);
      if (u) navigation.setOptions({ title: u.displayName });
    });
    return unsub;
  }, [uid]);

  const areFriends =
    !!user && !!otherUser && firebaseService.areFriends(user, otherUser);

  useEffect(() => {
    if (!user || !uid) return;
    const unsub = firebaseService.subscribeToPrivateMessages(user.uid, uid, (msgs) => {
      setMessages(msgs);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [user?.uid, uid]);

  const handleSend = async () => {
    if (!text.trim() || !user || !uid || sending || !areFriends) return;
    const t = text.trim();
    setText("");
    setSending(true);
    try {
      await firebaseService.sendPrivateMessage(user, uid, t);
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    if (!user || !uid || sendingImage || !areFriends) return;
    try {
      const ImagePicker = await import("expo-image-picker");
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow access to your photo library.");
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });
      if (pickerResult.canceled || !pickerResult.assets[0]) return;
      setSendingImage(true);
      const uri = pickerResult.assets[0].uri;
      const imageUrl = await cloudinaryService.uploadImage(uri, "vee/chat");
      await firebaseService.sendPrivateImageMessage(user, uid, imageUrl);
    } catch {
      Alert.alert("Error", "Could not send photo. Please try again.");
    } finally {
      setSendingImage(false);
    }
  };

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item: msg }) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <View style={[styles.msgWrap, isMe ? styles.msgWrapMe : styles.msgWrapOther]}>
                {!isMe && (
                  <UserAvatar uri={msg.senderAvatar} size={28} />
                )}
                <View
                  style={[
                    styles.bubble,
                    isMe
                      ? [styles.bubbleMe, { backgroundColor: colors.primary }]
                      : [styles.bubbleOther, { backgroundColor: colors.card, borderColor: colors.border }],
                  ]}
                >
                  {!isMe && (
                    <Text style={[styles.senderName, { color: colors.primary }]}>{msg.senderName}</Text>
                  )}
                  {msg.imageUrl ? (
                    <Image
                      source={{ uri: msg.imageUrl }}
                      style={styles.chatImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.text }]}>
                      {msg.text}
                    </Text>
                  )}
                  <Text style={[styles.timestamp, { color: isMe ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="message-circle" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Say hello to {otherUser?.displayName ?? "them"}!
              </Text>
            </View>
          }
        />

        {otherUser && !areFriends ? (
          <View
            style={[
              styles.lockedBar,
              {
                paddingBottom: bottomPad + 12,
                backgroundColor: colors.card,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
              You can only message {otherUser.displayName} once you're friends.
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.inputBar,
              {
                paddingBottom: bottomPad + 8,
                backgroundColor: colors.card,
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
              onPress={handlePickImage}
              disabled={sendingImage}
            >
              {sendingImage ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="image" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Message…"
                placeholderTextColor={colors.mutedForeground}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.secondary }]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              <Feather name="send" size={18} color={text.trim() ? "#fff" : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 80 },
  emptyText: { fontSize: 15 },
  msgWrap: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgWrapMe: { justifyContent: "flex-end" },
  msgWrapOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", borderRadius: 18, padding: 12 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4, borderWidth: 1 },
  senderName: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  chatImage: { width: 200, height: 200, borderRadius: 10 },
  timestamp: { fontSize: 10, marginTop: 4, textAlign: "right" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1 },
  lockedBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  lockedText: { fontSize: 13, textAlign: "center", flexShrink: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  inputWrap: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44 },
  input: { fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
