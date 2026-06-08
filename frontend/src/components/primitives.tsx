import React from "react";
import {
  Text,
  TextProps,
  View,
  ViewStyle,
  ActivityIndicator,
  StyleSheet,
  TextStyle,
} from "react-native";
import { useTheme } from "@/src/theme/ThemeProvider";

type Variant = "h1" | "h2" | "h3" | "body" | "ui" | "uiSemi" | "label" | "small";

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

export function AppText({ variant = "ui", color, center, style, ...rest }: AppTextProps) {
  const { colors, fonts } = useTheme();
  const map: Record<Variant, TextStyle> = {
    h1: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, color: colors.textPrimary },
    h2: { fontFamily: fonts.headingSemi, fontSize: 21, lineHeight: 27, color: colors.textPrimary },
    h3: { fontFamily: fonts.uiBold, fontSize: 17, lineHeight: 23, color: colors.primary },
    body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 27, color: colors.textPrimary },
    ui: { fontFamily: fonts.uiRegular, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
    uiSemi: { fontFamily: fonts.uiSemi, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
    label: {
      fontFamily: fonts.uiSemi,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      color: colors.textMuted,
    },
    small: { fontFamily: fonts.uiRegular, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  };
  return (
    <Text
      style={[map[variant], color ? { color } : null, center ? { textAlign: "center" } : null, style]}
      {...rest}
    />
  );
}

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</View>;
}

export function Loading({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]} testID="loading-indicator">
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? (
        <AppText variant="small" style={{ marginTop: 12 }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  testID,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  testID?: string;
}) {
  return (
    <View style={styles.center} testID={testID}>
      {icon}
      <AppText variant="h3" center color={undefined} style={{ marginTop: 12 }}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="small" center style={{ marginTop: 6, maxWidth: 280 }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
