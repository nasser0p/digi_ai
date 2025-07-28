import React from 'react';
import { Promotion, MultiBuyOffer, SpecialOffer } from '../../../types';
import { useTranslation } from '../../../contexts/LanguageContext';
import { TagIcon } from '../../icons';

interface PromotionInfoProps {
    promotion: Promotion;
}

const PromotionInfo: React.FC<PromotionInfoProps> = ({ promotion }) => {
    const { t } = useTranslation();

    const getPromotionText = () => {
        switch(promotion.type) {
            case 'multi_buy':
                const mb = promotion.details as MultiBuyOffer;
                if (mb.getDiscountType === 'free') {
                    return t('promotion_info_multi_buy_free', mb.buyQuantity, mb.getQuantity);
                }
                return t('promotion_info_multi_buy_discount', mb.buyQuantity, mb.getQuantity, mb.getDiscountValue);
            case 'special_offer':
                 const so = promotion.details as SpecialOffer;
                 if (so.discountType === 'percentage') {
                    return t('promotion_info_special_offer_percentage', so.discountValue);
                 }
                 return t('promotion_info_special_offer_fixed', so.discountValue.toFixed(3));
            default:
                return promotion.name;
        }
    };
    
    return (
        <div className="p-3 mb-4 bg-teal-50 dark:bg-teal-900/40 rounded-lg flex items-start gap-3 border-l-4 border-brand-customer">
            <TagIcon className="w-5 h-5 text-brand-customer flex-shrink-0 mt-0.5" />
            <div>
                <h4 className="font-bold text-brand-customer">{t('promotion_info_title')}</h4>
                <p className="text-sm text-brand-gray-700 dark:text-brand-gray-300">{getPromotionText()}</p>
            </div>
        </div>
    );
};

export default PromotionInfo;