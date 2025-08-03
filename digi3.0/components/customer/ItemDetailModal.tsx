import React, { useState, useMemo } from 'react';
import { MenuItem, ModifierGroup, ModifierOption, SelectedModifier, CartItem, Promotion } from '../../types';
import Modal from '../Modal';
import { useTranslation } from '../../contexts/LanguageContext';
import PromotionInfo from './promotions/PromotionInfo';
import { XIcon } from '../icons';

interface ItemDetailModalProps {
    item: MenuItem;
    promotion: Promotion | null;
    onClose: () => void;
    onAddToCart: (item: CartItem) => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, promotion, onClose, onAddToCart }) => {
    const { t } = useTranslation();
    const [quantity, setQuantity] = useState(1);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, SelectedModifier[]>>({});
    const [optionQuantities, setOptionQuantities] = useState<Record<string, number>>({}); // For multi-select quantities
    const [notes, setNotes] = useState('');

    const hasQuantityModifiers = useMemo(() => item.modifierGroups?.some(g => g.selectionType === 'multiple'), [item.modifierGroups]);

    const handleOptionChange = (group: ModifierGroup, option: ModifierOption) => {
        setSelectedOptions(prev => ({
            ...prev,
            [group.id]: [{ groupName: group.name, optionName: option.name, optionPrice: option.price }]
        }));
    };

    const handleQuantityChange = (optionId: string, change: number) => {
        setOptionQuantities(prev => {
            const currentQty = prev[optionId] || 0;
            const newQty = Math.max(0, currentQty + change);
            return { ...prev, [optionId]: newQty };
        });
    };
    
    const isOptionSelected = (groupId: string, optionName: string) => {
        return selectedOptions[groupId]?.some(o => o.optionName === optionName) ?? false;
    }

    const totalItemsInCart = useMemo(() => {
        return Object.values(optionQuantities).reduce((sum, qty) => sum + qty, 0);
    }, [optionQuantities]);

    const totalPrice = useMemo(() => {
        if (hasQuantityModifiers) {
            let total = 0;
            Object.entries(optionQuantities).forEach(([optionId, qty]) => {
                if (qty > 0) {
                    const option = item.modifierGroups?.flatMap(g => g.options).find(o => o.id === optionId);
                    if (option) {
                        total += (item.price + option.price) * qty;
                    }
                }
            });
            return total;
        } else {
            const modifiersPrice = Object.values(selectedOptions).flat().reduce((sum, opt) => sum + opt.optionPrice, 0);
            return (item.price + modifiersPrice) * quantity;
        }
    }, [item, selectedOptions, optionQuantities, quantity, hasQuantityModifiers]);

    const handleAddToCartClick = () => {
        if (hasQuantityModifiers) {
            const multiSelectGroups = item.modifierGroups?.filter(g => g.selectionType === 'multiple') || [];
            for (const group of multiSelectGroups) {
                for (const option of group.options) {
                    const qty = optionQuantities[option.id];
                    if (qty && qty > 0) {
                        const selectedModifier: SelectedModifier = {
                            groupName: group.name,
                            optionName: option.name,
                            optionPrice: option.price,
                        };
                        const cartItemId = `${item.id}-${option.id}-${Date.now()}`;
                        
                        const cartItem: CartItem = {
                            cartItemId,
                            id: item.id,
                            name: `${item.name} (${option.name})`,
                            basePrice: item.price,
                            quantity: qty,
                            imageUrl: item.imageUrl,
                            selectedModifiers: [selectedModifier],
                            notes: notes.trim() || undefined,
                        };
                        onAddToCart(cartItem);
                    }
                }
            }
        } else {
            const allSelectedModifiers = Object.values(selectedOptions).flat();
            const modifierIds = allSelectedModifiers.map(m => m.optionName.replace(/\s/g, '')).sort().join('-');
            const cartItemId = `${item.id}-${modifierIds}`;
            const cartItem: CartItem = {
                cartItemId,
                id: item.id,
                name: item.name,
                basePrice: item.price,
                quantity,
                imageUrl: item.imageUrl,
                selectedModifiers: allSelectedModifiers,
                notes: notes.trim() || undefined
            };
            onAddToCart(cartItem);
        }
        onClose();
    };

    return (
        <Modal onClose={onClose}>
            <div className="p-1 max-h-[85vh] flex flex-col relative -m-6">
                 <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full text-brand-gray-500 dark:text-brand-gray-300 bg-white/50 dark:bg-black/50 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700 backdrop-blur-sm"
                    aria-label="Close"
                >
                    <XIcon className="w-5 h-5" />
                </button>
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-48 object-cover rounded-t-lg" />}
                <div className="px-6 pt-4">
                    {promotion && <PromotionInfo promotion={promotion} />}
                    <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white">{item.name}</h2>
                    <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mt-1">{item.description}</p>
                </div>
                
                <div className="mt-4 space-y-4 flex-grow overflow-y-auto px-6">
                    {item.modifierGroups?.map(group => (
                        <div key={group.id}>
                            <div className="flex justify-between items-baseline">
                                 <h3 className="font-semibold text-brand-gray-800 dark:text-brand-gray-200">{group.name}</h3>
                                 <span className="text-xs font-medium bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-300 px-2 py-0.5 rounded-full">
                                    {group.selectionType === 'single' ? t('customer_item_modal_choose_one') : t('customer_item_modal_choose_up_to', group.options.length)}
                                 </span>
                            </div>
                            <div className="mt-2 space-y-2">
                                {group.selectionType === 'multiple' ? (
                                    group.options.map(option => (
                                        <div key={option.id} className="flex items-center justify-between p-3 bg-brand-gray-50 dark:bg-brand-gray-700/50 rounded-md">
                                            <div>
                                                <span className="text-sm text-brand-gray-800 dark:text-brand-gray-100">{option.name}</span>
                                                {option.price > 0 && <span className="text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300"> +OMR {option.price.toFixed(3)}</span>}
                                            </div>
                                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                                <button type="button" onClick={() => handleQuantityChange(option.id, -1)} className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center font-bold text-lg">-</button>
                                                <span className="font-semibold w-5 text-center">{optionQuantities[option.id] || 0}</span>
                                                <button type="button" onClick={() => handleQuantityChange(option.id, 1)} className="w-7 h-7 rounded-full border border-brand-customer bg-brand-customer text-white hover:bg-brand-customer-dark flex items-center justify-center font-bold text-lg">+</button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    group.options.map(option => (
                                        <label key={option.id} className="flex items-center justify-between p-3 bg-brand-gray-50 dark:bg-brand-gray-700/50 rounded-md cursor-pointer has-[:checked]:bg-teal-50 dark:has-[:checked]:bg-teal-900/40 has-[:checked]:ring-2 has-[:checked]:ring-brand-customer transition-all">
                                            <div className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={group.id}
                                                    checked={isOptionSelected(group.id, option.name)}
                                                    onChange={() => handleOptionChange(group, option)}
                                                    className="h-4 w-4 text-brand-customer focus:ring-brand-customer border-brand-gray-300 dark:border-brand-gray-500 rounded-full"
                                                />
                                                <span className="ms-3 text-sm text-brand-gray-800 dark:text-brand-gray-100">{option.name}</span>
                                            </div>
                                            {option.price > 0 && <span className="text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">+OMR {option.price.toFixed(3)}</span>}
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="pt-2">
                        <label htmlFor="itemNotes" className="font-semibold text-brand-gray-800 dark:text-brand-gray-200">{t('customer_checkout_notes_label')}</label>
                        <textarea
                            id="itemNotes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('customer_checkout_notes_placeholder')}
                            rows={2}
                            className="mt-1 block w-full px-3 py-2 text-sm bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-customer focus:border-brand-customer"
                        />
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center justify-between mt-4 border-t border-brand-gray-200 dark:border-brand-gray-700 pt-4 px-6 pb-6">
                    {!hasQuantityModifiers && (
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center font-bold text-lg transition-colors">-</button>
                            <span className="font-bold w-5 text-center text-lg">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 rounded-full border border-brand-customer bg-brand-customer text-white hover:bg-brand-customer-dark flex items-center justify-center font-bold text-lg transition-colors">+</button>
                        </div>
                    )}
                     {hasQuantityModifiers && (
                        <div className="text-lg font-bold">
                            {totalItemsInCart} items
                        </div>
                    )}
                    <button
                        onClick={handleAddToCartClick}
                        disabled={hasQuantityModifiers && totalItemsInCart === 0}
                        className="bg-brand-customer text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-customer-dark transition-colors shadow-lg hover:shadow-xl disabled:bg-brand-gray-400 disabled:cursor-not-allowed"
                    >
                        {t('customer_item_modal_add_to_cart_button', totalPrice.toFixed(3))}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ItemDetailModal;
