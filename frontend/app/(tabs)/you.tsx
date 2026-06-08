import React, { useState } from "react";
import { ScrollView, View, TouchableOpacity, StyleSheet, Switch, Image, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { useAuth } from "@/src/auth/AuthProvider";
import { updateSettings } from "@/src/api/content";
import { LangCode } from "@/src/i18n/translations";
import { Screen, AppText } from "@/src/components/primitives";
import { SelectSheet } from "@/src/components/SelectSheet";

export default function YouScreen() {
  const { colors, scheme, setScheme } = useTheme();
  const { t, lang, setLang, meta, allLanguages } = useI18n();
  const { user, signOut, patchUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [notif, setNotif] = useState<boolean>(user?.notifications ?? true);
  const [langSheet, setLangSheet] = useState(false);

  const changeTheme = (next: "light" | "dark") => {
    setScheme(next);
    patchUser({ theme: next });
    updateSettings({ theme: next }).catch(() => {});
  };
  const changeLang = (code: string) => {
    setLang(code as LangCode);
    patchUser({ language: code });
    updateSettings({ language: code }).catch(() => {});
  };
  const toggleNotif = (v: boolean) => {
    setNotif(v);
    patchUser({ notifications: v });
    updateSettings({ notifications: v }).catch(() => {});
  };
  const logout = async () => {
    await signOut();
    router.replace("/auth");
  };

  const initial = (user?.name || "G").trim().charAt(0).toUpperCase();

  const Row = ({
    icon,
    label,
    value,
    onPress,
    right,
    testID,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress?: () => void;
    right?: React.ReactNode;
    testID?: string;
  }) => (
    <TouchableOpacity
      style={[styles.row, { borderColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !right}
      activeOpacity={onPress ? 0.6 : 1}
      testID={testID}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <AppText variant="uiSemi" color={colors.textPrimary} style={{ flex: 1 }}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="small" color={colors.textSecondary} style={{ marginRight: 6 }}>
          {value}
        </AppText>
      ) : null}
      {right ? right : onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </TouchableOpacity>
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="h1" color={colors.textPrimary} style={{ marginBottom: 16 }}>
          {t("tab_you")}
        </AppText>

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }]}>
              <AppText variant="h1" color={colors.background}>
                {initial}
              </AppText>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 14 }}>
            <AppText variant="h2" color={colors.textPrimary} style={{ fontSize: 19 }} numberOfLines={1}>
              {user?.name || t("guest_user")}
            </AppText>
            <AppText variant="small" numberOfLines={1}>
              {user?.email || (user?.provider === "guest" ? t("guest_user") : "")}
            </AppText>
            <View style={[styles.providerPill, { borderColor: colors.border }]}>
              <AppText variant="small" color={colors.primary} style={{ fontSize: 11 }}>
                {meta.native} · {scheme === "dark" ? t("dark_mode") : t("light_mode")}
              </AppText>
            </View>
          </View>
        </View>

        {/* Theme */}
        <AppText variant="label" style={{ marginTop: 22, marginBottom: 10 }}>
          {t("theme")}
        </AppText>
        <View style={[styles.themeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(["light", "dark"] as const).map((s) => {
            const active = scheme === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.themeOption, active && { backgroundColor: colors.primary }]}
                onPress={() => changeTheme(s)}
                testID={`theme-${s}`}
              >
                <Ionicons
                  name={s === "light" ? "sunny-outline" : "moon-outline"}
                  size={18}
                  color={active ? colors.background : colors.textSecondary}
                />
                <AppText variant="uiSemi" color={active ? colors.background : colors.textSecondary} style={{ marginLeft: 8 }}>
                  {s === "light" ? t("light_mode") : t("dark_mode")}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Settings */}
        <AppText variant="label" style={{ marginTop: 22, marginBottom: 10 }}>
          {t("settings")}
        </AppText>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row icon="language-outline" label={t("language")} value={meta.native} onPress={() => setLangSheet(true)} testID="settings-language" />
          <Row
            icon="notifications-outline"
            label={t("notifications")}
            right={
              <Switch
                value={notif}
                onValueChange={toggleNotif}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
                testID="notif-switch"
              />
            }
          />
          <Row icon="bookmark-outline" label={t("my_bookmarks")} onPress={() => router.push("/bookmarks")} testID="settings-bookmarks" />
        </View>

        {/* About */}
        <AppText variant="label" style={{ marginTop: 22, marginBottom: 10 }}>
          {t("about")}
        </AppText>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row icon="information-circle-outline" label={t("version")} value="1.0.0" />
          <Row
            icon="shield-checkmark-outline"
            label={t("privacy_policy")}
            onPress={() => Alert.alert(t("privacy_policy"), "Your data stays private. Content is provided for educational purposes.")}
          />
          <Row
            icon="document-text-outline"
            label={t("terms")}
            onPress={() => Alert.alert(t("terms"), "Use this app for learning and reference. Not legal advice.")}
          />
          <Row
            icon="mail-outline"
            label={t("contact_us")}
            onPress={() => Linking.openURL("mailto:support@constitutionlaw.app")}
          />
        </View>

        <TouchableOpacity
          style={[styles.logout, { borderColor: colors.danger }]}
          onPress={logout}
          testID="logout-btn"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
          <AppText variant="uiBold" color={colors.danger}>
            {t("logout")}
          </AppText>
        </TouchableOpacity>
      </ScrollView>

      <SelectSheet
        visible={langSheet}
        title={t("language")}
        options={allLanguages.map((l) => ({ key: l.code, label: l.native, sublabel: l.label }))}
        selectedKey={lang}
        onSelect={changeLang}
        onClose={() => setLangSheet(false)}
        testID="you-lang-sheet"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  providerPill: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  themeRow: { flexDirection: "row", borderWidth: 1, borderRadius: 14, padding: 5 },
  themeOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10 },
  group: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 26,
  },
});
