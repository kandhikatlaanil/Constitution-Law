import React, { useState, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { AppText } from "./primitives";
import { SelectSheet } from "./SelectSheet";
import { RATE_OPTIONS, VoiceOption } from "@/src/tts/useTTS";

interface Props {
  visible: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  togglePlay: () => void;
  stop: () => void;
  progress: number;
  rate: number;
  setRate: (r: number) => void;
  voices: VoiceOption[];
  voiceId?: string;
  setVoiceId: (id?: string) => void;
  language?: string;
}

export function ListenBar({
  visible,
  isPlaying,
  isPaused,
  togglePlay,
  stop,
  progress,
  rate,
  setRate,
  voices,
  voiceId,
  setVoiceId,
  language,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [voiceSheet, setVoiceSheet] = useState(false);

  const langVoices = useMemo(() => {
    const prefix = (language || "en").slice(0, 2).toLowerCase();
    const filtered = voices.filter((v) => v.language?.toLowerCase().startsWith(prefix));
    return filtered.length ? filtered : voices;
  }, [voices, language]);

  const voiceOptions = useMemo(
    () => [
      { key: "__default__", label: t("default_voice") },
      ...langVoices.map((v) => ({ key: v.identifier, label: v.name, sublabel: v.language })),
    ],
    [langVoices, t],
  );

  if (!visible) return null;
  const selectedVoiceName =
    voiceId ? langVoices.find((v) => v.identifier === voiceId)?.name || t("voice") : t("default_voice");

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} testID="listen-bar">
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` }]}
        />
      </View>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          onPress={togglePlay}
          style={[styles.playBtn, { borderColor: colors.primary }]}
          testID="listen-toggle"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={22}
            color={colors.primary}
            style={!isPlaying ? { marginLeft: 2 } : undefined}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={stop} style={[styles.iconBtn, { borderColor: colors.border }]} testID="listen-stop">
          <Ionicons name="stop" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.rateGroup}>
          {RATE_OPTIONS.map((r) => {
            const active = Math.abs(r - rate) < 0.01;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRate(r)}
                style={[
                  styles.rateChip,
                  { borderColor: active ? colors.primary : colors.border },
                  active && { backgroundColor: colors.primary },
                ]}
                testID={`listen-rate-${r}`}
              >
                <AppText variant="small" color={active ? colors.background : colors.textSecondary}>
                  {r}x
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => setVoiceSheet(true)}
          style={[styles.voiceBtn, { borderColor: colors.border }]}
          testID="listen-voice"
        >
          <Ionicons name="mic-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <AppText variant="small" style={{ marginTop: 6 }} numberOfLines={1}>
        {isPaused ? t("pause") : isPlaying ? t("listen") : t("listen")} · {selectedVoiceName}
      </AppText>

      <SelectSheet
        visible={voiceSheet}
        title={t("voice")}
        options={voiceOptions}
        selectedKey={voiceId || "__default__"}
        onSelect={(k) => setVoiceId(k === "__default__" ? undefined : k)}
        onClose={() => setVoiceSheet(false)}
        testID="voice-sheet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 12 },
  progressFill: { height: 4, borderRadius: 2 },
  controlsRow: { flexDirection: "row", alignItems: "center" },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rateGroup: { flexDirection: "row", flex: 1, flexWrap: "wrap" },
  rateChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
