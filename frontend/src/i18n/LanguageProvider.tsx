import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/api/client";
import { LangCode, TRANSLATIONS, TKey, LANG_META } from "./translations";

interface ContentLangFlags {
  code: LangCode;
  constitution_available: boolean;
  law_available: boolean;
  available: boolean;
}

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TKey) => string;
  meta: typeof LANG_META[number];
  allLanguages: typeof LANG_META;
  availability: Record<string, ContentLangFlags>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const STORAGE_KEY = "pref_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en-IN");
  const [availability, setAvailability] = useState<Record<string, ContentLangFlags>>({});

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(STORAGE_KEY, "en-IN");
      if (saved && TRANSLATIONS[saved as LangCode]) setLangState(saved as LangCode);
    })();
    (async () => {
      try {
        const res = await api.get<{ languages: ContentLangFlags[] }>("/meta/languages");
        const map: Record<string, ContentLangFlags> = {};
        res.languages.forEach((l) => (map[l.code] = l));
        setAvailability(map);
      } catch {
        /* offline-safe */
      }
    })();
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    storage.setItem(STORAGE_KEY, l);
  };

  const t = (key: TKey) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS["en-IN"][key];
  const meta = LANG_META.find((m) => m.code === lang) ?? LANG_META[0];

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, t, meta, allLanguages: LANG_META, availability }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
