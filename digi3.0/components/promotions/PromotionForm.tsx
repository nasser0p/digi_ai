import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Promotion, MenuItem, LoyaltyProgram, MultiBuyOffer, SpecialOffer, LoyaltyRewardTier } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { NewPromotionType } from './PromotionsPage';
import { XIcon } from '../icons';

// Simple multi-select component for demonstration purposes
const MultiSelect: React.FC<{ options: {value: string, label: string}[], value: string[], onChange: (selected: string[]) => void, placeholder: string }> = ({ options, value, onChange, placeholder }) => {
    return (
        <select
            multiple
            value={value}
            onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                onChange(selectedOptions);
            }}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal h-32"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    )
}


interface PromotionFormProps {
    userId: string;
    promotion: Promotion | null;
    newPromotionType: NewPromotionType | null;
    menuItems: MenuItem[];
    onClose: () => void;
}

const PromotionForm: React.FC<PromotionFormProps> = ({ userId, promotion, newPromotionType, menuItems, onClose }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [badgeText, setBadgeText] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [details, setDetails] = useState<any>({});
    const [loading, setLoading] = useState(false);
    
    const promotionType = promotion ? promotion.type : (newPromotionType === 'loyalty_spend_based' || newPromotionType === 'loyalty_visit_based') ? 'loyalty' : newPromotionType;
    const loyaltyType = promotion ? (promotion.details as LoyaltyProgram).type : (newPromotionType === 'loyalty_visit_based' ? 'visit_based' : 'spend_based');

    useEffect(() => {
        if (promotion) {
            setName(promotion.name);
            setBadgeText(promotion.badgeText || '');
            setIsActive(promotion.isActive);
            setDetails(promotion.details);
        } else {
            // Set defaults based on new promotion type
            setName('');
            setBadgeText('');
            setIsActive(true);
            switch(newPromotionType) {
                case 'loyalty_visit_based':
                    setDetails({ type: 'visit_based', visitGoal: 5, applicableItemIds: [], rewardItemId: '' });
                    break;
                case 'loyalty_spend_based':
                    setDetails({ type: 'spend_based', earnRate: 1, rewardTiers: [{id: `tier_${Date.now()}`, points: 100, description: 'Free Coffee'}] });
                    break;
                case 'multi_buy':
                    setDetails({ buyQuantity: 1, buyItemIds: [], getQuantity: 1, getItemIds: [], getDiscountType: 'percentage', getDiscountValue: 100 });
                    break;
                case 'special_offer':
                    setDetails({ discountType: 'percentage', discountValue: 10, applicableItemIds: [] });
                    break;
            }
        }
    }, [promotion, newPromotionType]);

    const handleDetailChange = (field: string, value: any) => {
        setDetails((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleRewardTierChange = (index: number, field: keyof LoyaltyRewardTier, value: any) => {
        const newTiers = [...(details.rewardTiers || [])];
        const currentTier = newTiers[index];
        newTiers[index] = { ...currentTier, [field]: (field === 'points' && typeof value === 'string') ? parseInt(value, 10) : value };
        handleDetailChange('rewardTiers', newTiers);
    };

    const addRewardTier = () => {
        const newTier: LoyaltyRewardTier = { id: `tier_${Date.now()}`, points: 0, description: '' };
        handleDetailChange('rewardTiers', [...(details.rewardTiers || []), newTier]);
    };

    const removeRewardTier = (index: number) => {
        const newTiers = [...(details.rewardTiers || [])];
        newTiers.splice(index, 1);
        handleDetailChange('rewardTiers', newTiers);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const docRef = promotion ? doc(db, 'promotions', promotion.id) : doc(collection(db, 'promotions'));
        const promotionData: Omit<Promotion, 'id'> = {
            userId,
            name,
            badgeText: badgeText || '',
            isActive,
            type: promotionType!,
            details,
            createdAt: promotion ? promotion.createdAt : Timestamp.now(),
        };

        try {
            await setDoc(docRef, { ...promotionData, id: docRef.id }, { merge: true });
            onClose();
        } catch (error) {
            console.error(error);
            alert(t('promotions_save_error'));
        } finally {
            setLoading(false);
        }
    };
    
    const menuItemOptions = useMemo(() => menuItems.map(item => ({ value: item.id, label: item.name })), [menuItems]);
    const inputClasses = "p-2 text-sm bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal";
    const selectClasses = "p-2 text-sm bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal";

    const renderLoyaltyForm = () => {
        if (loyaltyType === 'visit_based') {
            return (
                <div className="bg-brand-gray-50 dark:bg-brand-gray-800/50 p-4 rounded-lg space-y-4">
                    <h4 className="font-semibold">{t('promotions_punch_card_title')}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span>{t('promotions_punch_card_buy')}</span>
                        <input type="number" value={details.visitGoal || ''} onChange={e => handleDetailChange('visitGoal', parseInt(e.target.value, 10))} className={`w-20 ${inputClasses}`} />
                        <span>{t('promotions_punch_card_of')}</span>
                    </div>
                    <MultiSelect options={menuItemOptions} value={details.applicableItemIds || []} onChange={v => handleDetailChange('applicableItemIds', v)} placeholder={t('promotions_select_items_placeholder')} />
                    
                    <div className="flex items-center gap-2">
                        <span>{t('promotions_punch_card_get')}</span>
                         <select value={details.rewardItemId || ''} onChange={e => handleDetailChange('rewardItemId', e.target.value)} className={`flex-grow ${selectClasses}`}>
                             <option value="">{t('promotions_select_item_placeholder')}</option>
                            {menuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                         </select>
                    </div>
                </div>
            );
        }
        if (loyaltyType === 'spend_based') {
            return (
                 <div className="bg-brand-gray-50 dark:bg-brand-gray-800/50 p-4 rounded-lg space-y-4">
                    <h4 className="font-semibold">{t('promotions_points_rule_title')}</h4>
                    <div>
                        <label className="block text-sm font-medium">{t('promotions_points_earn_rate_label')}</label>
                        <div className="flex items-center gap-2 mt-1">
                            <span>Earn</span>
                            <input type="number" value={details.earnRate || ''} onChange={e => handleDetailChange('earnRate', parseInt(e.target.value))} className={`w-20 ${inputClasses}`} />
                            <span>{t('promotions_points_earn_rate_desc')}</span>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium">{t('promotions_points_reward_tiers_label')}</h4>
                        <div className="space-y-2 mt-1">
                            {details.rewardTiers?.map((tier: LoyaltyRewardTier, index: number) => (
                                <div key={tier.id} className="flex items-center gap-2">
                                    <input type="number" placeholder={t('promotions_points_points_placeholder')} value={tier.points || ''} onChange={e => handleRewardTierChange(index, 'points', e.target.value)} className={`w-24 ${inputClasses}`} />
                                    <input type="text" placeholder={t('promotions_points_description_placeholder')} value={tier.description} onChange={e => handleRewardTierChange(index, 'description', e.target.value)} className={`flex-grow ${inputClasses}`} />
                                    <button type="button" onClick={() => removeRewardTier(index)} className="text-red-500 hover:text-red-700 p-1"><XIcon className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addRewardTier} className="mt-2 text-sm text-brand-teal font-semibold hover:underline">{t('promotions_points_add_tier_button')}</button>
                    </div>
                 </div>
            );
        }
        return null;
    }

    const renderMultiBuyForm = () => (
        <div className="bg-brand-gray-50 dark:bg-brand-gray-800/50 p-4 rounded-lg space-y-4">
            <h4 className="font-semibold">{t('promotions_multi_buy_rule_title')}</h4>
            <div>
                <label className="block text-sm font-medium">{t('promotions_multi_buy_condition_label')}</label>
                <div className="flex items-center gap-2 mt-1">
                    <input type="number" value={details.buyQuantity || 1} onChange={e => handleDetailChange('buyQuantity', parseInt(e.target.value))} className={`w-20 ${inputClasses}`}/>
                    <span>{t('promotions_multi_buy_buy_X_of')}</span>
                </div>
                <MultiSelect options={menuItemOptions} value={details.buyItemIds || []} onChange={v => handleDetailChange('buyItemIds', v)} placeholder={t('promotions_multi_buy_select_items_to_buy')} />
            </div>
            <div>
                <label className="block text-sm font-medium">{t('promotions_multi_buy_reward_label')}</label>
                 <div className="flex items-center gap-2 mt-1">
                    <input type="number" value={details.getQuantity || 1} onChange={e => handleDetailChange('getQuantity', parseInt(e.target.value))} className={`w-20 ${inputClasses}`}/>
                    <span>{t('promotions_multi_buy_get_X_of')}</span>
                </div>
                <MultiSelect options={menuItemOptions} value={details.getItemIds || []} onChange={v => handleDetailChange('getItemIds', v)} placeholder={t('promotions_multi_buy_select_items_to_get')} />
            </div>
            <div>
                <label className="block text-sm font-medium">{t('promotions_multi_buy_discount_label')}</label>
                <div className="flex items-center gap-2 mt-1">
                    <select value={details.getDiscountType} onChange={e => handleDetailChange('getDiscountType', e.target.value)} className={selectClasses}>
                        <option value="percentage">{t('promotions_multi_buy_discount_percentage')}</option>
                        <option value="free">{t('promotions_multi_buy_discount_free')}</option>
                    </select>
                    {details.getDiscountType === 'percentage' && (
                        <input type="number" value={details.getDiscountValue || 0} onChange={e => handleDetailChange('getDiscountValue', parseInt(e.target.value))} className={`w-20 ${inputClasses}`}/>
                    )}
                </div>
            </div>
        </div>
    );
    
    const renderSpecialOfferForm = () => (
         <div className="bg-brand-gray-50 dark:bg-brand-gray-800/50 p-4 rounded-lg space-y-4">
            <h4 className="font-semibold">{t('promotions_special_offer_rule_title')}</h4>
             <div>
                <label className="block text-sm font-medium">{t('promotions_special_offer_discount_type_label')}</label>
                 <select value={details.discountType} onChange={e => handleDetailChange('discountType', e.target.value)} className={`mt-1 ${selectClasses}`}>
                    <option value="percentage">{t('promotions_special_offer_discount_type_percentage')}</option>
                    <option value="fixed_amount">{t('promotions_special_offer_discount_type_fixed')}</option>
                </select>
             </div>
             <div>
                 <label className="block text-sm font-medium">{t('promotions_special_offer_discount_value_label')}</label>
                 <div className="flex items-center gap-2 mt-1">
                    <input type="number" value={details.discountValue || 0} onChange={e => handleDetailChange('discountValue', parseFloat(e.target.value))} className={`w-24 ${inputClasses}`}/>
                    <span>{details.discountType === 'percentage' ? '%' : 'OMR'}</span>
                 </div>
             </div>
             <div>
                 <label className="block text-sm font-medium">{t('promotions_special_offer_applicable_items_label')}</label>
                 <p className="text-xs text-brand-gray-500">{t('promotions_special_offer_applicable_items_desc')}</p>
                 <MultiSelect options={menuItemOptions} value={details.applicableItemIds || []} onChange={v => handleDetailChange('applicableItemIds', v)} placeholder={t('promotions_select_items_placeholder')} />
             </div>
        </div>
    );

    const renderFormContent = () => {
        switch(promotionType) {
            case 'loyalty': return renderLoyaltyForm();
            case 'multi_buy': return renderMultiBuyForm();
            case 'special_offer': return renderSpecialOfferForm();
            default: return <p>Select a promotion type.</p>
        }
    }


    return (
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
                 <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white">
                    {promotion ? t('promotions_form_title_edit') : t('promotions_form_title_new')}
                </h2>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">{t('promotions_form_name_label')}</label>
                    <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className={`mt-1 block w-full ${inputClasses}`} />
                </div>
                <div>
                    <label htmlFor="badgeText" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">{t('promotions_form_badge_text_label')}</label>
                    <input type="text" id="badgeText" value={badgeText} onChange={e => setBadgeText(e.target.value)} placeholder={t('promotions_form_badge_text_placeholder')} className={`mt-1 block w-full ${inputClasses}`} />
                </div>
                <div>
                    <label className="flex items-center text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">
                        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal" />
                        <span className="ml-2">{t('promotions_status_active')}</span>
                    </label>
                </div>
                
                {renderFormContent()}

            </div>
            <div className="flex-shrink-0 flex justify-end space-x-3 p-4 bg-white dark:bg-brand-gray-900 border-t border-brand-gray-200 dark:border-brand-gray-700">
                <button type="button" onClick={onClose} className="bg-brand-gray-200 dark:bg-brand-gray-600 text-brand-gray-800 dark:text-brand-gray-100 font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500">
                    {t('common_cancel')}
                </button>
                <button type="submit" disabled={loading} className="bg-brand-teal text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal-dark disabled:bg-teal-300">
                    {loading ? t('common_saving') : t('common_save')}
                </button>
            </div>
        </form>
    );
};

export default PromotionForm;