import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";

interface ReaderState {
  articleId: string | null;
  sectionId: string | null;
  lawBookId: string | null;
  lawChapterId: string | null;
}

interface ReaderContextValue extends ReaderState {
  openArticle: (id: string) => void;
  openSection: (id: string, bookId?: string, chapterId?: string) => void;
  setLawSelection: (bookId: string | null, chapterId: string | null) => void;
}

const ReaderContext = createContext<ReaderContextValue | undefined>(undefined);
const KEY = "reader_state";

export function ReaderProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ReaderState>({
    articleId: null,
    sectionId: null,
    lawBookId: null,
    lawChapterId: null,
  });

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(KEY, "");
      if (saved) {
        try {
          setState(JSON.parse(saved));
        } catch {
          /* ignore */
        }
      }
    })();
  }, []);

  const persist = (next: ReaderState) => {
    setState(next);
    storage.setItem(KEY, JSON.stringify(next));
  };

  const openArticle = (id: string) => persist({ ...state, articleId: id });
  const openSection = (id: string, bookId?: string, chapterId?: string) =>
    persist({
      ...state,
      sectionId: id,
      lawBookId: bookId ?? state.lawBookId,
      lawChapterId: chapterId ?? state.lawChapterId,
    });
  const setLawSelection = (bookId: string | null, chapterId: string | null) =>
    persist({ ...state, lawBookId: bookId, lawChapterId: chapterId });

  return (
    <ReaderContext.Provider value={{ ...state, openArticle, openSection, setLawSelection }}>
      {children}
    </ReaderContext.Provider>
  );
}

export function useReader() {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error("useReader must be used within ReaderProvider");
  return ctx;
}
