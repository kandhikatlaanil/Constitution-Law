import React, { useCallback, useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { useAuth } from "@/src/auth/AuthProvider";
import { useReader } from "@/src/reader/ReaderProvider";
import { getHome, HomeData, UserItem } from "@/src/api/content";
import { Screen, AppText } from "@/src/components/primitives";
import { SectionTitle, ComingSoonCard } from "@/src/components/widgets";

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const reader = useReader();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getHome();
      setData(d);
    } catch {
      /* ignore */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("good_morning");
    if (h < 17) return t("good_afternoon");
    return t("good_evening");
  };

  const openArticle = (id: string) => {
    reader.openArticle(id);
    router.push("/(tabs)/constitution");
  };
  const openSection = (id: string, bookId?: string) => {
    reader.openSection(id, bookId);
    router.push("/(tabs)/law");
  };
  const openItem = (it: UserItem) =>
    it.kind === "article" ? openArticle(it.ref_id) : openSection(it.ref_id, it.book_id);

  const stats = data?.stats;
  const name = user?.name || t("citizen");

  const recentCard = (it: UserItem) => (
    <TouchableOpacity
      key={it.ref_id}
      style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => openItem(it)}
      testID={`recent-${it.ref_id}`}
    >
      <AppText variant="h3" color={colors.primary} numberOfLines={1}>
        {it.number}
      </AppText>
      <AppText variant="small" numberOfLines={2} style={{ marginTop: 4 }}>
        {it.title}
      </AppText>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Brand header */}
        <View style={styles.brandRow}>
          <Image source={require("@/assets/images/app-image.png")} style={styles.brandIcon} />
          <AppText variant="h2" color={colors.textPrimary} style={{ flex: 1, marginLeft: 10, fontSize: 19 }} numberOfLines={1}>
            The Constitution of India
          </AppText>
          <TouchableOpacity onPress={() => router.push("/search?scope=constitution")} hitSlop={8} testID="home-search">
            <Ionicons name="search" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Hero greeting */}
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <AppText variant="h2" color={colors.textPrimary} style={{ fontSize: 20 }}>
              {greeting()}, {name}!
            </AppText>
            <AppText variant="small" style={{ marginTop: 8, lineHeight: 19 }}>
              {t("home_subtitle")}
            </AppText>
          </View>
          <Image source={require("@/assets/images/app-image.png")} style={styles.heroImg} resizeMode="cover" />
        </View>

        {/* Continue reading */}
        {data?.continue_reading ? (
          <TouchableOpacity
            style={[styles.continueCard, { backgroundColor: colors.primary }]}
            onPress={() => openItem(data.continue_reading!)}
            testID="continue-reading"
          >
            <View style={{ flex: 1 }}>
              <AppText variant="label" color={colors.background} style={{ opacity: 0.8 }}>
                {t("continue_reading")}
              </AppText>
              <AppText variant="h3" color={colors.background} style={{ marginTop: 4 }} numberOfLines={1}>
                {data.continue_reading.number}
              </AppText>
              <AppText variant="small" color={colors.background} style={{ opacity: 0.85 }} numberOfLines={1}>
                {data.continue_reading.title}
              </AppText>
            </View>
            <Ionicons name="play-circle" size={40} color={colors.background} />
          </TouchableOpacity>
        ) : null}

        {/* Recently opened articles */}
        {data && data.constitution_recents.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <SectionTitle title={t("recently_opened_articles")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {data.constitution_recents.map(recentCard)}
            </ScrollView>
          </View>
        ) : null}

        {/* Recently opened sections */}
        {data && data.law_recents.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <SectionTitle title={t("recently_opened_sections")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {data.law_recents.map(recentCard)}
            </ScrollView>
          </View>
        ) : null}

        {/* Plan tiles */}
        <View style={{ marginTop: 24 }}>
          <PlanRow
            title={t("articles")}
            desc="Explore all Articles of the Constitution arranged for easy learning."
            tileColor={colors.tileArticles}
            icon="document-text-outline"
            onPress={() => router.push("/constitution-toc")}
          />
          <PlanRow
            title={t("tab_constitution")}
            desc="Read the Preamble, Parts & Articles of the Constitution."
            tileColor={colors.tileConstitution}
            icon="book-outline"
            onPress={() => router.push("/(tabs)/constitution")}
          />
          <PlanRow
            title={t("tab_law")}
            desc="Read and listen to Indian Laws, section by section."
            tileColor={colors.tileDuties}
            icon="scale-outline"
            onPress={() => router.push("/(tabs)/law")}
          />
        </View>

        {/* Stats strip */}
        {stats ? (
          <View style={[styles.statsStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Stat icon="book-outline" label={t("recently_opened_articles")} value={`${stats.articles_read}`} />
            <Stat icon="bookmark-outline" label={t("bookmarks")} value={`${stats.bookmarks}`} />
            <Stat icon="flame-outline" label={t("continue_reading")} value={`${stats.streak_days}`} />
            <Stat icon="trophy-outline" label={t("view_all")} value={`${stats.goal_progress}%`} />
          </View>
        ) : null}

        {/* Achievements (decorative / upcoming) */}
        <View style={{ marginTop: 24 }}>
          <SectionTitle title="Achievements & Badges" />
          <View style={styles.badgeRow}>
            {[
              { c: "#B5453C", icon: "star" },
              { c: "#C2A24A", icon: "ribbon" },
              { c: "#5E7E60", icon: "school" },
              { c: "#3F6FA3", icon: "trophy" },
            ].map((b, i) => (
              <View key={i} style={styles.badge}>
                <View style={[styles.badgeCircle, { backgroundColor: b.c }]}>
                  <Ionicons name={b.icon as any} size={22} color="#FFFFFF" />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming */}
        <View style={{ marginTop: 24 }}>
          <SectionTitle title={t("upcoming_features")} />
          <ComingSoonCard icon="sparkles-outline" title="AI Legal Assistant" pill={t("coming_soon")} />
          <ComingSoonCard icon="calendar-outline" title="Daily Article & Reading Plans" pill={t("coming_soon")} />
          <ComingSoonCard icon="help-circle-outline" title="Quiz & Exam Preparation" pill={t("coming_soon")} />
          <ComingSoonCard icon="medal-outline" title="Streaks, Badges & Achievements" pill={t("coming_soon")} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function PlanRow({
  title,
  desc,
  tileColor,
  icon,
  onPress,
}: {
  title: string;
  desc: string;
  tileColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.planRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      testID={`plan-${title}`}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <AppText variant="h3" color={colors.textPrimary} style={{ fontSize: 17 }}>
          {title}
        </AppText>
        <AppText variant="small" style={{ marginTop: 4 }}>
          {desc}
        </AppText>
      </View>
      <View style={[styles.planTile, { backgroundColor: tileColor }]}>
        <Ionicons name={icon} size={24} color="#FFFFFF" />
        <AppText variant="small" color="#FFFFFF" style={{ marginTop: 4, fontSize: 11 }} numberOfLines={1}>
          {title}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <AppText variant="h3" color={colors.textPrimary} style={{ marginTop: 4, fontSize: 17 }}>
        {value}
      </AppText>
      <AppText variant="small" numberOfLines={1} style={{ fontSize: 10 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  brandIcon: { width: 32, height: 32, borderRadius: 8 },
  hero: { flexDirection: "row", borderWidth: 1, borderRadius: 18, padding: 16, overflow: "hidden" },
  heroImg: { width: 86, height: 96, borderRadius: 10 },
  continueCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  recentCard: {
    width: 160,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginRight: 12,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  planTile: {
    width: 96,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  statsStrip: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 20,
  },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  badgeRow: { flexDirection: "row", justifyContent: "space-between" },
  badge: { alignItems: "center", flex: 1 },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
