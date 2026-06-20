import React from "react";
import { ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { Screen, AppText } from "@/src/components/primitives";
import { ComingSoonCard } from "@/src/components/widgets";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string }[] = [
  { icon: "calendar-outline", title: "Daily Article" },
  { icon: "map-outline", title: "Guided Articles" },
  { icon: "list-outline", title: "Reading Plans" },
  { icon: "school-outline", title: "Learning Plans" },
  { icon: "help-circle-outline", title: "Quiz System" },
  { icon: "ribbon-outline", title: "Exam Preparation" },
  { icon: "people-outline", title: "Community" },
  { icon: "logo-discord", title: "Discord Integration" },
  { icon: "cloud-download-outline", title: "Offline Downloads" },
  { icon: "create-outline", title: "Notes & Highlights" },
  { icon: "library-outline", title: "Legal Courses" },
];

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 24, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="h1" color={colors.textPrimary}>
          {t("tab_explore")}
        </AppText>
        <AppText variant="small" style={{ marginTop: 6, marginBottom: 20 }}>
          {t("explore_subtitle")}
        </AppText>
        <View
          style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}
          testID="explore-coming-soon"
        >
          <Ionicons name="rocket-outline" size={26} color={colors.primary} />
          <AppText variant="h3" color={colors.primary} style={{ marginTop: 8 }}>
            {t("upcoming_features")}
          </AppText>
        </View>
        <TouchableOpacity onPress={() => router.push("/ai-assistant")} activeOpacity={0.7} testID="explore-ai-assistant">
          <View style={[styles.csCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.csIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="uiSemi" color={colors.textPrimary}>
                AI Legal Assistant
              </AppText>
              <AppText variant="small" style={{ marginTop: 2 }}>
                Ask questions about Constitution, Laws & Education
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {FEATURES.map((f) => (
          <ComingSoonCard key={f.title} icon={f.icon} title={f.title} pill={t("coming_soon")} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 18,
  },
  csCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  csIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
});
