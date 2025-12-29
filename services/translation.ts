// services/translation.ts
import { SupportedLanguage } from "../context/LanguageContext";

// Cache for translated texts to avoid redundant API calls
const translationCache = new Map<string, Map<SupportedLanguage, string>>();

/**
 * Translates text to the target language using Google Translate API
 * @param text - The text to translate
 * @param targetLang - The target language code (hi, fa, en)
 * @returns Translated text
 */
export async function translateText(
  text: string,
  targetLang: SupportedLanguage
): Promise<string> {
  // If target is English, return original text
  if (targetLang === "en") {
    return text;
  }

  // Check cache first
  const cacheKey = text.trim().toLowerCase();
  if (translationCache.has(cacheKey)) {
    const langCache = translationCache.get(cacheKey)!;
    if (langCache.has(targetLang)) {
      return langCache.get(targetLang)!;
    }
  }

  try {
    // Using Google Translate via translate.googleapis.com (no API key needed for basic usage)
    const sourceLang = "en"; // Announcements are in English

    // Use a more reliable free translation API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    const data: any = await response.json();

    // Google Translate API returns array structure: [[[translated_text, original_text, ...]]]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      const translatedText = data[0].map((item: any) => item[0]).join('');

      // Store in cache
      if (!translationCache.has(cacheKey)) {
        translationCache.set(cacheKey, new Map());
      }
      translationCache.get(cacheKey)!.set(targetLang, translatedText);

      return translatedText;
    }

    // Fallback to original text if translation fails
    console.warn(`Translation failed for: ${text}`);
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text on error
    return text;
  }
}

/**
 * Translates an array of texts in batch
 * @param texts - Array of texts to translate
 * @param targetLang - The target language code
 * @returns Array of translated texts in the same order
 */
export async function translateBatch(
  texts: string[],
  targetLang: SupportedLanguage
): Promise<string[]> {
  if (targetLang === "en") {
    return texts;
  }

  // Translate texts in parallel
  const translationPromises = texts.map((text) =>
    translateText(text, targetLang)
  );

  return await Promise.all(translationPromises);
}

/**
 * Clears the translation cache (useful for memory management)
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Gets language name in native script
 */
export function getLanguageDisplayName(lang: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    en: "English",
    hi: "हिन्दी",
    fa: "فارسی",
    fr: "Français",
  };
  return names[lang];
}
