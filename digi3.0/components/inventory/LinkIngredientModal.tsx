import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Ingredient, RecipeItem } from '../../types';
import Modal from '../Modal';
import { useTranslation } from '../../contexts/LanguageContext';

interface LinkIngredientModalProps {
    userId: string;
    onClose: () => void;
    onLinkIngredient: (ingredient: Ingredient, quantity: number) => void;
    existingRecipeItems: RecipeItem[];
}

const LinkIngredientModal: React.FC<LinkIngredientModalProps> = ({ userId, onClose, onLinkIngredient, existingRecipeItems }) => {
    const { t } = useTranslation();
    const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
    const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'ingredients'), where('userId', '==', userId));
        const unsubscribe = onSnapshot(q, snapshot => {
            setAllIngredients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ingredient)));
        });
        return unsubscribe;
    }, [userId]);

    useEffect(() => {
        const existingIds = new Set(existingRecipeItems.map(item => item.ingredientId));
        const available = allIngredients.filter(ing => !existingIds.has(ing.id));
        setFilteredIngredients(
            available.filter(ing => ing.name.toLowerCase().includes(search.toLowerCase()))
        );
    }, [search, allIngredients, existingRecipeItems]);

    const handleLink = () => {
        if (selectedIngredient && quantity > 0) {
            onLinkIngredient(selectedIngredient, quantity);
            onClose();
        }
    };
    
    return (
        <Modal onClose={onClose}>
            <div className="p-2 space-y-4">
                <h3 className="text-lg font-bold">{t('inventory_link_modal_title')}</h3>
                {!selectedIngredient ? (
                    <>
                        <input
                            type="text"
                            placeholder={t('inventory_link_modal_search')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                        />
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {filteredIngredients.map(ing => (
                                <button key={ing.id} onClick={() => setSelectedIngredient(ing)} className="w-full text-left p-2 rounded-md hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">
                                    {ing.name} <span className="text-sm text-brand-gray-400">({ing.category})</span>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div>
                        <p className="mb-2">{t('inventory_link_modal_quantity_for', selectedIngredient.name)}</p>
                         <div className="flex items-center gap-2">
                             <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md"
                                min="0.001"
                                step="any"
                            />
                            <span className="font-semibold text-brand-gray-500">{selectedIngredient.unit}</span>
                        </div>
                    </div>
                )}
                
                 <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="bg-brand-gray-200 dark:bg-brand-gray-600 text-brand-gray-800 dark:text-brand-gray-100 font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500">
                        {t('common_cancel')}
                    </button>
                    <button type="button" onClick={handleLink} disabled={!selectedIngredient} className="bg-brand-teal text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal-dark disabled:bg-teal-300">
                        {t('inventory_link_modal_button')}
                    </button>
                </div>
            </div>
        </Modal>
    )
};

export default LinkIngredientModal;
