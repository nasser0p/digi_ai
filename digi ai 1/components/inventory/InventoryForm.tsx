import React, { useState, useEffect } from 'react';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { Ingredient } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';

interface IngredientFormProps {
    ingredient: Ingredient | null;
    userId: string;
    onClose: () => void;
}

const IngredientForm: React.FC<IngredientFormProps> = ({ ingredient, userId, onClose }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<Omit<Ingredient, 'id' | 'userId'>>({
        name: '',
        category: '',
        unit: 'kg',
        stock: 0,
        lowStockThreshold: 0,
        cost: 0,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (ingredient) {
            setFormData({
                name: ingredient.name,
                category: ingredient.category,
                unit: ingredient.unit,
                stock: ingredient.stock,
                lowStockThreshold: ingredient.lowStockThreshold,
                cost: ingredient.cost || 0,
            });
        } else {
            setFormData({ name: '', category: '', unit: 'kg', stock: 0, lowStockThreshold: 0, cost: 0 });
        }
    }, [ingredient]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'stock' || name === 'lowStockThreshold' || name === 'cost') ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const dataToSave = { ...formData, userId };
        const docRef = ingredient ? doc(db, 'ingredients', ingredient.id) : doc(collection(db, 'ingredients'));
        
        try {
            await setDoc(docRef, { ...dataToSave, id: docRef.id }, { merge: true });
            onClose();
        } catch (error) {
            console.error("Error saving ingredient:", error);
            alert(t('inventory_form_save_error'));
        } finally {
            setLoading(false);
        }
    };
    
    const units: Ingredient['unit'][] = ['kg', 'g', 'L', 'ml', 'piece'];

    return (
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
                <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white">
                    {ingredient ? t('inventory_form_edit_title') : t('inventory_form_add_title')}
                </h2>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('inventory_form_name_label')}</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                </div>
                
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('inventory_form_category_label')}</label>
                    <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} placeholder={t('inventory_form_category_placeholder')} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="unit" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('inventory_form_unit_label')}</label>
                        <select name="unit" id="unit" value={formData.unit} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal">
                           {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="stock" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('inventory_form_stock_label')}</label>
                        <input type="number" name="stock" id="stock" value={formData.stock} onChange={handleChange} required min="0" step="any" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                    </div>
                </div>
                 <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">Cost per Unit (OMR)</label>
                    <input type="number" name="cost" id="cost" value={formData.cost} onChange={handleChange} min="0" step="any" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                </div>
                <div>
                    <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('inventory_form_threshold_label')}</label>
                    <input type="number" name="lowStockThreshold" id="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} required min="0" step="any" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                    <p className="text-xs text-brand-gray-500 mt-1">{t('inventory_form_threshold_desc')}</p>
                </div>
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

export default IngredientForm;
