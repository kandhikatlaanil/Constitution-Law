import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Share, Alert } from "react-native";
import { router } from "expo-router";
import { useI18n } from "@/src/i18n/LanguageProvider";
import { useReader } from "@/src/reader/ReaderProvider";
import { useAuth } from "@/src/auth/AuthProvider";
import { useUserData } from "@/src/hooks/useUserData";
import { useTTS } from "@/src/tts/useTTS";
import {
  getLawBooks,
  getChapters,
  getSections,
  getSection,
  updateSettings,
  LawBook,
  Chapter,
  SectionDetail,
} from "@/src/api/content";
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

export default function LawScreen() {
  const { t, lang, meta, setLang } = useI18n();
  const reader = useReader();
  const { user, patchUser } = useAuth();
  const { isBookmarked, toggleBookmark, recordRecent } = useUserData();

  const [books, setBooks] = useState<LawBook[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [bookId, setBookId] = useState<string | null>(reader.lawBookId);
  const [chapterId, setChapterId] = useState<string | null>(reader.lawChapterId);
  const [detail, setDetail] = useState<SectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [bookSheet, setBookSheet] = useState(false);
  const [chapterSheet, setChapterSheet] = useState(false);
  const [langSheet, setLangSheet] = useState(false);

  const desiredSecNum = useRef<number | null>(null);
  const bookIdxRef = useRef<number>(0);

  const tts = useTTS({ segments: detail?.segments || [], language: detail?.language, contentKey: detail?.id });

  // Books for language.
  useEffect(() => {
    (async () => {
      try {
        const res = await getLawBooks(lang);
        setBooks(res.books);
        if (!res.books.length) {
          setLoading(false);
          return;
        }
        const found = bookId ? res.books.find((b) => b.id === bookId) : null;
        const b = found || res.books[bookIdxRef.current] || res.books[0];
        if (b.id !== bookId) setBookId(b.id);
      } catch {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Chapters for book.
  useEffect(() => {
    (async () => {
      if (!bookId) return;
      const res = await getChapters(bookId);
      setChapters(res.chapters);
      if (!res.chapters.length) {
        setLoading(false);
        return;
      }
      const found = chapterId ? res.chapters.find((c) => c.id === chapterId) : null;
      const c = found || res.chapters[0];
      if (c.id !== chapterId) setChapterId(c.id);
      else loadSectionsFor(c.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // Sections for chapter.
  const loadSectionsFor = useCallback(
    async (chId: string) => {
      const res = await getSections(chId);
      if (!res.sections.length) {
        setLoading(false);
        return;
      }
      const valid = reader.sectionId ? res.sections.find((s) => s.id === reader.sectionId) : null;
      let s = valid;
      if (!s) {
        s =
          desiredSecNum.current != null
            ? res.sections.find((x) => parseNum(x.section_number) === desiredSecNum.current)
            : null;
        desiredSecNum.current = null;
        if (!s) s = res.sections[0];
      }
      reader.openSection(s.id, bookId || undefined, chId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookId],
  );

  useEffect(() => {
    if (chapterId) loadSectionsFor(chapterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  // Section detail.
  useEffect(() => {
    (async () => {
      if (!reader.sectionId) return;
      setLoading(true);
      try {
        const d = await getSection(reader.sectionId);
        setDetail(d);
        recordRecent({
          kind: "section",
          ref_id: d.id,
          number: d.section_number,
          title: d.title,
          subtitle: d.book ? d.book.title : undefined,
          lang: d.language,
          book_id: d.book?.id,
        });
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reader.sectionId]);

  const bookLabel = detail?.book?.title || books.find((b) => b.id === bookId)?.title || t("select_book");
  const chapterLabel = useMemo(() => {
    const c = detail?.chapter || chapters.find((x) => x.id === chapterId);
    if (!c) return t("select_chapter");
    return c.title && c.title !== c.chapter_number ? `${c.chapter_number} – ${c.title}` : c.chapter_number;
  }, [detail, chapters, chapterId, t]);

  const onChangeLang = (code: string) => {
    const plan = user?.subscription_plan || "basic";
    if (plan !== "plus") {
      Alert.alert(
        t("subscription_required") || "Subscription Required",
        t("lang_upgrade_msg") || "Changing language is available only on the Plus plan. Please upgrade in the You settings screen."
      );
      return;
    }
    if (detail) desiredSecNum.current = parseNum(detail.section_number);
    bookIdxRef.current = Math.max(0, books.findIndex((b) => b.id === bookId));
    setLang(code as LangCode);
    patchUser({ language: code });
    updateSettings({ language: code }).catch(() => {});
  };

  const onShare = useCallback(() => {
    if (!detail) return;
    Share.share({
      message: `${detail.section_number}: ${detail.title}\n\n${detail.book?.title || "Indian Law"} — via ${t("app_name")}`,
    }).catch(() => {});
  }, [detail, t]);

  const onListen = () => {
    const plan = user?.subscription_plan || "basic";
    if (plan === "basic") {
      Alert.alert(
        t("subscription_required") || "Subscription Required",
        t("tts_upgrade_msg") || "Text-to-Speech is available only on Pro and Plus plans. Please upgrade in the You settings screen."
      );
      return;
    }
    if (tts.isActive) tts.togglePlay();
    else tts.play();
  };

  const langOptions = [
    { key: "en-IN", label: "English" },
    { key: "hi-IN", label: "हिंदी" },
    { key: "te-IN", label: "తెలుగు" },
    { key: "ta-IN", label: "தமிழ்" },
    { key: "kn-IN", label: "ಕನ್ನಡ" },
    { key: "ml-IN", label: "മലയാളം" },
  ];

  return (
    <Screen>
      <ReaderTopBar
        title="The Law Library"
        subtitle="Read • Learn • Practice"
        langGlyph={meta.glyph}
        listening={tts.isActive}
        listenLabel={t("listen")}
        searchLabel={t("search")}
        menuLabel={t("menu")}
        onListen={onListen}
        onSearch={() => router.push("/search?scope=law")}
        onMenu={() => setChapterSheet(true)}
        onLanguage={() => setLangSheet(true)}
      />

      <View style={styles.controls}>
        <DropdownButton
          label={bookLabel}
          icon="book-outline"
          onPress={() => setBookSheet(true)}
          testID="book-dropdown"
        />
        <View style={styles.chapterRow}>
          <DropdownButton
            label={chapterLabel}
            icon="list-outline"
            onPress={() => setChapterSheet(true)}
            style={{ flex: 1, marginRight: 10 }}
            testID="chapter-dropdown"
          />
          <PlayCircle playing={tts.isPlaying} onPress={onListen} />
        </View>
        <View style={styles.autoRow}>
          <AutoScrollToggle value={autoScroll} onValueChange={setAutoScroll} label={t("auto_scroll")} />
        </View>
      </View>

      {loading && !detail ? (
        <Loading />
      ) : detail ? (
        <>
          <ReaderContent
            number={detail.section_number}
            title={detail.title}
            chapterLabel={detail.chapter ? `${detail.chapter.chapter_number} — ${detail.chapter.title}` : null}
            segments={detail.segments}
            related={detail.related}
            relatedLabel={t("related_sections")}
            activeSegId={tts.activeSegId}
            autoScroll={autoScroll}
            bookmarked={isBookmarked(detail.id)}
            onToggleBookmark={() =>
              toggleBookmark({
                kind: "section",
                ref_id: detail.id,
                number: detail.section_number,
                title: detail.title,
                subtitle: detail.book ? detail.book.title : undefined,
                lang: detail.language,
                book_id: detail.book?.id,
              })
            }
            onShare={onShare}
            onSelectRelated={(id) => reader.openSection(id, bookId || undefined, chapterId || undefined)}
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
            onPrev={() => detail.prev && reader.openSection(detail.prev.id, bookId || undefined, chapterId || undefined)}
            onNext={() => detail.next && reader.openSection(detail.next.id, bookId || undefined, chapterId || undefined)}
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
        visible={bookSheet}
        title={t("select_book")}
        options={books.map((b) => ({ key: b.id, label: b.title }))}
        selectedKey={bookId}
        onSelect={(id) => {
          setChapterId(null);
          setBookId(id);
        }}
        onClose={() => setBookSheet(false)}
        testID="book-sheet"
      />
      <SelectSheet
        visible={chapterSheet}
        title={t("select_chapter")}
        options={chapters.map((c) => ({
          key: c.id,
          label: c.title && c.title !== c.chapter_number ? `${c.chapter_number} – ${c.title}` : c.chapter_number,
        }))}
        selectedKey={chapterId}
        onSelect={(id) => setChapterId(id)}
        onClose={() => setChapterSheet(false)}
        testID="chapter-sheet"
      />
      <SelectSheet
        visible={langSheet}
        title={t("language")}
        options={langOptions}
        selectedKey={lang}
        onSelect={onChangeLang}
        onClose={() => setLangSheet(false)}
        testID="law-lang-sheet"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  chapterRow: { flexDirection: "row", alignItems: "center" },
  autoRow: { flexDirection: "row", justifyContent: "flex-end" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
