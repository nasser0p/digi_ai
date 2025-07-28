import React, { useState } from 'react';
import { Promotion, CustomerLoyaltyProgress, LoyaltyProgram, MenuItem } from '../../../types';
import { useTranslation } from '../../../contexts/LanguageContext';
import { GiftIcon } from '../../icons';
import PunchCard from './PunchCard';
import PointsSystem from './PointsSystem';

interface MyRewardsPanelProps {
    promotions: Promotion[];
    loyaltyProgress: CustomerLoyaltyProgress | null;
    menuItems: MenuItem[];
    onRedeemPunch: (promotionId: string, rewardItemId: string) => void;
    customerPhoneNumber: string;
    onSetCustomerPhone: (phone: string) => void;
}

const MyRewardsPanel: React.FC<MyRewardsPanelProps> = ({ promotions, loyaltyProgress, menuItems, onRedeemPunch, customerPhoneNumber, onSetCustomerPhone }) => {
    const { t } = useTranslation();
    const [phoneInput, setPhoneInput] = useState('');

    const handleSubmitPhone = (e: React.FormEvent) => {
        e.preventDefault();
        onSetCustomerPhone(phoneInput);
    };

    if (!customerPhoneNumber) {
        return (
             <div className="h-full flex flex-col bg-brand-gray-50 dark:bg-brand-gray-900">
                <div className="p-6 h-full flex flex-col justify-center items-center text-center">
                    <GiftIcon className="w-12 h-12 text-brand-customer mb-4" />
                    <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white">{t('customer_rewards_opt_in_title')}</h3>
                    <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mt-2 mb-6 max-w-xs">{t('customer_rewards_opt_in_desc')}</p>
                    <form onSubmit={handleSubmitPhone} className="w-full max-w-sm">
                        <input 
                            type="tel"
                            placeholder={t('customer_rewards_phone_placeholder')}
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            className="w-full text-center px-4 py-3 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-customer focus:border-brand-customer"
                            required
                        />
                        <button type="submit" className="w-full mt-4 bg-brand-customer text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-customer-dark transition-colors">
                            {t('customer_rewards_check_button')}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (promotions.length === 0) {
        return <p className="text-center text-sm text-brand-gray-500 p-4">{t('customer_rewards_no_programs')}</p>;
    }

    return (
        <div className="h-full flex flex-col bg-brand-gray-50 dark:bg-brand-gray-900">
            <div className="p-6 pb-2">
                <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white flex items-center gap-2">
                    <GiftIcon className="w-6 h-6 text-brand-customer" />
                    {t('customer_rewards_title')}
                </h2>
                 {loyaltyProgress && promotions.some(p => (p.details as LoyaltyProgram).type === 'spend_based') && (
                     <p className="mt-2 text-2xl font-bold text-brand-customer">{loyaltyProgress.points.toLocaleString()} <span className="text-base font-semibold text-brand-gray-500">{t('customer_rewards_points')}</span></p>
                )}
            </div>
            <div className="flex-grow overflow-y-auto p-6 pt-2 space-y-6">
                {promotions.map(promo => {
                    const details = promo.details as LoyaltyProgram;
                    if (details.type === 'visit_based') {
                        const progress = loyaltyProgress?.visitCounts[promo.id] || 0;
                        const rewardItem = menuItems.find(mi => mi.id === details.rewardItemId);
                        return (
                           <PunchCard 
                                key={promo.id}
                                promotion={promo}
                                progress={progress}
                                rewardItem={rewardItem}
                                onRedeem={onRedeemPunch}
                           />
                        )
                    }
                    if (details.type === 'spend_based') {
                         return (
                            <PointsSystem
                                key={promo.id}
                                promotion={promo}
                                points={loyaltyProgress?.points || 0}
                            />
                         )
                    }
                    return null;
                })}
            </div>
        </div>
    );
};

export default MyRewardsPanel;
