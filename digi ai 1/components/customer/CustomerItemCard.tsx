import React from 'react';
import { MenuItem, Promotion } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import PromotionBadge from './promotions/PromotionBadge';

interface CustomerItemCardProps {
    item: MenuItem;
    onSelectItem: (item: MenuItem) => void;
    promotion: Promotion | null;
    enableItemAnimations?: boolean;
}

const CustomerItemCard: React.FC<CustomerItemCardProps> = ({ item, onSelectItem, promotion, enableItemAnimations }) => {
    const { t } = useTranslation();
    const hasOptions = item.modifierGroups && item.modifierGroups.length > 0;

    return (
        <div 
            onClick={() => item.isAvailable && onSelectItem(item)}
            className={`
                bg-white dark:bg-brand-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col group transition-all duration-300
                ${item.isAvailable ? 'hover:shadow-xl hover:-translate-y-1' : 'opacity-60 cursor-not-allowed'}
            `}
        >
            {/* Image container with overlays */}
            <div className="relative">
                {promotion && <PromotionBadge promotion={promotion} />}
                <div className="overflow-hidden">
                    <img 
                        src={item.imageUrl || `https://placehold.co/600x480/1f2937/e5e7eb?text=${encodeURIComponent(item.name)}`} 
                        alt={item.name} 
                        className="w-full h-48 object-cover transition-transform duration-500 ease-in-out group-hover:scale-110" 
                    />
                </div>
                
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

                {/* Price Badge */}
                <div className={`absolute top-3 right-3 bg-brand-customer text-white font-bold text-lg py-1 px-3 rounded-full shadow-lg pointer-events-none ${enableItemAnimations ? 'animate-shimmer' : ''}`}>
                    OMR {item.price.toFixed(3)}
                </div>
                
                {/* Item Name overlaid on image */}
                <div className="absolute bottom-0 left-0 p-4 w-full">
                    <h3 className="font-bold text-xl text-white drop-shadow-md truncate">{item.name}</h3>
                </div>

                {/* Sold out banner */}
                {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-red-600 text-white font-bold py-1 px-4 rounded-full text-lg shadow-lg transform -rotate-6">{t('customer_item_card_sold_out')}</span>
                    </div>
                )}
            </div>
            
            {/* Content Section below image */}
            <div className="p-4 flex-grow flex flex-col">
                <p className="text-brand-gray-600 dark:text-brand-gray-400 text-sm mb-4 flex-grow">{item.description}</p>
                 <button
                    disabled={!item.isAvailable}
                    className="w-full bg-brand-customer text-white font-bold py-2.5 px-4 rounded-lg hover:bg-brand-customer-dark transition-colors mt-auto flex items-center justify-center disabled:bg-brand-gray-400 disabled:cursor-not-allowed"
                >
                    {hasOptions ? t('customer_item_card_select_options') : t('customer_item_card_add_to_cart')}
                    {!hasOptions && item.isAvailable && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ms-2" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default CustomerItemCard;