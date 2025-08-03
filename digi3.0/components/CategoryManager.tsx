import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Category } from '../types';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { GripVerticalIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';

interface CategoryManagerProps {
    userId: string;
    categories: Category[];
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ userId, categories }) => {
    const { t } = useTranslation();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newCategoryName.trim();
        if (!trimmedName || !userId) return;

        const isDuplicate = categories.some(
            cat => cat.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (isDuplicate) {
            setMessage({ text: t('category_manager_duplicate_error'), type: 'error' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        setIsSubmitting(true);
        setMessage(null);
        try {
            await addDoc(collection(db, "categories"), {
                name: trimmedName,
                userId: userId,
                order: categories.length,
            });
            setNewCategoryName('');
            setMessage({ text: t('category_manager_add_success'), type: 'success' });
        } catch (error) {
            console.error("Error adding category: ", error);
            setMessage({ text: t('category_manager_add_fail'), type: 'error' });
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (window.confirm(t('category_manager_delete_confirm'))) {
            try {
                await deleteDoc(doc(db, 'categories', categoryId));
            } catch (error) {
                console.error("Error deleting category: ", error);
            }
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-4">
             <div className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-4">{t('category_manager_title')}</h3>
                    <form onSubmit={handleAddCategory}>
                        <div className="flex items-start space-x-2 rtl:space-x-reverse">
                            <div className="flex-grow">
                                <label htmlFor="category-name" className="sr-only">{t('category_manager_name_placeholder')}</label>
                                <input
                                    id="category-name"
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder={t('category_manager_name_placeholder')}
                                    required
                                    className="block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors disabled:bg-teal-300 flex-shrink-0"
                            >
                                {isSubmitting ? t('common_adding') : t('common_add')}
                            </button>
                        </div>
                    </form>
                    {message && (
                        <div className="mt-3 text-sm text-center">
                            <span className={message.type === 'success' ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold'}>
                                {message.text}
                            </span>
                        </div>
                    )}
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-brand-gray-700 dark:text-brand-gray-200 mb-3">{t('category_manager_your_categories')}</h4>
                    <Droppable droppableId="all-categories-list" type="CATEGORY">
                        {(provided) => (
                             <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                {categories.map((cat, index) => (
                                    <Draggable key={cat.id} draggableId={cat.id} index={index}>
                                        {(draggableProvided) => (
                                            <div
                                                ref={draggableProvided.innerRef}
                                                {...draggableProvided.draggableProps}
                                                className="flex justify-between items-center p-3 bg-brand-gray-50 dark:bg-brand-gray-800 border border-brand-gray-200 dark:border-brand-gray-700 rounded-lg"
                                            >
                                                <div className="flex items-center">
                                                    <div {...draggableProvided.dragHandleProps} className="cursor-grab text-brand-gray-400 hover:text-brand-gray-600 me-3">
                                                        <GripVerticalIcon className="w-5 h-5" />
                                                    </div>
                                                    <span className="font-medium text-brand-gray-800 dark:text-brand-gray-100">{cat.name}</span>
                                                </div>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">
                                                    {t('common_delete').toUpperCase()}
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                 {categories.length === 0 && (
                                    <p className="text-sm text-center text-brand-gray-500 dark:text-brand-gray-400 py-4">{t('category_manager_no_categories')}</p>
                                )}
                            </div>
                        )}
                    </Droppable>
                </div>
            </div>
        </div>
    );
};

export default CategoryManager;
