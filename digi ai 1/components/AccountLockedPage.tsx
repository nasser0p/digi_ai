import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { LogoutIcon } from './icons';

interface AccountLockedPageProps {
    onLogout: () => void;
}

const AccountLockedPage: React.FC<AccountLockedPageProps> = ({ onLogout }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-gray-100 dark:bg-brand-gray-900 p-4 text-center">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-brand-gray-800 p-8 rounded-2xl shadow-xl">
                    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>

                    <h1 className="text-2xl font-bold text-brand-gray-800 dark:text-white">{t('account_locked_title')}</h1>
                    <p className="text-brand-gray-600 dark:text-brand-gray-400 mt-2">{t('account_locked_desc')}</p>
                    <p className="text-brand-gray-600 dark:text-brand-gray-400 mt-1 text-sm">{t('account_locked_contact')}</p>

                    <button
                        onClick={onLogout}
                        className="mt-8 w-full flex items-center justify-center bg-brand-teal text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-teal-dark transition-colors"
                    >
                        <LogoutIcon className="w-5 h-5 me-2" />
                        {t('sidebar_logout')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountLockedPage;
