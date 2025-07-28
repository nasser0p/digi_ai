import React from 'react';
import { MenuItem, Category } from '../../types';
import { Droppable } from '@hello-pangea/dnd';
import AdminMenuItemRow from './AdminMenuItemRow';
import { useTranslation } from '../../contexts/LanguageContext';

interface MenuItemListProps {
    categories: Category[];
    menuItems: MenuItem[];
    onEditItem: (item: MenuItem) => void;
}

const MenuItemList: React.FC<MenuItemListProps> = ({ categories, menuItems, onEditItem }) => {
    const { t } = useTranslation();
    const getItemsForCategory = (categoryName: string) => {
        return menuItems
            .filter(item => item.category === categoryName)
            .sort((a,b) => a.order - b.order);
    }
    
    if (categories.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-brand-gray-500">{t('menu_item_view_no_categories')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {categories.map(category => (
                <div key={category.id}>
                    <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-4">{category.name}</h3>
                    <Droppable droppableId={category.name} type="ITEM">
                        {(provided, snapshot) => (
                             <div 
                                ref={provided.innerRef} 
                                {...provided.droppableProps}
                                className={`bg-white dark:bg-brand-gray-900 rounded-xl shadow-md overflow-hidden divide-y divide-brand-gray-100 dark:divide-brand-gray-800 transition-colors ${snapshot.isDraggingOver ? 'bg-brand-teal/5' : ''}`}
                            >
                                {getItemsForCategory(category.name).map((item, index) => (
                                    <AdminMenuItemRow
                                        key={item.id}
                                        item={item}
                                        index={index}
                                        onEdit={onEditItem}
                                    />
                                ))}
                                {provided.placeholder}
                                 {getItemsForCategory(category.name).length === 0 && (
                                     <div className="text-center p-8 border-2 border-dashed border-brand-gray-200 dark:border-brand-gray-700 m-4 rounded-lg">
                                        <p className="text-brand-gray-400">{t('menu_item_view_drag_prompt')}</p>
                                    </div>
                                 )}
                             </div>
                        )}
                    </Droppable>
                </div>
            ))}
        </div>
    );
};

export default MenuItemList;