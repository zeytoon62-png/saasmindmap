import { createContext, useContext } from "react";
import { Language, Translations, translations, isRTL } from "./translations";

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
  dir: "rtl" | "ltr";
}

export const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: translations.en,
  isRTL: false,
  dir: "ltr",
});

export function useTranslation(): I18nContextType {
  return useContext(I18nContext);
}

export function getI18nValue(language: Language): I18nContextType {
  return {
    language,
    setLanguage: () => {},
    t: translations[language],
    isRTL: isRTL(language),
    dir: isRTL(language) ? "rtl" : "ltr",
  };
}