import React from 'react';
import { Promotion } from '../../../types';

interface PromotionBadgeProps {
    promotion: Promotion;
}

const PromotionBadge: React.FC<PromotionBadgeProps> = ({ promotion }) => {
    const text = promotion.badgeText || promotion.name;

    if (!text) return null;

    return (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-md shadow-lg pointer-events-none z-10">
            {text}
        </div>
    );
};

export default PromotionBadge;