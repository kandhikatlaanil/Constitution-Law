import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { storage } from "@/src/utils/storage";
import { api, setAuthToken } from "@/src/api/client";

WebBrowser.maybeCompleteAuthSession();

export interface AppUser {
  user_id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  provider: string;
  language: string;
  theme: string;
  notifications: boolean;
  subscription_plan: string;
}

interface AuthResponse {
  token: string;
  token_type: string;
  user: AppUser;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGuest: (name?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  patchUser: (p: Partial<AppUser>) => void;
  changeSubscriptionPlan: (plan: "basic" | "pro" | "plus") => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = "auth_token";

function parseAccessToken(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[#&]access_token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function parseSessionId(url: string): string | null {
  if (!url) return null;
  const hashMatch = url.match(/[#&]session_id=([^&]+)/);
  if (hashMatch) return decodeURIComponent(hashMatch[1]);
  const queryMatch = url.match(/[?&]session_id=([^&]+)/);
  if (queryMatch) return decodeURIComponent(queryMatch[1]);
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const persistToken = useCallback(async (token: string) => {
    setAuthToken(token);
    await storage.secureSet(TOKEN_KEY, token);
  }, []);

  const applyAuth = useCallback(
    async (res: AuthResponse) => {
      await persistToken(res.token);
      setUser(res.user);
    },
    [persistToken],
  );

  const processTokenOrSessionId = useCallback(
    async (tokenOrSid: string, isAccessToken: boolean) => {
      if (isAccessToken) {
        await persistToken(tokenOrSid);
        const me = await api.get<{ user: AppUser }>("/auth/me");
        setUser(me.user);
      } else {
        const res = await api.post<AuthResponse>("/auth/google/session", { session_id: tokenOrSid });
        await applyAuth(res);
      }
    },
    [persistToken, applyAuth],
  );

  const url = Linking.useURL();

  // 1. URL listener for auth deep links
  useEffect(() => {
    if (!url) return;
    const token = parseAccessToken(url);
    const sid = parseSessionId(url);
    if (!token && !sid) return;

    setLoading(true);
    (async () => {
      try {
        if (token) {
          await processTokenOrSessionId(token, true);
        } else if (sid) {
          await processTokenOrSessionId(sid, false);
        }
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch (e) {
        console.error("[AuthProvider] URL auth failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [url, processTokenOrSessionId]);

  // 2. Restore token from storage on mount (if no deep link is being processed)
  useEffect(() => {
    (async () => {
      try {
        const currentUrl = await Linking.getInitialURL();
        if (currentUrl && (parseAccessToken(currentUrl) || parseSessionId(currentUrl))) {
          // Let the URL listener handle it
          return;
        }

        const token = await storage.secureGet<string>(TOKEN_KEY, "");
        if (token) {
          setAuthToken(token);
          try {
            const me = await api.get<{ user: AppUser }>("/auth/me");
            setUser(me.user);
          } catch {
            setAuthToken(null);
            await storage.secureRemove(TOKEN_KEY);
          }
        }
      } catch (e) {
        console.warn("[AuthProvider] Bootstrap error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signInEmail = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    await applyAuth(res);
  };

  const registerEmail = async (name: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>("/auth/register", { name, email, password });
    await applyAuth(res);
  };

  const signInGuest = async (name?: string) => {
    const res = await api.post<AuthResponse>("/auth/guest", { name: name || "Guest" });
    await applyAuth(res);
  };

  const signInGoogle = async () => {
    const redirectUrl =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin + "/"
        : Linking.createURL("auth");
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://cwwqnmnnpkyowxkfvruc.supabase.co";
    const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === "success" && result.url) {
      const token = parseAccessToken(result.url);
      if (token) {
        await processTokenOrSessionId(token, true);
        return;
      }
      const sid = parseSessionId(result.url);
      if (sid) {
        await processTokenOrSessionId(sid, false);
      }
    }
  };

  const changeSubscriptionPlan = async (plan: "basic" | "pro" | "plus") => {
    const res = await api.post<{ user: AppUser }>("/auth/subscription", { plan });
    setUser(res.user);
  };

  const signOut = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setAuthToken(null);
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  };

  const patchUser = (p: Partial<AppUser>) =>
    setUser((u) => (u ? { ...u, ...p } : u));

  return (
    <AuthContext.Provider
      value={{ user, loading, signInEmail, registerEmail, signInGuest, signInGoogle, signOut, patchUser, changeSubscriptionPlan }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
