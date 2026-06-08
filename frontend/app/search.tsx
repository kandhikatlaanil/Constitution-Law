import React, { useEffect, useRef, useState } from "react";
import { View, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { useReader } from "@/src/reader/ReaderProvider";
import { searchConstitution, searchLaw, SearchResult } from "@/src/api/content";
import { Screen, AppText } from "@/src/components/primitives";

export default function SearchScreen() {
  const { colors, fonts } = useTheme();
  const { t, lang } = useI18n();
  const reader = useReader();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scope?: string }>();
  const scope = params.scope === "law" ? "law" : "constitution";

  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) {
      setResults([]);
      setTouched(false);
      return;
    }
    setLoading(true);
    setTouched(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = scope === "law" ? await searchLaw(q, lang) : await searchConstitution(q, lang);
        setResults(res.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, scope, lang]);

  const open = (id: string) => {
    if (scope === "law") {
      reader.openSection(id);
      router.replace("/(tabs)/law");
    } else {
      reader.openArticle(id);
      router.replace("/(tabs)/constitution");
    }
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} testID="search-close">
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary, fontFamily: fonts.uiRegular }]}
            value={q}
            onChangeText={setQ}
            placeholder={scope === "law" ? `${t("search")} — ${t("tab_law")}` : `${t("search")} — ${t("tab_constitution")}`}
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="search"
            testID="search-input"
          />
          {q ? (
            <TouchableOpacity onPress={() => setQ("")} hitSlop={8} testID="search-clear">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resultRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => open(item.id)}
              testID={`search-result-${item.id}`}
            >
              <View style={[styles.resIcon, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name={scope === "law" ? "document-text-outline" : "book-outline"} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="uiSemi" color={colors.primary}>
                  {item.number}
                </AppText>
                <AppText variant="small" numberOfLines={2} style={{ marginTop: 2 }}>
                  {item.title}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            touched ? (
              <AppText variant="small" center style={{ marginTop: 40 }}>
                {t("no_results")}
              </AppText>
            ) : (
              <View style={{ alignItems: "center", marginTop: 50 }}>
                <Ionicons name="search-outline" size={40} color={colors.textMuted} />
                <AppText variant="small" center style={{ marginTop: 12, maxWidth: 260 }}>
                  {t("search_hint")}
                </AppText>
              </View>
            )
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1 },
  inputWrap: { flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, marginLeft: 8, height: 44 },
  input: { flex: 1, marginLeft: 8, fontSize: 15 },
  resultRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  resIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
});
