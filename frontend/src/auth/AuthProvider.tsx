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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = "auth_token";

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

  const processSessionId = useCallback(
    async (sessionId: string) => {
      const res = await api.post<AuthResponse>("/auth/google/session", { session_id: sessionId });
      await applyAuth(res);
    },
    [applyAuth],
  );

  // Bootstrap: process web session_id first, else restore stored token.
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const sid = parseSessionId(window.location.hash) || parseSessionId(window.location.search);
          if (sid) {
            await processSessionId(sid);
            window.history.replaceState(null, "", window.location.pathname);
            setLoading(false);
            return;
          }
        } else {
          const initialUrl = await Linking.getInitialURL();
          const sid = initialUrl ? parseSessionId(initialUrl) : null;
          if (sid) {
            await processSessionId(sid);
            setLoading(false);
            return;
          }
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
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
    // hot deep-link listener (mobile)
    const sub = Linking.addEventListener("url", ({ url }) => {
      const sid = parseSessionId(url);
      if (sid) processSessionId(sid).catch(() => {});
    });
    return () => sub.remove();
  }, [processSessionId]);

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
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === "success" && result.url) {
      const sid = parseSessionId(result.url);
      if (sid) await processSessionId(sid);
    }
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
      value={{ user, loading, signInEmail, registerEmail, signInGuest, signInGoogle, signOut, patchUser }}
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
