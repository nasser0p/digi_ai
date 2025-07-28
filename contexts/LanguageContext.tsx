import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { translations, TranslationKey } from '../i18n/en'; // default to english
import { translations as arTranslations } from '../i18n/ar';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    dir: Direction;
    t: (key: TranslationKey, ...args: (string | number)[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const resources = {
    en: { translation: translations },
    ar: { translation: arTranslations }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const savedLang = typeof window !== 'undefined' ? localStorage.getItem('language') : 'en';
        return (savedLang === 'ar' ? 'ar' : 'en');
    });

    const dir: Direction = language === 'ar' ? 'rtl' : 'ltr';

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = dir;
    }, [language, dir]);

    const setLanguage = useCallback((lang: Language) => {
        localStorage.setItem('language', lang);
        setLanguageState(lang);
    }, []);

    const t = useCallback((key: TranslationKey, ...args: (string | number)[]): string => {
        const resourceSet = resources[language] || resources.en;
        let translation = resourceSet.translation[key] || key;

        if (args.length > 0) {
            args.forEach((arg, index) => {
                const regex = new RegExp(`\\{\\{${index}\\}\\}`, 'g');
                translation = translation.replace(regex, String(arg));
            });
        }

        return translation;
    }, [language]);

    const contextValue = useMemo(() => ({ language, setLanguage, dir, t }), [language, dir, setLanguage, t]);

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};

export type { TranslationKey };