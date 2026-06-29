import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterScreen() {
  const colors = useColors();
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Navigate reactively once the profile has loaded (same fix as login).
  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  const handleRegister = async () => {
    setError("");
    if (!displayName.trim()) { setError("Display name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPass) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim());
      // Navigation is handled by the effect above once the profile arrives.
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError("Registration failed. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + "44", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.35 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20) }}
      >
        <View style={styles.logoSection}>
          <Text style={[styles.logo, { color: colors.primary }]}>Vee</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Join the community</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Create Account</Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive + "55" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {[
            { placeholder: "Display name", value: displayName, onChangeText: setDisplayName, icon: "user" as const, autoCapitalize: "words" as const, secure: false },
            { placeholder: "Email", value: email, onChangeText: setEmail, icon: "mail" as const, autoCapitalize: "none" as const, secure: false },
          ].map((f) => (
            <View key={f.placeholder} style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name={f.icon} size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={f.placeholder}
                placeholderTextColor={colors.mutedForeground}
                value={f.value}
                onChangeText={f.onChangeText}
                autoCapitalize={f.autoCapitalize}
                keyboardType={f.placeholder === "Email" ? "email-address" : "default"}
                autoCorrect={false}
              />
            </View>
          ))}

          <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="lock" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Password (min 6 chars)"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="lock" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Confirm password"
              placeholderTextColor={colors.mutedForeground}
              value={confirmPass}
              onChangeText={setConfirmPass}
              secureTextEntry={!showPass}
            />
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.replace("/auth/login")}>
            <Text style={[styles.loginText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoSection: { alignItems: "center", paddingTop: 20, paddingBottom: 24 },
  logo: { fontSize: 48, fontWeight: "900", letterSpacing: -2 },
  tagline: { fontSize: 15, marginTop: 4 },
  card: { marginHorizontal: 20, borderRadius: 24, borderWidth: 1, padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: "800", marginBottom: 18 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, flex: 1 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 10,
  },
  input: { flex: 1, fontSize: 15 },
  registerBtn: { borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
  registerBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loginLink: { alignItems: "center", marginTop: 18 },
  loginText: { fontSize: 14 },
});
