import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage, t } = useTranslation();

    const toggleLanguage = () => {
        const newLanguage = language === 'en' ? 'ar' : 'en';
        setLanguage(newLanguage);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="p-2 rounded-md font-semibold text-sm transition-colors text-brand-gray-600 dark:text-brand-gray-300 bg-white dark:bg-brand-gray-800 border border-brand-gray-200 dark:border-brand-gray-700 hover:bg-brand-gray-50 dark:hover:bg-brand-gray-700 w-24"
            aria-label="Switch Language"
        >
            {language === 'en' ? t('language_switcher_arabic') : t('language_switcher_english')}
        </button>
    );
};

export default LanguageSwitcher;
