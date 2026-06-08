import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { useReader } from "@/src/reader/ReaderProvider";
import { getParts, Part } from "@/src/api/content";
import { Screen, Loading, AppText } from "@/src/components/primitives";

export default function ConstitutionToc() {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const reader = useReader();
  const insets = useSafeAreaInsets();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getParts(lang);
        setParts(res.parts);
        if (res.parts[0]) setExpanded(res.parts[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, [lang]);

  const openArticle = (id: string) => {
    reader.openArticle(id);
    router.replace("/(tabs)/constitution");
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} testID="toc-close">
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="h3" color={colors.textPrimary} style={{ flex: 1, marginLeft: 6, fontSize: 18 }}>
          {t("tab_constitution")} of India
        </AppText>
        <TouchableOpacity onPress={() => router.push("/search?scope=constitution")} hitSlop={10} testID="toc-search">
          <Ionicons name="search" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {parts.length === 0 ? (
            <AppText variant="small" center style={{ marginTop: 40 }}>
              {t("no_results")}
            </AppText>
          ) : null}
          {parts.map((p) => {
            const open = expanded === p.id;
            return (
              <View key={p.id} style={{ marginBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.partRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setExpanded(open ? null : p.id)}
                  testID={`toc-part-${p.id}`}
                >
                  <AppText variant="uiSemi" color={colors.textPrimary} style={{ flex: 1 }}>
                    {p.title && p.title !== p.part_number ? `${p.part_number} – ${p.title}` : p.part_number}
                  </AppText>
                  <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {open ? (
                  <View style={[styles.articlesBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <AppText variant="small" style={{ marginBottom: 10 }}>
                      {t("articles")}
                    </AppText>
                    <View style={styles.grid}>
                      {p.articles.map((a) => {
                        const num = (a.article_number.match(/\d+/) || [a.article_number])[0];
                        return (
                          <TouchableOpacity
                            key={a.id}
                            style={[styles.tile, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                            onPress={() => openArticle(a.id)}
                            testID={`toc-article-${a.id}`}
                          >
                            <AppText variant="uiSemi" color={colors.textPrimary}>
                              {num}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                      {p.articles.length === 0 ? (
                        <AppText variant="small">—</AppText>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1 },
  partRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 16 },
  articlesBox: { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -8, padding: 16, paddingTop: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
