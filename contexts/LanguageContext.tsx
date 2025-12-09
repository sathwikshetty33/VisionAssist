/**
 * Language Context
 * Manages current language state across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, LANGUAGES, t as translate } from '@/services/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  voiceCode: string;
  whisperCode: string;
  languageName: string;
  cycleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LANGUAGE_STORAGE_KEY = '@VisionAssist:language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load saved language on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && (saved === 'en' || saved === 'hi' || saved === 'kn')) {
          setLanguageState(saved as Language);
        }
      } catch (err) {
        console.error('Failed to load language:', err);
      }
    })();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (err) {
      console.error('Failed to save language:', err);
    }
  };

  const cycleLanguage = () => {
    const langs: Language[] = ['en', 'hi', 'kn'];
    const currentIndex = langs.indexOf(language);
    const nextIndex = (currentIndex + 1) % langs.length;
    setLanguage(langs[nextIndex]);
  };

  const t = (key: string) => translate(key, language);
  
  const config = LANGUAGES[language];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        voiceCode: config.voiceCode,
        whisperCode: config.whisperCode,
        languageName: config.nativeName,
        cycleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export default LanguageContext;
