import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { Ingredient, Role } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import SlideInPanel from '../ui/SlideInPanel';
import IngredientForm from './IngredientForm';
import Modal from '../Modal';

interface InventoryPageProps {
    userId: string;
    role: Role | null;
    ingredients: Ingredient[];
}

const AddStockModal: React.FC<{ ingredient: Ingredient; onClose: () => void; }> = ({ ingredient, onClose }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState(0);

    const handleAddStock = async () => {
        if (amount > 0) {
            const ingredientRef = doc(db, 'ingredients', ingredient.id);
            await updateDoc(ingredientRef, {
                stock: increment(amount)
            });
            onClose();
        }
    };

    return (
        <Modal onClose={onClose}>
            <div className="p-4">
                <h3 className="text-lg font-bold mb-2">{t('inventory_add_stock_title', ingredient.name)}</h3>
                <p className="text-sm text-brand-gray-500 mb-4">{t('inventory_add_stock_current', ingredient.stock, ingredient.unit)}</p>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={amount === 0 ? '' : amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="flex-grow block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                        placeholder={t('inventory_add_stock_placeholder', ingredient.unit)}
                    />
                    <span className="font-semibold text-brand-gray-500">{ingredient.unit}</span>
                </div>
                 <div className="flex justify-end space-x-3 mt-6">
                    <button type="button" onClick={onClose} className="bg-brand-gray-200 dark:bg-brand-gray-600 text-brand-gray-800 dark:text-brand-gray-100 font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500">
                        {t('common_cancel')}
                    </button>
                    <button type="button" onClick={handleAddStock} disabled={amount <= 0} className="bg-brand-teal text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal-dark disabled:bg-teal-300">
                        {t('inventory_add_stock_button')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


const InventoryPage: React.FC<InventoryPageProps> = ({ userId, role, ingredients }) => {
    const { t } = useTranslation();
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [stockModalIngredient, setStockModalIngredient] = useState<Ingredient | null>(null);

    const canEdit = role === 'admin' || role === 'manager';

    const handleAddNew = () => {
        if (!canEdit) return;
        setEditingIngredient(null);
        setIsPanelOpen(true);
    };

    const handleEdit = (ingredient: Ingredient) => {
        if (!canEdit) return;
        setEditingIngredient(ingredient);
        setIsPanelOpen(true);
    };

    const handleDelete = async (ingredientId: string) => {
        if (!canEdit) return;
        if (window.confirm(t('inventory_delete_confirm'))) {
            await deleteDoc(doc(db, 'ingredients', ingredientId));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">{t('inventory_page_title')}</h1>
                {canEdit && (
                    <button onClick={handleAddNew} className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-2 px-4 rounded-lg text-sm">
                        {t('inventory_add_button')}
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-brand-gray-900 rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="text-xs text-brand-gray-500 dark:text-brand-gray-400 uppercase bg-brand-gray-50 dark:bg-brand-gray-800">
                            <tr>
                                <th scope="col" className="p-4 font-medium">{t('inventory_col_name')}</th>
                                <th scope="col" className="p-4 font-medium">{t('inventory_col_category')}</th>
                                <th scope="col" className="p-4 font-medium">{t('inventory_col_stock')}</th>
                                <th scope="col" className="p-4 font-medium">Cost / Unit</th>
                                <th scope="col" className="p-4 font-medium">{t('inventory_col_threshold')}</th>
                                <th scope="col" className="p-4 font-medium text-right rtl:text-left">{t('inventory_col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-gray-100 dark:divide-brand-gray-800">
                            {ingredients.map(ingredient => {
                                const isLowStock = ingredient.stock <= ingredient.lowStockThreshold;
                                return (
                                <tr key={ingredient.id} className="hover:bg-brand-gray-50 dark:hover:bg-brand-gray-800/50">
                                    <td className="p-4 font-semibold text-brand-gray-800 dark:text-brand-gray-100">{ingredient.name}</td>
                                    <td className="p-4">{ingredient.category}</td>
                                    <td className={`p-4 font-mono font-bold ${isLowStock ? 'text-red-500' : ''}`}>{ingredient.stock.toFixed(2)} {ingredient.unit}</td>
                                    <td className="p-4 font-mono">
                                        {ingredient.cost ? `OMR ${ingredient.cost.toFixed(3)}` : 'N/A'}
                                    </td>
                                    <td className="p-4 text-brand-gray-500">{ingredient.lowStockThreshold} {ingredient.unit}</td>
                                    <td className="p-4 text-right rtl:text-left space-x-2 rtl:space-x-reverse">
                                        {canEdit && <>
                                            <button onClick={() => setStockModalIngredient(ingredient)} className="text-sm text-green-500 hover:text-green-700 font-medium">{t('inventory_add_stock_action')}</button>
                                            <button onClick={() => handleEdit(ingredient)} className="text-sm text-blue-500 hover:text-blue-700 font-medium">{t('common_edit')}</button>
                                            <button onClick={() => handleDelete(ingredient.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">{t('common_delete')}</button>
                                        </>}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                     {ingredients.length === 0 && (
                        <div className="text-center p-12 text-brand-gray-400">
                            <h3 className="text-lg font-semibold">{t('inventory_no_ingredients_title')}</h3>
                            <p className="mt-1">{t('inventory_no_ingredients_desc')}</p>
                        </div>
                     )}
                </div>
            </div>
            
            <SlideInPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)}>
                {isPanelOpen && canEdit && (
                    <IngredientForm
                        ingredient={editingIngredient}
                        userId={userId}
                        onClose={() => setIsPanelOpen(false)}
                    />
                )}
            </SlideInPanel>
            
            {stockModalIngredient && canEdit && (
                <AddStockModal 
                    ingredient={stockModalIngredient}
                    onClose={() => setStockModalIngredient(null)}
                />
            )}
        </div>
    );
};

export default InventoryPage;