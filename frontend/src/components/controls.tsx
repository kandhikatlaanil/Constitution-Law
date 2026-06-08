import React from "react";
import { View, TouchableOpacity, StyleSheet, Switch, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";
import { AppText } from "./primitives";

export function DropdownButton({
  label,
  icon,
  onPress,
  style,
  testID,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
      onPress={onPress}
      testID={testID}
      activeOpacity={0.7}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.textSecondary} style={{ marginRight: 8 }} /> : null}
      <AppText variant="uiSemi" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </AppText>
      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export function PlayCircle({ playing, onPress }: { playing: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.play, { borderColor: colors.textPrimary }]}
      onPress={onPress}
      testID="play-circle"
      activeOpacity={0.8}
    >
      <Ionicons
        name={playing ? "pause" : "play"}
        size={24}
        color={colors.textPrimary}
        style={!playing ? { marginLeft: 3 } : undefined}
      />
    </TouchableOpacity>
  );
}

export function AutoScrollToggle({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.autoRow}>
      <AppText variant="uiSemi" color={colors.textSecondary} style={{ marginRight: 8 }}>
        {label}
      </AppText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
        testID="auto-scroll-toggle"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  autoRow: { flexDirection: "row", alignItems: "center" },
});
