import React from 'react';
import { GiftIcon } from '../../icons';
import { useTranslation } from '../../../contexts/LanguageContext';

interface MyRewardsButtonProps {
    onClick: () => void;
}

const MyRewardsButton: React.FC<MyRewardsButtonProps> = ({ onClick }) => {
    const { t } = useTranslation();
    return (
        <button
            onClick={onClick}
            className={`fixed top-40 right-4 rtl:right-auto rtl:left-4 z-30 flex items-center gap-2 bg-white dark:bg-brand-gray-800 pl-3 pr-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105`}
        >
            <GiftIcon className="w-6 h-6 text-brand-customer" />
            <span className="font-semibold text-sm text-brand-gray-700 dark:text-brand-gray-200">
                {t('customer_menu_my_rewards_button')}
            </span>
        </button>
    );
};

export default MyRewardsButton;