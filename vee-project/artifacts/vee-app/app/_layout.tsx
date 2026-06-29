import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoomProvider } from "@/contexts/RoomContext";
import { EconomyProvider } from "@/contexts/EconomyContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const HEADER_STYLE = { backgroundColor: "#141428" } as const;
const HEADER_TITLE_STYLE = { color: "#FFFFFF", fontWeight: "700" as const };

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0A1A" } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="me"
        options={{
          headerShown: true,
          headerStyle: HEADER_STYLE,
          headerTintColor: "#FFFFFF",
          headerTitleStyle: HEADER_TITLE_STYLE,
          title: "Me",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="profile/settings-privacy"
        options={{
          headerShown: true,
          headerStyle: HEADER_STYLE,
          headerTintColor: "#FFFFFF",
          headerTitleStyle: HEADER_TITLE_STYLE,
          title: "Settings & Privacy",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen name="auth/login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen
        name="room/[id]"
        options={{ headerShown: false, animation: "slide_from_bottom", gestureEnabled: false }}
      />
      <Stack.Screen
        name="chat/[uid]"
        options={{
          headerShown: true,
          headerStyle: HEADER_STYLE,
          headerTintColor: "#FFFFFF",
          headerTitleStyle: HEADER_TITLE_STYLE,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="friends/search"
        options={{
          headerShown: true,
          headerStyle: HEADER_STYLE,
          headerTintColor: "#FFFFFF",
          headerTitleStyle: HEADER_TITLE_STYLE,
          title: "Find Friends",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{
          headerShown: true,
          headerStyle: HEADER_STYLE,
          headerTintColor: "#FFFFFF",
          headerTitleStyle: HEADER_TITLE_STYLE,
          title: "Edit Profile",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="profile/[uid]"
        options={{
          headerShown: true,
          headerStyle: HEADER_STYLE,
          headerTintColor: "#FFFFFF",
          headerTitleStyle: HEADER_TITLE_STYLE,
          title: "Profile",
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="admin/index"
        options={{
          headerShown: true,
          headerStyle: HEADER_STYLE,
          headerTintColor: "#FFFFFF",
          headerTitleStyle: HEADER_TITLE_STYLE,
          title: "Admin Panel",
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RoomProvider>
                  <EconomyProvider>
                    <RootLayoutNav />
                  </EconomyProvider>
                </RoomProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
