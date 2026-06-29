import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { firebaseService } from "../services/firebase";
import { oneSignalService } from "../services/onesignal";
import { VeeUser } from "../types";

interface AuthContextValue {
  user: VeeUser | null;
  firebaseUser: import("firebase/auth").User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { displayName?: string; bio?: string; avatar?: string; activeFrame?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<VeeUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileUnsubRef = useRef<(() => void) | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const unsub = firebaseService.onAuthChanged((fbUser) => {
      setFirebaseUser(fbUser);

      profileUnsubRef.current?.();
      profileUnsubRef.current = null;

      if (fbUser) {
        // Subscribe to real-time profile — isLoading stays true until first value arrives
        profileUnsubRef.current = firebaseService.subscribeToUserProfile(fbUser.uid, (profile) => {
          setUser(profile);
          setIsLoading(false);
        });
        oneSignalService.setExternalId(fbUser.uid);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    oneSignalService.init();

    return () => {
      unsub();
      profileUnsubRef.current?.();
    };
  }, []);

  const register = async (email: string, password: string, displayName: string) => {
    // isLoading is managed by onAuthChanged callback — do not set here
    await firebaseService.registerUser(email, password, displayName);
  };

  const login = async (email: string, password: string) => {
    // isLoading is managed by onAuthChanged callback — do not set here to avoid double-render
    await firebaseService.loginUser(email, password);
  };

  const logout = async () => {
    profileUnsubRef.current?.();
    profileUnsubRef.current = null;
    await firebaseService.logoutUser();
    await oneSignalService.logout();
    setUser(null);
    setFirebaseUser(null);
  };

  const refreshProfile = async () => {
    if (!firebaseUser) return;
    const profile = await firebaseService.getUserProfile(firebaseUser.uid);
    if (profile) setUser(profile);
  };

  const updateProfile = async (data: { displayName?: string; bio?: string; avatar?: string; activeFrame?: string }) => {
    if (!firebaseUser) return;
    await firebaseService.updateUserProfile(firebaseUser.uid, data);
    // Real-time subscription will auto-update user state
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user && !user.isBanned,
        register,
        login,
        logout,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
