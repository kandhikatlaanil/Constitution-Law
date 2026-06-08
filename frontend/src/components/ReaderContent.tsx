import React, { useMemo, useRef, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, Text, LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/ThemeProvider";
import { AppText } from "./primitives";
import { Segment, RefItem } from "@/src/api/content";

interface BlockGroup {
  block_id: number;
  type: Segment["type"];
  marker: string | null;
  segs: Segment[];
}

interface Props {
  number: string;
  title: string;
  chapterLabel?: string | null;
  segments: Segment[];
  related: RefItem[];
  relatedLabel: string;
  activeSegId: number | null;
  autoScroll: boolean;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onShare: () => void;
  onSelectRelated: (id: string) => void;
}

export function ReaderContent({
  number,
  title,
  chapterLabel,
  segments,
  related,
  relatedLabel,
  activeSegId,
  autoScroll,
  bookmarked,
  onToggleBookmark,
  onShare,
  onSelectRelated,
}: Props) {
  const { colors, fonts } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<number, number>>({});

  const groups: BlockGroup[] = useMemo(() => {
    const out: BlockGroup[] = [];
    let cur: BlockGroup | null = null;
    for (const s of segments) {
      if (!cur || cur.block_id !== s.block_id) {
        cur = { block_id: s.block_id, type: s.type, marker: s.marker, segs: [s] };
        out.push(cur);
      } else {
        cur.segs.push(s);
      }
    }
    return out;
  }, [segments]);

  const segToBlock = useMemo(() => {
    const m: Record<number, number> = {};
    segments.forEach((s) => (m[s.seg_id] = s.block_id));
    return m;
  }, [segments]);

  // Auto-scroll to active block.
  useEffect(() => {
    if (!autoScroll || activeSegId == null) return;
    const block = segToBlock[activeSegId];
    const y = offsets.current[block];
    if (y != null && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 110), animated: true });
    }
  }, [activeSegId, autoScroll, segToBlock]);

  const onBlockLayout = (blockId: number) => (e: LayoutChangeEvent) => {
    offsets.current[blockId] = e.nativeEvent.layout.y;
  };

  const segColor = (seg: Segment, base: string) => {
    if (seg.seg_id === activeSegId) return { color: colors.ttsActiveText, backgroundColor: colors.ttsActiveBg };
    if (activeSegId != null && seg.seg_id < activeSegId) return { color: colors.ttsReadText };
    return { color: base };
  };

  const renderRuns = (seg: Segment) =>
    seg.runs.map((r, i) => (
      <Text
        key={i}
        style={{
          fontFamily: r.bold ? fonts.bodyBold : fonts.body,
          fontStyle: r.italic ? "italic" : "normal",
        }}
      >
        {r.text}
      </Text>
    ));

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
      testID="reader-scroll"
    >
      {chapterLabel ? (
        <AppText variant="label" color={colors.primary} style={{ marginBottom: 6 }}>
          {chapterLabel}
        </AppText>
      ) : null}

      <View style={styles.headerRow}>
        <AppText variant="h1" color={colors.primary} style={{ flex: 1 }} testID="reader-number">
          {number}
        </AppText>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onToggleBookmark} hitSlop={8} style={styles.iconBtn} testID="reader-bookmark">
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={bookmarked ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} hitSlop={8} style={styles.iconBtn} testID="reader-share">
            <Ionicons name="share-social-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <AppText variant="h2" style={{ marginBottom: 18 }} testID="reader-title">
        {title}
      </AppText>

      {groups.map((g) => {
        if (g.type === "heading") {
          return (
            <View key={g.block_id} onLayout={onBlockLayout(g.block_id)} style={{ marginTop: 16, marginBottom: 8 }}>
              <AppText variant="h3" color={colors.primary}>
                {g.segs.map((s) => s.text).join(" ")}
              </AppText>
              <View style={[styles.headingRule, { backgroundColor: colors.border }]} />
            </View>
          );
        }
        if (g.type === "list_item") {
          return (
            <View key={g.block_id} onLayout={onBlockLayout(g.block_id)} style={styles.listRow}>
              <AppText variant="body" color={colors.primary} style={styles.marker}>
                {g.marker || "•"}
              </AppText>
              <Text style={[styles.bodyText, { fontFamily: fonts.body, color: colors.textPrimary }]}>
                {g.segs.map((seg) => (
                  <Text key={seg.seg_id} style={segColor(seg, colors.textPrimary)}>
                    {renderRuns(seg)}
                    {" "}
                  </Text>
                ))}
              </Text>
            </View>
          );
        }
        // paragraph
        return (
          <View key={g.block_id} onLayout={onBlockLayout(g.block_id)} style={{ marginBottom: 12 }}>
            <Text style={[styles.bodyText, { fontFamily: fonts.body, color: colors.textPrimary }]}>
              {g.segs.map((seg) => (
                <Text key={seg.seg_id} style={segColor(seg, colors.textPrimary)}>
                  {renderRuns(seg)}
                  {" "}
                </Text>
              ))}
            </Text>
          </View>
        );
      })}

      {related && related.length > 0 ? (
        <View style={[styles.relatedBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <AppText variant="h3" color={colors.primary} style={{ marginBottom: 12 }}>
            {relatedLabel}
          </AppText>
          <View style={styles.chipWrap}>
            {related.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.chip, { borderColor: colors.primary }]}
                onPress={() => onSelectRelated(r.id)}
                testID={`related-${r.id}`}
              >
                <AppText variant="ui" color={colors.primary}>
                  {r.number}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

export function PrevNextBar({
  prev,
  next,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
}: {
  prev: { id: string; number: string } | null;
  next: { id: string; number: string } | null;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.navBar, { backgroundColor: colors.surface, borderColor: colors.border }]} testID="prev-next-bar">
      <TouchableOpacity
        style={[styles.navSide, { opacity: prev ? 1 : 0.35 }]}
        disabled={!prev}
        onPress={onPrev}
        testID="nav-prev"
      >
        <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
        <View style={{ marginLeft: 6 }}>
          <AppText variant="uiSemi" color={colors.textPrimary} numberOfLines={1}>
            {prev ? prev.number : "—"}
          </AppText>
          <AppText variant="small">{prevLabel}</AppText>
        </View>
      </TouchableOpacity>

      <View style={[styles.navDivider, { backgroundColor: colors.border }]} />

      <TouchableOpacity
        style={[styles.navSide, { justifyContent: "flex-end", opacity: next ? 1 : 0.35 }]}
        disabled={!next}
        onPress={onNext}
        testID="nav-next"
      >
        <View style={{ alignItems: "flex-end", marginRight: 6 }}>
          <AppText variant="uiSemi" color={colors.textPrimary} numberOfLines={1}>
            {next ? next.number : "—"}
          </AppText>
          <AppText variant="small">{nextLabel}</AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { padding: 6, marginLeft: 6 },
  bodyText: { fontSize: 16, lineHeight: 27 },
  listRow: { flexDirection: "row", marginBottom: 10, paddingRight: 4 },
  marker: { width: 26, textAlign: "left" },
  headingRule: { height: 1, marginTop: 10, opacity: 0.6 },
  relatedBox: { marginTop: 20, borderWidth: 1, borderRadius: 14, padding: 16 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  navSide: { flex: 1, flexDirection: "row", alignItems: "center" },
  navDivider: { width: 1, height: 32, marginHorizontal: 8 },
});
