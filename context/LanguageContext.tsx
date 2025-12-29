// context/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SupportedLanguage = "en" | "hi" | "fa" | "fr";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languageName: string;
}

const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "हिन्दी (Hindi)",
  fa: "فارسی (Farsi)",
  fr: "Français (French)",
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  // Load saved language preference on mount
  useEffect(() => {
    (async () => {
      const savedLanguage = await AsyncStorage.getItem("user_language");
      if (savedLanguage === "en" || savedLanguage === "hi" || savedLanguage === "fa" || savedLanguage === "fr") {
        setLanguageState(savedLanguage);
      }
    })();
  }, []);

  const setLanguage = async (lang: SupportedLanguage) => {
    setLanguageState(lang);
    await AsyncStorage.setItem("user_language", lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        languageName: languageNames[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
