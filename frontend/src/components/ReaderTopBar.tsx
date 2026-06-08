import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";
import { AppText } from "./primitives";

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  testID?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  langGlyph: string;
  onBack?: () => void;
  onListen: () => void;
  onSearch: () => void;
  onMenu: () => void;
  onLanguage: () => void;
  listening?: boolean;
  listenLabel: string;
  searchLabel: string;
  menuLabel: string;
}

export function ReaderTopBar({
  title,
  subtitle,
  langGlyph,
  onBack,
  onListen,
  onSearch,
  onMenu,
  onLanguage,
  listening,
  listenLabel,
  searchLabel,
  menuLabel,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const ActionBtn = ({ icon, label, onPress, active, testID }: Action) => (
    <TouchableOpacity style={styles.action} onPress={onPress} testID={testID}>
      <Ionicons name={icon} size={22} color={active ? colors.primary : colors.textPrimary} />
      <AppText variant="small" color={active ? colors.primary : colors.textSecondary} style={styles.actionLabel}>
        {label}
      </AppText>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6, backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={10} style={styles.back} testID="reader-back">
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.back} />
        )}
        <View style={{ flex: 1, paddingHorizontal: 4 }}>
          <AppText variant="h3" color={colors.textPrimary} numberOfLines={1} style={{ fontSize: 18 }}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="small" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={styles.actions}>
          <ActionBtn icon={listening ? "volume-high" : "volume-medium-outline"} label={listenLabel} onPress={onListen} active={listening} testID="topbar-listen" />
          <ActionBtn icon="search-outline" label={searchLabel} onPress={onSearch} testID="topbar-search" />
          <ActionBtn icon="menu-outline" label={menuLabel} onPress={onMenu} testID="topbar-menu" />
          <TouchableOpacity style={styles.action} onPress={onLanguage} testID="topbar-language">
            <View style={[styles.langGlyph, { borderColor: colors.primary }]}>
              <AppText variant="small" color={colors.primary} style={{ fontSize: 11 }}>
                {langGlyph}
              </AppText>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, paddingBottom: 8, paddingHorizontal: 10 },
  topRow: { flexDirection: "row", alignItems: "center" },
  back: { width: 30, alignItems: "flex-start" },
  actions: { flexDirection: "row", alignItems: "center" },
  action: { alignItems: "center", marginLeft: 12, minWidth: 30 },
  actionLabel: { fontSize: 10, marginTop: 2 },
  langGlyph: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
