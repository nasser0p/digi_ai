import React from 'react';
import { MenuItem, Promotion } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import PromotionBadge from './promotions/PromotionBadge';

interface CustomerItemRowProps {
    item: MenuItem;
    onSelectItem: (item: MenuItem) => void;
    promotion: Promotion | null;
    enableItemAnimations?: boolean;
}

const CustomerItemRow: React.FC<CustomerItemRowProps> = ({ item, onSelectItem, promotion, enableItemAnimations }) => {
    const { t } = useTranslation();
    const hasOptions = item.modifierGroups && item.modifierGroups.length > 0;

    return (
        <div 
            onClick={() => item.isAvailable && onSelectItem(item)}
            className={`
                bg-white dark:bg-brand-gray-800/50 rounded-lg shadow-sm overflow-hidden flex items-center p-3 gap-4 group transition-all duration-200 relative
                ${item.isAvailable ? 'hover:shadow-md hover:bg-brand-gray-50 dark:hover:bg-brand-gray-800 cursor-pointer' : 'opacity-60 cursor-not-allowed'}
            `}
        >
            {promotion && <PromotionBadge promotion={promotion} />}
            <img 
                src={item.imageUrl || `https://placehold.co/200x200/1f2937/e5e7eb?text=${encodeURIComponent(item.name)}`} 
                alt={item.name} 
                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-md flex-shrink-0" 
            />

            <div className="flex-grow min-w-0">
                <h3 className="font-bold text-lg customer-text truncate">{item.name}</h3>
                <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mt-1 line-clamp-2">{item.description}</p>
                <p className={`font-bold text-brand-customer mt-2 text-md inline-block ${enableItemAnimations ? 'animate-shimmer' : ''}`}>OMR {item.price.toFixed(3)}</p>
            </div>
            
            <button
                disabled={!item.isAvailable}
                className="bg-brand-customer text-white font-bold py-2 px-3 rounded-lg hover:bg-brand-customer-dark transition-colors text-sm flex-shrink-0 disabled:bg-brand-gray-400"
            >
                {hasOptions ? t('customer_item_card_select_options') : t('customer_item_card_add_to_cart')}
            </button>

            {!item.isAvailable && (
                <div className="absolute inset-0 bg-white/50 dark:bg-brand-gray-800/50 flex items-center justify-center rounded-lg">
                    <span className="bg-red-600 text-white font-bold py-1 px-3 rounded-full text-sm shadow-lg">{t('customer_item_card_sold_out')}</span>
                </div>
            )}
        </div>
    );
};

export default CustomerItemRow;