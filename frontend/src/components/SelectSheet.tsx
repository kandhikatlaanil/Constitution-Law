import React from "react";
import { Modal, View, ScrollView, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";
import { AppText } from "./primitives";

export interface SelectOption {
  key: string;
  label: string;
  sublabel?: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedKey?: string | null;
  onSelect: (key: string) => void;
  onClose: () => void;
  testID?: string;
}

export function SelectSheet({ visible, title, options, selectedKey, onSelect, onClose, testID }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} testID={testID}>
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.headerRow}>
          <AppText variant="h3" color={colors.textPrimary}>
            {title}
          </AppText>
          <TouchableOpacity onPress={onClose} hitSlop={10} testID="select-sheet-close">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          {options.map((opt) => {
            const active = opt.key === selectedKey;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.option,
                  { borderColor: colors.border },
                  active && { backgroundColor: colors.surfaceElevated },
                ]}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
                testID={`select-option-${opt.key}`}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="uiSemi" color={active ? colors.primary : colors.textPrimary}>
                    {opt.label}
                  </AppText>
                  {opt.sublabel ? (
                    <AppText variant="small" style={{ marginTop: 2 }}>
                      {opt.sublabel}
                    </AppText>
                  ) : null}
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
