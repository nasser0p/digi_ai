import React, { useState } from 'react';
import { User, sendEmailVerification } from '@firebase/auth';
import { useTranslation } from '../contexts/LanguageContext';

interface EmailVerificationPageProps {
    user: User;
    onLogout: () => void;
}

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ user, onLogout }) => {
    const { t } = useTranslation();
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');
    const [checking, setChecking] = useState(false);

    const handleResend = async () => {
        setSending(true);
        setMessage('');
        try {
            await sendEmailVerification(user);
            setMessage(t('auth_verification_resent'));
            setTimeout(() => setMessage(''), 5000);
        } catch (error) {
            console.error("Error resending verification email:", error);
            setMessage(t('auth_verification_resend_error'));
        } finally {
            setSending(false);
        }
    };

    const handleCheckVerification = async () => {
        setChecking(true);
        await user.reload();
        // The onAuthStateChanged listener in App.tsx will handle the redirect automatically
        // if the email is now verified. We'll add a small timeout to prevent
        // rapid clicking if the check is very fast.
        setTimeout(() => setChecking(false), 1000);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-gray-50 dark:bg-brand-gray-900 p-4">
            <div className="w-full max-w-lg text-center">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-wider text-brand-teal">
                        DIGI<span className="text-brand-gray-800 dark:text-white">PLATE</span>
                    </h1>
                </div>

                <div className="bg-white dark:bg-brand-gray-800 p-8 rounded-2xl shadow-xl">
                    <svg className="w-16 h-16 text-brand-teal mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>

                    <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white">{t('auth_verify_title')}</h2>
                    <p className="text-brand-gray-600 dark:text-brand-gray-400 mt-2">{t('auth_verify_intro')}</p>
                    <p className="font-semibold text-brand-gray-800 dark:text-white mt-1">{user.email}</p>

                    <div className="my-6 p-4 bg-yellow-50 dark:bg-yellow-900/40 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200 text-left">
                        <p className="font-bold">{t('auth_verify_spam_reminder')}</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleCheckVerification}
                            disabled={checking}
                            className="w-full bg-brand-teal text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-teal-dark transition-colors disabled:bg-teal-300"
                        >
                            {checking ? t('common_loading') : t('auth_verify_continue_button')}
                        </button>
                        
                        <div className="text-sm">
                            <p className="text-brand-gray-500">{t('auth_verify_resend_prompt')}</p>
                            <button
                                onClick={handleResend}
                                disabled={sending}
                                className="font-semibold text-brand-teal hover:underline disabled:opacity-50"
                            >
                                {sending ? t('auth_sending') : t('auth_verify_resend_button')}
                            </button>
                            {message && <p className="mt-2 font-semibold text-green-500">{message}</p>}
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button onClick={onLogout} className="text-brand-gray-500 hover:text-brand-gray-700 dark:hover:text-white font-semibold text-sm">
                        {t('auth_verify_logout_button')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationPage;
