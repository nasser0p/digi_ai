import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { MenuItem, Category, Role } from '../../types';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import MenuItemGrid from './MenuItemGrid';
import CategoryManager from '../CategoryManager';
import SlideInPanel from '../ui/SlideInPanel';
import MenuForm from '../MenuForm';
import MenuItemList from './MenuItemList';
import { GridIcon, ListIcon } from '../icons';
import TemplateGenerator from '../FirebaseSeed';
import { useTranslation } from '../../contexts/LanguageContext';

interface MenuPageProps {
    userId: string;
    role: Role | null;
    menuItems: MenuItem[];
    categories: Category[];
}

type MenuSubView = 'items' | 'categories';
type ItemView = 'grid' | 'list';

const MenuPage: React.FC<MenuPageProps> = ({ userId, role, menuItems, categories }) => {
    const { t } = useTranslation();
    const [activeView, setActiveView] = useState<MenuSubView>('items');
    const [itemView, setItemView] = useState<ItemView>('grid');
    
    // Slide-in panel state
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    const canEdit = role === 'admin' || role === 'manager';
    
    const handleEditItem = (item: MenuItem) => {
        if (!canEdit) return;
        setEditingItem(item);
        setIsPanelOpen(true);
    };

    const handleAddNewItem = () => {
        if (!canEdit) return;
        if (categories.length === 0) {
            alert(t('menu_page_alert_add_category_first'));
            return;
        }
        setEditingItem(null);
        setIsPanelOpen(true);
    };

    const onDragEnd = (result: DropResult) => {
        if (!canEdit) return;

        const { source, destination, type } = result;
        if (!destination) return;

        if (type === 'CATEGORY' && activeView === 'categories') {
            const reorderedCategories = Array.from(categories);
            const [movedCategory] = reorderedCategories.splice(source.index, 1);
            reorderedCategories.splice(destination.index, 0, movedCategory);
            
            const batch = writeBatch(db);
            reorderedCategories.forEach((cat, index) => {
                const docRef = doc(db, 'categories', cat.id);
                batch.update(docRef, { order: index });
            });
            batch.commit();
        }

        if (type === 'ITEM' && activeView === 'items') {
            const sourceCategoryName = source.droppableId;
            const destCategoryName = destination.droppableId;
            
            let allItems = Array.from(menuItems);
            const [movedItem] = allItems.filter(i => i.id === result.draggableId);

            if (!movedItem) return;

            const sourceItems = allItems.filter(i => i.category === sourceCategoryName && i.id !== movedItem.id).sort((a, b) => a.order - b.order);
            const destItems = allItems.filter(i => i.category === destCategoryName && i.id !== movedItem.id).sort((a, b) => a.order - b.order);
            
            const batch = writeBatch(db);

            if (sourceCategoryName === destCategoryName) {
                sourceItems.splice(destination.index, 0, movedItem);
                sourceItems.forEach((item, index) => {
                    const docRef = doc(db, 'menuItems', item.id);
                    batch.update(docRef, { order: index });
                });
            } else {
                movedItem.category = destCategoryName;
                destItems.splice(destination.index, 0, movedItem);
                
                sourceItems.forEach((item, index) => {
                    const docRef = doc(db, 'menuItems', item.id);
                    batch.update(docRef, { order: index });
                });

                destItems.forEach((item, index) => {
                    const docRef = doc(db, 'menuItems', item.id);
                    batch.update(docRef, { category: destCategoryName, order: index });
                });
            }
            batch.commit();
        }
    };
    
    const TabButton = ({ view, label }: { view: MenuSubView; label: string }) => (
        <button
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 text-sm font-semibold rounded-md ${
                activeView === view
                    ? 'bg-brand-teal text-white'
                    : 'text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700'
            }`}
        >
            {label}
        </button>
    );

    const ViewToggleButton = ({ view, icon: Icon, currentView, setView }: { view: ItemView; icon: React.FC<any>; currentView: ItemView, setView: (view: ItemView) => void }) => (
        <button
            onClick={() => setView(view)}
            className={`p-1.5 rounded-md transition-colors ${
                currentView === view
                    ? 'bg-brand-teal text-white'
                    : 'text-brand-gray-500 dark:text-brand-gray-400 hover:bg-brand-gray-300 dark:hover:bg-brand-gray-700'
            }`}
            aria-label={t('menu_page_view_toggle_aria', view)}
        >
            <Icon className="w-5 h-5" />
        </button>
    );
    
    const renderItemsView = () => {
        if (categories.length === 0 && canEdit) {
            return (
                <div className="text-center py-16 px-6 bg-white dark:bg-brand-gray-900 rounded-xl shadow-md">
                    <h3 className="text-2xl font-bold text-brand-gray-700 dark:text-brand-gray-200">
                        {t('menu_page_no_categories_title')}
                    </h3>
                    <p className="mt-2 text-brand-gray-500 max-w-md mx-auto">
                        {t('menu_page_no_categories_desc')}
                    </p>
                    <div className="mt-8">
                        <TemplateGenerator userId={userId} />
                    </div>
                </div>
            );
        }

        if (itemView === 'grid') {
            return (
                <MenuItemGrid 
                    categories={categories}
                    menuItems={menuItems}
                    onEditItem={handleEditItem}
                />
            );
        }
        return (
            <MenuItemList
                categories={categories}
                menuItems={menuItems}
                onEditItem={handleEditItem}
            />
        );
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div>
                 <div className="flex justify-between items-center mb-6">
                    <div data-tour-id="menu-page-tabs" className="flex space-x-2 bg-brand-gray-200 dark:bg-brand-gray-900 p-1 rounded-lg">
                        <TabButton view="items" label={t('menu_page_items_tab')} />
                        {canEdit && <TabButton view="categories" label={t('menu_page_categories_tab')} />}
                    </div>
                    {activeView === 'items' && canEdit && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-1 bg-brand-gray-200 dark:bg-brand-gray-900 p-1 rounded-lg">
                                <ViewToggleButton view="grid" icon={GridIcon} currentView={itemView} setView={setItemView} />
                                <ViewToggleButton view="list" icon={ListIcon} currentView={itemView} setView={setItemView} />
                            </div>
                            <button data-tour-id="menus-add-item-btn" onClick={handleAddNewItem} className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-2 px-4 rounded-lg text-sm">
                                {t('menu_page_add_item_button')}
                            </button>
                        </div>
                    )}
                </div>

                {activeView === 'items' ? (
                    renderItemsView()
                ) : (
                    <CategoryManager 
                        userId={userId}
                        categories={categories}
                    />
                )}
            </div>

            <SlideInPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)}>
                {isPanelOpen && canEdit && ( // Render form only when panel is open and user can edit
                     <MenuForm
                        item={editingItem}
                        onClose={() => setIsPanelOpen(false)}
                        userId={userId}
                        categories={categories}
                        menuItems={menuItems}
                    />
                )}
            </SlideInPanel>
        </DragDropContext>
    );
};

export default MenuPage;