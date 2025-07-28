import React from 'react';
import { Promotion, LoyaltyProgram } from '../../../types';
import { useTranslation } from '../../../contexts/LanguageContext';

interface PointsSystemProps {
    promotion: Promotion;
    points: number;
}

const PointsSystem: React.FC<PointsSystemProps> = ({ promotion, points }) => {
    const { t } = useTranslation();
    const details = promotion.details as LoyaltyProgram;
    const tiers = details.rewardTiers?.sort((a, b) => a.points - b.points) || [];
    
    const nextTier = tiers.find(tier => tier.points > points);
    const currentTierProgress = nextTier ? (points / nextTier.points) * 100 : (tiers.length > 0 ? 100 : 0);

    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (currentTierProgress / 100) * circumference;

    return (
        <div className="bg-white dark:bg-brand-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-bold text-center">{promotion.name}</h3>
            <div className="relative w-48 h-48 mx-auto my-4">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle
                        className="text-brand-gray-200 dark:text-brand-gray-700"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="60"
                        cy="60"
                    />
                    <circle
                        className="text-brand-customer"
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="60"
                        cy="60"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.5s ease-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-brand-customer">{points.toLocaleString()}</span>
                    <span className="text-sm font-semibold text-brand-gray-500">{t('customer_rewards_points')}</span>
                </div>
            </div>
            <div className="space-y-2">
                {tiers.map(tier => {
                    const canAfford = points >= tier.points;
                    return (
                        <div key={tier.id} className={`flex justify-between items-center p-3 rounded-md transition-colors ${canAfford ? 'bg-green-50 dark:bg-green-900/40' : 'bg-brand-gray-50 dark:bg-brand-gray-700/50'}`}>
                            <div>
                                <p className="font-semibold">{tier.description}</p>
                                <p className="text-sm text-brand-customer font-bold">{tier.points} {t('customer_rewards_points')}</p>
                            </div>
                            <button disabled={!canAfford} className="bg-green-500 text-white font-bold py-1 px-3 text-sm rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {t('customer_rewards_redeem_button')}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default PointsSystem;