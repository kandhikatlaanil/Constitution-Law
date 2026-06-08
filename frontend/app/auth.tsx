import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { useAuth } from "@/src/auth/AuthProvider";
import { AppText, Screen } from "@/src/components/primitives";
import { ApiError } from "@/src/api/client";

export default function AuthScreen() {
  const { colors, fonts } = useTheme();
  const { t } = useI18n();
  const { signInEmail, registerEmail, signInGuest, signInGoogle } = useAuth();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "form" | "google" | "guest">(null);
  const [error, setError] = useState("");

  const go = () => router.replace("/(tabs)/home");

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError(t("error_generic"));
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError(t("error_generic"));
      return;
    }
    setBusy("form");
    try {
      if (mode === "signup") await registerEmail(name.trim(), email.trim().toLowerCase(), password);
      else await signInEmail(email.trim().toLowerCase(), password);
      go();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error_generic"));
    } finally {
      setBusy(null);
    }
  };

  const guest = async () => {
    setError("");
    setBusy("guest");
    try {
      await signInGuest();
      go();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error_generic"));
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setError("");
    setBusy("google");
    try {
      await signInGoogle();
      go();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error_generic"));
    } finally {
      setBusy(null);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontFamily: fonts.uiRegular }];

  return (
    <Screen>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <Image source={require("@/assets/images/app-image.png")} style={styles.brandImg} resizeMode="cover" />
          <AppText variant="h1" center color={colors.textPrimary} style={{ marginTop: 18 }}>
            {t("app_name")}
          </AppText>
          <AppText variant="small" center style={{ marginTop: 8, maxWidth: 300 }}>
            {t("auth_tagline")}
          </AppText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText variant="h2" color={colors.textPrimary} style={{ marginBottom: 18 }}>
            {mode === "signin" ? t("welcome_back") : t("create_account")}
          </AppText>

          {mode === "signup" ? (
            <View style={styles.field}>
              <AppText variant="label">{t("full_name")}</AppText>
              <TextInput
                style={inputStyle}
                value={name}
                onChangeText={setName}
                placeholder={t("full_name")}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                testID="auth-name"
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <AppText variant="label">{t("email")}</AppText>
            <TextInput
              style={inputStyle}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="auth-email"
            />
          </View>

          <View style={styles.field}>
            <AppText variant="label">{t("password")}</AppText>
            <TextInput
              style={inputStyle}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              testID="auth-password"
            />
          </View>

          {error ? (
            <AppText variant="small" color={colors.danger} style={{ marginBottom: 12 }} testID="auth-error">
              {error}
            </AppText>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={submit}
            disabled={busy !== null}
            testID="auth-submit"
          >
            {busy === "form" ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <AppText variant="uiBold" color={colors.background} style={{ fontSize: 16 }}>
                {mode === "signin" ? t("sign_in") : t("sign_up")}
              </AppText>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <AppText variant="small" style={{ marginHorizontal: 10 }}>
              {t("or")}
            </AppText>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.border }]}
            onPress={google}
            disabled={busy !== null}
            testID="auth-google"
          >
            {busy === "google" ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={colors.textPrimary} style={{ marginRight: 10 }} />
                <AppText variant="uiSemi" color={colors.textPrimary}>
                  {t("continue_with_google")}
                </AppText>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.border, marginTop: 10 }]}
            onPress={guest}
            disabled={busy !== null}
            testID="auth-guest"
          >
            {busy === "guest" ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <AppText variant="uiSemi" color={colors.textSecondary}>
                  {t("continue_as_guest")}
                </AppText>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            setError("");
            setMode(mode === "signin" ? "signup" : "signin");
          }}
          style={{ marginTop: 20 }}
          testID="auth-toggle-mode"
        >
          <AppText variant="ui" center color={colors.primary}>
            {mode === "signin" ? t("no_account") : t("have_account")}
          </AppText>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandWrap: { alignItems: "center", marginBottom: 28 },
  brandImg: { width: 84, height: 84, borderRadius: 22 },
  card: { borderWidth: 1, borderRadius: 20, padding: 20 },
  field: { marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginTop: 6,
  },
  primaryBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  line: { flex: 1, height: 1 },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
});
