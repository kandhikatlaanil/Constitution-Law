import React, { useCallback, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { useReader } from "@/src/reader/ReaderProvider";
import { getBookmarks, removeBookmark, UserItem } from "@/src/api/content";
import { Screen, AppText, EmptyState } from "@/src/components/primitives";

export default function BookmarksScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const reader = useReader();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<UserItem[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await getBookmarks();
      setItems(res.bookmarks);
    } catch {
      /* ignore */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = (it: UserItem) => {
    if (it.kind === "section") {
      reader.openSection(it.ref_id, it.book_id);
      router.push("/(tabs)/law");
    } else {
      reader.openArticle(it.ref_id);
      router.push("/(tabs)/constitution");
    }
  };

  const remove = async (refId: string) => {
    setItems((prev) => prev.filter((x) => x.ref_id !== refId));
    try {
      await removeBookmark(refId);
    } catch {
      load();
    }
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} testID="bookmarks-back">
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="h3" color={colors.textPrimary} style={{ flex: 1, marginLeft: 6, fontSize: 18 }}>
          {t("my_bookmarks")}
        </AppText>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.ref_id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => open(item)}
            testID={`bookmark-${item.ref_id}`}
          >
            <View style={[styles.icon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons
                name={item.kind === "section" ? "document-text-outline" : "book-outline"}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="uiSemi" color={colors.primary}>
                {item.number}
              </AppText>
              <AppText variant="small" numberOfLines={1} style={{ marginTop: 2 }}>
                {item.title}
              </AppText>
              {item.subtitle ? (
                <AppText variant="small" color={colors.textMuted} numberOfLines={1} style={{ fontSize: 11 }}>
                  {item.subtitle}
                </AppText>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => remove(item.ref_id)} hitSlop={10} testID={`bookmark-remove-${item.ref_id}`}>
              <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="bookmark-outline" size={44} color={colors.textMuted} />}
            title={t("bookmarks")}
            subtitle={t("no_bookmarks")}
            testID="bookmarks-empty"
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
});
