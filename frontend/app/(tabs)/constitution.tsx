import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Share } from "react-native";
import { router } from "expo-router";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { useReader } from "@/src/reader/ReaderProvider";
import { useAuth } from "@/src/auth/AuthProvider";
import { useUserData } from "@/src/hooks/useUserData";
import { useTTS } from "@/src/tts/useTTS";
import { getParts, getArticle, updateSettings, ArticleDetail, Part } from "@/src/api/content";
import { LangCode } from "@/src/i18n/translations";
import { Screen, Loading, AppText } from "@/src/components/primitives";
import { ReaderTopBar } from "@/src/components/ReaderTopBar";
import { DropdownButton, PlayCircle, AutoScrollToggle } from "@/src/components/controls";
import { ReaderContent, PrevNextBar } from "@/src/components/ReaderContent";
import { ListenBar } from "@/src/components/ListenBar";
import { SelectSheet } from "@/src/components/SelectSheet";

const parseNum = (s: string): number | null => {
  const m = (s || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

export default function ConstitutionScreen() {
  const { t, lang, meta, setLang } = useI18n();
  const reader = useReader();
  const { patchUser } = useAuth();
  const { isBookmarked, toggleBookmark, recordRecent } = useUserData();

  const [parts, setParts] = useState<Part[]>([]);
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [partSheet, setPartSheet] = useState(false);
  const [langSheet, setLangSheet] = useState(false);
  const desiredNumberRef = useRef<number | null>(null);

  const tts = useTTS({ segments: detail?.segments || [], language: detail?.language, contentKey: detail?.id });

  // Resolve which article to show for the current language.
  useEffect(() => {
    (async () => {
      try {
        const res = await getParts(lang);
        setParts(res.parts);
        const flat = res.parts.flatMap((p) => p.articles);
        if (!flat.length) {
          setDetail(null);
          setLoading(false);
          return;
        }
        const cur = reader.articleId ? flat.find((a) => a.id === reader.articleId) : null;
        if (cur) return; // current id valid for this language
        let target =
          desiredNumberRef.current != null
            ? flat.find((a) => parseNum(a.article_number) === desiredNumberRef.current)
            : null;
        desiredNumberRef.current = null;
        reader.openArticle((target || flat[0]).id);
      } catch {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Load article detail when selection changes.
  useEffect(() => {
    (async () => {
      if (!reader.articleId) return;
      setLoading(true);
      try {
        const d = await getArticle(reader.articleId);
        setDetail(d);
        recordRecent({
          kind: "article",
          ref_id: d.id,
          number: d.article_number,
          title: d.title,
          subtitle: d.part ? d.part.part_number : undefined,
          lang: d.language,
        });
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reader.articleId]);

  const partLabel = useMemo(() => {
    if (detail?.part) {
      const pn = detail.part.part_number;
      const title = detail.part.title;
      return title && title !== pn ? `${pn} – ${title}` : pn || title;
    }
    return t("select_part");
  }, [detail, t]);

  const onChangeLang = (code: string) => {
    if (detail) desiredNumberRef.current = parseNum(detail.article_number);
    setLang(code as LangCode);
    patchUser({ language: code });
    updateSettings({ language: code }).catch(() => {});
  };

  const onShare = useCallback(() => {
    if (!detail) return;
    Share.share({
      message: `${detail.article_number}: ${detail.title}\n\nConstitution of India — via ${t("app_name")}`,
    }).catch(() => {});
  }, [detail, t]);

  const onListen = () => {
    if (tts.isActive) tts.togglePlay();
    else tts.play();
  };

  const partOptions = useMemo(
    () =>
      parts.map((p) => ({
        key: p.id,
        label: p.title && p.title !== p.part_number ? `${p.part_number} – ${p.title}` : p.part_number,
        sublabel: `${p.articles.length} ${t("articles")}`,
      })),
    [parts, t],
  );

  const langOptions = useMemo(
    () =>
      meta &&
      [
        { code: "en-IN", native: "English" },
        { code: "hi-IN", native: "हिंदी" },
        { code: "te-IN", native: "తెలుగు" },
        { code: "ta-IN", native: "தமிழ்" },
        { code: "kn-IN", native: "ಕನ್ನಡ" },
        { code: "ml-IN", native: "മലയാളം" },
      ].map((l) => ({ key: l.code, label: l.native })),
    [meta],
  );

  return (
    <Screen>
      <ReaderTopBar
        title={t("app_name") === "Constitution & Law" ? "The Constitution of India" : t("tab_constitution")}
        subtitle="Read • Learn • Uphold"
        langGlyph={meta.glyph}
        listening={tts.isActive}
        listenLabel={t("listen")}
        searchLabel={t("search")}
        menuLabel={t("menu")}
        onListen={onListen}
        onSearch={() => router.push("/search?scope=constitution")}
        onMenu={() => router.push("/constitution-toc")}
        onLanguage={() => setLangSheet(true)}
      />

      <View style={styles.controlRow}>
        <DropdownButton
          label={partLabel}
          onPress={() => setPartSheet(true)}
          style={{ flex: 1, marginRight: 10 }}
          testID="part-dropdown"
        />
        <PlayCircle playing={tts.isPlaying} onPress={onListen} />
        <View style={{ marginLeft: 10 }}>
          <AutoScrollToggle value={autoScroll} onValueChange={setAutoScroll} label={t("auto_scroll")} />
        </View>
      </View>

      {loading && !detail ? (
        <Loading />
      ) : detail ? (
        <>
          <ReaderContent
            number={detail.article_number}
            title={detail.title}
            segments={detail.segments}
            related={detail.related}
            relatedLabel={t("related_articles")}
            activeSegId={tts.activeSegId}
            autoScroll={autoScroll}
            bookmarked={isBookmarked(detail.id)}
            onToggleBookmark={() =>
              toggleBookmark({
                kind: "article",
                ref_id: detail.id,
                number: detail.article_number,
                title: detail.title,
                subtitle: detail.part ? detail.part.part_number : undefined,
                lang: detail.language,
              })
            }
            onShare={onShare}
            onSelectRelated={(id) => reader.openArticle(id)}
          />
          <ListenBar
            visible={tts.isActive}
            isPlaying={tts.isPlaying}
            isPaused={tts.isPaused}
            togglePlay={tts.togglePlay}
            stop={tts.stop}
            progress={tts.progress}
            rate={tts.rate}
            setRate={tts.setRate}
            voices={tts.voices}
            voiceId={tts.voiceId}
            setVoiceId={tts.setVoiceId}
            language={detail.language}
          />
          <PrevNextBar
            prev={detail.prev}
            next={detail.next}
            prevLabel={t("previous")}
            nextLabel={t("next")}
            onPrev={() => detail.prev && reader.openArticle(detail.prev.id)}
            onNext={() => detail.next && reader.openArticle(detail.next.id)}
          />
        </>
      ) : (
        <View style={styles.empty}>
          <AppText variant="h3" center>
            {t("no_results")}
          </AppText>
        </View>
      )}

      <SelectSheet
        visible={partSheet}
        title={t("select_part")}
        options={partOptions}
        selectedKey={detail?.part?.id}
        onSelect={(partId) => {
          const p = parts.find((x) => x.id === partId);
          if (p && p.articles[0]) reader.openArticle(p.articles[0].id);
        }}
        onClose={() => setPartSheet(false)}
        testID="part-sheet"
      />
      <SelectSheet
        visible={langSheet}
        title={t("language")}
        options={langOptions || []}
        selectedKey={lang}
        onSelect={onChangeLang}
        onClose={() => setLangSheet(false)}
        testID="lang-sheet"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controlRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
