import React, { useState } from "react";
import { ScrollView, View, TouchableOpacity, StyleSheet, Switch, Image, Linking, Alert, Modal, Pressable, ActivityIndicator } from "react-native";
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
  const { colors, scheme, setScheme, fonts } = useTheme();
  const { t, lang, setLang, meta, allLanguages } = useI18n();
  const { user, signOut, patchUser, changeSubscriptionPlan } = useAuth();
  const insets = useSafeAreaInsets();
  const [notif, setNotif] = useState<boolean>(user?.notifications ?? true);
  const [langSheet, setLangSheet] = useState(false);
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const userPlan = user?.subscription_plan || "basic";

  const changeTheme = (next: "light" | "dark") => {
    setScheme(next);
    patchUser({ theme: next });
    updateSettings({ theme: next }).catch(() => {});
  };
  const changeLang = (code: string) => {
    const plan = user?.subscription_plan || "basic";
    if (plan !== "plus") {
      Alert.alert(
        t("subscription_required") || "Subscription Required",
        t("lang_upgrade_msg") || "Changing language is available only on the Plus plan. Please upgrade in the You settings screen."
      );
      return;
    }
    setLang(code as LangCode);
    patchUser({ language: code });
    updateSettings({ language: code }).catch(() => {});
  };

  const getPlanBadgeColor = (plan: string | undefined) => {
    const p = (plan || "basic").toLowerCase();
    if (p === "plus") return "#E59866";
    if (p === "pro") return colors.primary;
    return colors.textMuted;
  };

  const handlePlanChange = async (targetPlan: "basic" | "pro" | "plus") => {
    setBusy("subscription");
    setTimeout(async () => {
      try {
        await changeSubscriptionPlan(targetPlan);
        setBusy(null);
        setSubModalVisible(false);
        const curPlan = user?.subscription_plan || "basic";
        if (targetPlan === "basic") {
          if (curPlan === "plus") {
            Alert.alert("Subscription Cancelled", "Your subscription has been cancelled and downgraded to the Free tier.");
          } else {
            Alert.alert("Plan Downgraded", "Your plan has been successfully downgraded to the Basic Free tier.");
          }
        } else {
          Alert.alert("Checkout Successful", `Thank you for upgrading! You now have active access to the ${targetPlan.toUpperCase()} plan.`);
        }
      } catch (err) {
        setBusy(null);
        Alert.alert("Error", "Failed to update subscription. Please try again.");
      }
    }, 2000);
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <View style={[styles.providerPill, { borderColor: colors.border, marginTop: 0 }]}>
                <AppText variant="small" color={colors.primary} style={{ fontSize: 11 }}>
                  {meta.native} · {scheme === "dark" ? t("dark_mode") : t("light_mode")}
                </AppText>
              </View>
              <View style={[styles.planBadge, { backgroundColor: getPlanBadgeColor(userPlan) }]}>
                <AppText variant="small" color="#FFFFFF" style={{ fontSize: 10, fontFamily: fonts.uiBold, textTransform: "uppercase" }}>
                  {userPlan}
                </AppText>
              </View>
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

        {/* Subscription */}
        <AppText variant="label" style={{ marginTop: 22, marginBottom: 10 }}>
          Subscription Plan
        </AppText>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon="card-outline"
            label="Manage Subscription"
            value={userPlan.toUpperCase()}
            onPress={() => setSubModalVisible(true)}
            testID="settings-subscription"
          />
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

      <Modal visible={subModalVisible} transparent animationType="slide" onRequestClose={() => !busy && setSubModalVisible(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => !busy && setSubModalVisible(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: "90%" }]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.headerRow}>
            <AppText variant="h2" color={colors.textPrimary}>
              Subscription Plans
            </AppText>
            {!busy && (
              <TouchableOpacity onPress={() => setSubModalVisible(false)} hitSlop={10} testID="subscription-close">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {busy === "subscription" ? (
            <View style={{ paddingVertical: 40, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText variant="uiSemi" style={{ marginTop: 16 }}>
                Processing payment...
              </AppText>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Pricing Cards */}
              <View style={[
                styles.planCard,
                { borderColor: colors.border, backgroundColor: colors.surface },
                userPlan === "basic" && { borderColor: colors.primary, borderWidth: 2 }
              ]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <AppText variant="h3" color={colors.textPrimary}>Basic</AppText>
                  {userPlan === "basic" && (
                    <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
                      <AppText variant="small" color={colors.background} style={{ fontSize: 10, fontFamily: fonts.uiBold }}>CURRENT</AppText>
                    </View>
                  )}
                </View>
                <AppText variant="uiSemi" color={colors.primary} style={{ marginTop: 2, fontSize: 16 }}>Free</AppText>
                <View style={{ marginTop: 8, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <AppText variant="small" color={colors.textSecondary}>Read e-books</AppText>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="close-circle" size={16} color={colors.danger} />
                    <AppText variant="small" color={colors.textMuted}>Listen to e-books (TTS)</AppText>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="close-circle" size={16} color={colors.danger} />
                    <AppText variant="small" color={colors.textMuted}>Change translation language</AppText>
                  </View>
                </View>
              </View>

              <View style={[
                styles.planCard,
                { borderColor: colors.border, backgroundColor: colors.surface },
                userPlan === "pro" && { borderColor: colors.primary, borderWidth: 2 }
              ]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <AppText variant="h3" color={colors.textPrimary}>Pro</AppText>
                  {userPlan === "pro" && (
                    <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
                      <AppText variant="small" color={colors.background} style={{ fontSize: 10, fontFamily: fonts.uiBold }}>CURRENT</AppText>
                    </View>
                  )}
                </View>
                <AppText variant="uiSemi" color={colors.primary} style={{ marginTop: 2, fontSize: 16 }}>$4.99 / mo</AppText>
                <View style={{ marginTop: 8, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <AppText variant="small" color={colors.textSecondary}>Read e-books</AppText>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <AppText variant="small" color={colors.textSecondary}>Listen to e-books (TTS)</AppText>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="close-circle" size={16} color={colors.danger} />
                    <AppText variant="small" color={colors.textMuted}>Change translation language</AppText>
                  </View>
                </View>
              </View>

              <View style={[
                styles.planCard,
                { borderColor: colors.border, backgroundColor: colors.surface },
                userPlan === "plus" && { borderColor: colors.primary, borderWidth: 2 }
              ]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <AppText variant="h3" color={colors.textPrimary}>Plus</AppText>
                  {userPlan === "plus" && (
                    <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
                      <AppText variant="small" color={colors.background} style={{ fontSize: 10, fontFamily: fonts.uiBold }}>CURRENT</AppText>
                    </View>
                  )}
                </View>
                <AppText variant="uiSemi" color={colors.primary} style={{ marginTop: 2, fontSize: 16 }}>$9.99 / mo</AppText>
                <View style={{ marginTop: 8, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <AppText variant="small" color={colors.textSecondary}>Read e-books</AppText>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <AppText variant="small" color={colors.textSecondary}>Listen to e-books (TTS)</AppText>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <AppText variant="small" color={colors.textSecondary}>Change translation language</AppText>
                  </View>
                </View>
              </View>

              {/* Dynamic Action Buttons */}
              <View style={{ marginTop: 16, gap: 12 }}>
                {userPlan === "basic" && (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handlePlanChange("pro")}
                      testID="btn-upgrade-pro"
                    >
                      <AppText variant="uiBold" color={colors.background}>Upgrade to Pro ($4.99/mo)</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handlePlanChange("plus")}
                      testID="btn-upgrade-plus"
                    >
                      <AppText variant="uiBold" color={colors.background}>Upgrade to Plus ($9.99/mo)</AppText>
                    </TouchableOpacity>
                  </>
                )}

                {userPlan === "pro" && (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handlePlanChange("plus")}
                      testID="btn-upgrade-plus"
                    >
                      <AppText variant="uiBold" color={colors.background}>Upgrade to Plus ($9.99/mo)</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.outlineBtn, { borderColor: colors.border }]}
                      onPress={() => handlePlanChange("basic")}
                      testID="btn-downgrade-basic"
                    >
                      <AppText variant="uiBold" color={colors.textSecondary}>Downgrade to Basic (Free)</AppText>
                    </TouchableOpacity>
                  </>
                )}

                {userPlan === "plus" && (
                  <>
                    <TouchableOpacity
                      style={[styles.outlineBtn, { borderColor: colors.border }]}
                      onPress={() => handlePlanChange("pro")}
                      testID="btn-downgrade-pro"
                    >
                      <AppText variant="uiBold" color={colors.textSecondary}>Downgrade to Pro ($4.99/mo)</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.outlineBtn, { borderColor: colors.danger }]}
                      onPress={() => handlePlanChange("basic")}
                      testID="btn-cancel-subscription"
                    >
                      <AppText variant="uiBold" color={colors.danger}>Cancel Subscription</AppText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  providerPill: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 8 },
  planBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
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
  backdrop: { flex: 1 },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  handleRow: { alignItems: "center", paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
