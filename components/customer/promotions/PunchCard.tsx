import React from 'react';
import { Promotion, LoyaltyProgram, MenuItem } from '../../../types';
import { useTranslation } from '../../../contexts/LanguageContext';

interface PunchCardProps {
    promotion: Promotion;
    progress: number;
    rewardItem?: MenuItem;
    onRedeem: (promotionId: string, rewardItemId: string) => void;
}

const PunchCard: React.FC<PunchCardProps> = ({ promotion, progress, rewardItem, onRedeem }) => {
    const { t } = useTranslation();
    const details = promotion.details as LoyaltyProgram;
    const goal = details.visitGoal || 1;
    const isComplete = progress >= goal;

    return (
        <div className="bg-white dark:bg-brand-gray-800 p-4 rounded-lg shadow relative overflow-hidden">
            {isComplete && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-teal-500 opacity-20 animate-pulse"></div>
            )}
            <h3 className="font-bold">{promotion.name}</h3>
            {rewardItem && <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mb-3">{t('customer_rewards_punch_card_desc', goal, rewardItem.name)}</p>}
            
            <div className={`grid gap-2 my-4`} style={{gridTemplateColumns: `repeat(${Math.min(goal, 10)}, 1fr)`}}>
                {Array.from({ length: goal }).map((_, i) => {
                    const isPunched = i < progress;
                    const isNext = i === progress % goal;
                    
                    return (
                        <div key={i} className={`aspect-square rounded-full flex items-center justify-center border-2 border-dashed transition-all duration-300 ${isPunched ? 'border-brand-customer bg-brand-customer/20 border-solid' : 'border-brand-gray-300 dark:border-brand-gray-600'} ${!isComplete && isNext ? 'animate-pulse border-brand-customer border-solid' : ''}`}>
                            <span className={`text-3xl transition-transform duration-300 ${isPunched ? 'scale-100' : 'scale-0'}`}>
                                ⭐
                            </span>
                        </div>
                    );
                })}
            </div>

            {isComplete && rewardItem && (
                 <button onClick={() => onRedeem(promotion.id, rewardItem.id)} className="w-full mt-4 bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 animate-shimmer">
                    {t('customer_rewards_redeem_button')}
                </button>
            )}
        </div>
    );
};

export default PunchCard;