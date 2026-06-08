import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";
import { AppText } from "./primitives";

export function UpcomingPill({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Ionicons name="sparkles-outline" size={11} color={colors.primary} />
      <AppText variant="small" color={colors.primary} style={{ marginLeft: 4, fontSize: 11 }}>
        {label}
      </AppText>
    </View>
  );
}

export function ComingSoonCard({
  icon,
  title,
  subtitle,
  pill,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  pill: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.csCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.csIcon, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name={icon} size={22} color={colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="uiSemi" color={colors.textSecondary}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <UpcomingPill label={pill} />
    </View>
  );
}

export function SectionTitle({
  title,
  onViewAll,
  viewAllLabel,
}: {
  title: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <AppText variant="h3" color={colors.textPrimary} style={{ fontSize: 19 }}>
        {title}
      </AppText>
      {onViewAll ? (
        <TouchableOpacity onPress={onViewAll} style={styles.viewAll} hitSlop={8}>
          <AppText variant="uiSemi" color={colors.textSecondary}>
            {viewAllLabel}
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  viewAll: { flexDirection: "row", alignItems: "center" },
});
