import { api } from "./client";

export interface Run { text: string; bold: boolean; italic: boolean }
export interface Segment {
  seg_id: number;
  block_id: number;
  type: "heading" | "paragraph" | "list_item";
  marker: string | null;
  text: string;
  runs: Run[];
  speak: boolean;
}
export interface RefItem { id: string; number: string; title?: string }

export interface ArticleDetail {
  id: string;
  article_number: string;
  title: string;
  language: string;
  segments: Segment[];
  tts_text: string;
  related: RefItem[];
  prev: { id: string; number: string } | null;
  next: { id: string; number: string } | null;
  part: { id: string; part_number: string; title: string } | null;
}

export interface ArticleLite {
  id: string;
  article_number: string;
  title: string;
  sequence_order: number;
}
export interface Part {
  id: string;
  part_number: string;
  title: string;
  sequence_order: number;
  articles: ArticleLite[];
}
export interface PartsResponse {
  book: { id: string; title: string } | null;
  language: string;
  parts: Part[];
}

export interface LawBook { id: string; title: string; default_language: string }
export interface Chapter { id: string; chapter_number: string; title: string; sequence_order: number }
export interface SectionLite { id: string; section_number: string; title: string; sequence_order: number }
export interface SectionDetail {
  id: string;
  section_number: string;
  title: string;
  language: string;
  segments: Segment[];
  tts_text: string;
  related: RefItem[];
  prev: { id: string; number: string } | null;
  next: { id: string; number: string } | null;
  chapter: { id: string; chapter_number: string; title: string } | null;
  book: { id: string; title: string; default_language: string } | null;
}

export interface SearchResult { id: string; number: string; title: string }

export interface UserItem {
  kind: "article" | "section";
  ref_id: string;
  number: string;
  title?: string;
  subtitle?: string;
  lang?: string;
  book_id?: string;
}

export interface HomeData {
  continue_reading: UserItem | null;
  constitution_recents: UserItem[];
  law_recents: UserItem[];
  stats: { articles_read: number; bookmarks: number; streak_days: number; goal_progress: number };
}

// ---- Constitution
export const getParts = (lang: string) =>
  api.get<PartsResponse>(`/constitution/parts?lang=${encodeURIComponent(lang)}`);
export const getArticle = (id: string) =>
  api.get<ArticleDetail>(`/constitution/articles/${id}`);
export const searchConstitution = (q: string, lang: string) =>
  api.get<{ results: SearchResult[] }>(
    `/constitution/search?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`,
  );

// ---- Law
export const getLawBooks = (lang: string) =>
  api.get<{ books: LawBook[]; language: string }>(`/law/books?lang=${encodeURIComponent(lang)}`);
export const getChapters = (bookId: string) =>
  api.get<{ chapters: Chapter[] }>(`/law/chapters?book_id=${bookId}`);
export const getSections = (chapterId: string) =>
  api.get<{ sections: SectionLite[] }>(`/law/chapters/${chapterId}/sections`);
export const getSection = (id: string) => api.get<SectionDetail>(`/law/sections/${id}`);
export const searchLaw = (q: string, lang: string, bookId?: string) =>
  api.get<{ results: SearchResult[] }>(
    `/law/search?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}${
      bookId ? `&book_id=${bookId}` : ""
    }`,
  );

// ---- User
export const getHome = () => api.get<HomeData>("/home");
export const getBookmarks = (kind?: string) =>
  api.get<{ bookmarks: UserItem[] }>(`/bookmarks${kind ? `?kind=${kind}` : ""}`);
export const getBookmarkIds = () => api.get<{ ids: string[] }>("/bookmarks/ids");
export const addBookmark = (b: UserItem) => api.post("/bookmarks", b);
export const removeBookmark = (refId: string) => api.del(`/bookmarks/${refId}`);
export const addRecent = (b: UserItem) => api.post("/recents", b);
export const getRecents = (kind?: string) =>
  api.get<{ recents: UserItem[] }>(`/recents${kind ? `?kind=${kind}` : ""}`);
export const updateSettings = (s: { language?: string; theme?: string; notifications?: boolean }) =>
  api.put<{ user: any }>("/settings", s);
export const updateProfile = (p: { name?: string; picture?: string }) =>
  api.put<{ user: any }>("/profile", p);
