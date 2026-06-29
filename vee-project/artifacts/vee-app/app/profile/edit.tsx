import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { cloudinaryService } from "@/services/cloudinary";
import { UserAvatar } from "@/components/UserAvatar";

export default function EditProfileScreen() {
  const colors = useColors();
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Please allow photo library access in your device settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const url = await cloudinaryService.uploadImage(uri, "vee/avatars");
      if (!url) throw new Error("No URL returned");
      setAvatar(url);
    } catch (err) {
      Alert.alert("Upload Failed", "Could not upload image. Check your internet connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert("Required", "Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        displayName: name,
        bio: bio.trim(),
        avatar,
      });
      router.back();
    } catch {
      Alert.alert("Save Failed", "Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickImage} disabled={uploading || saving}>
          <UserAvatar uri={avatar} size={96} borderColor={colors.primary} borderWidth={3} />
          <View style={[styles.editBadge, { backgroundColor: uploading ? colors.secondary : colors.primary }]}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="camera" size={15} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
        <Text style={[styles.changeText, { color: colors.primary }]}>
          {uploading ? "Uploading…" : "Tap to change photo"}
        </Text>
        {avatar !== user?.avatar && !uploading && (
          <View style={[styles.uploadedBadge, { backgroundColor: colors.teal + "33" }]}>
            <Feather name="check" size={12} color={colors.teal} />
            <Text style={[styles.uploadedText, { color: colors.teal }]}>Photo ready to save</Text>
          </View>
        )}
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>DISPLAY NAME</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.mutedForeground}
          maxLength={30}
          returnKeyType="next"
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>BIO</Text>
        <TextInput
          style={[styles.input, styles.bioInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people about yourself…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={150}
        />
        <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{bio.length}/150</Text>

        <View style={[styles.infoRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="hash" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>Vee ID: <Text style={{ color: colors.primary, fontWeight: "700" }}>{user?.veeId}</Text></Text>
        </View>
        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
          Your Vee ID is permanent and cannot be changed.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: (saving || uploading) ? 0.6 : 1 }]}
        onPress={handleSave}
        disabled={saving || uploading}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  avatarSection: { alignItems: "center", paddingTop: 28, paddingBottom: 20 },
  avatarWrap: { position: "relative" },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  changeText: { marginTop: 10, fontSize: 14, fontWeight: "600" },
  uploadedBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  uploadedText: { fontSize: 12, fontWeight: "600" },
  form: { paddingHorizontal: 20, gap: 4 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 15,
  },
  bioInput: { height: 96, paddingTop: 14, textAlignVertical: "top" },
  charCount: { fontSize: 11, textAlign: "right", marginTop: 4 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    marginTop: 10,
  },
  infoText: { fontSize: 14 },
  hintText: { fontSize: 12, marginTop: 4 },
  saveBtn: {
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 14,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
