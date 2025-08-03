import React from 'react';
import { MenuItem } from '../../types';
import { Draggable } from '@hello-pangea/dnd';
import { GripVerticalIcon } from '../icons';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTranslation } from '../../contexts/LanguageContext';


interface AdminMenuItemCardProps {
    item: MenuItem;
    index: number;
    onEdit: (item: MenuItem) => void;
}

const AdminMenuItemCard: React.FC<AdminMenuItemCardProps> = ({ item, index, onEdit }) => {
    const { t } = useTranslation();
    
    const handleToggleAvailability = async () => {
        const itemRef = doc(db, "menuItems", item.id);
        await updateDoc(itemRef, {
            isAvailable: !item.isAvailable
        });
    };
    
    const handleDelete = async () => {
        if(window.confirm(t('menu_item_delete_confirm'))) {
            await deleteDoc(doc(db, "menuItems", item.id));
        }
    }
    
    return (
        <Draggable draggableId={item.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`bg-white dark:bg-brand-gray-900 rounded-xl shadow-md flex flex-col transition-shadow ${snapshot.isDragging ? 'shadow-2xl' : ''} ${!item.isAvailable ? 'opacity-60' : ''}`}
                >
                    <div className="relative">
                        <img src={item.imageUrl || `https://placehold.co/600x400/1f2937/e5e7eb?text=${encodeURIComponent(item.name)}`} alt={item.name} className="w-full h-40 object-cover rounded-t-xl" />
                        <div 
                           {...provided.dragHandleProps} 
                           className="absolute top-2 left-2 p-1.5 bg-black/30 rounded-full text-white cursor-grab hover:bg-black/50 transition-colors"
                           title={t('menu_item_drag_to_reorder')}
                        >
                            <GripVerticalIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="p-4 flex-grow flex flex-col">
                        <div className="flex justify-between items-start">
                             <h4 className="font-bold text-lg text-brand-gray-800 dark:text-white flex-grow pr-2">{item.name}</h4>
                             <p className="font-semibold text-brand-teal text-lg">OMR {item.price.toFixed(3)}</p>
                        </div>
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mt-1 flex-grow">{item.description}</p>
                        
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-brand-gray-100 dark:border-brand-gray-800">
                             <label htmlFor={`available-${item.id}`} className="flex items-center cursor-pointer select-none">
                                <div className="relative">
                                    <input type="checkbox" id={`available-${item.id}`} className="sr-only" checked={item.isAvailable} onChange={handleToggleAvailability} />
                                    <div className={`block w-12 h-6 rounded-full transition-colors ${item.isAvailable ? 'bg-brand-teal' : 'bg-brand-gray-300 dark:bg-brand-gray-600'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${item.isAvailable ? 'transform translate-x-6' : ''}`}></div>
                                </div>
                                <span className="ml-2 text-xs font-semibold text-brand-gray-600 dark:text-brand-gray-300">
                                    {item.isAvailable ? t('menu_item_available') : t('menu_item_unavailable')}
                                </span>
                            </label>
                            <div className="space-x-2">
                                <button onClick={() => onEdit(item)} className="text-sm text-blue-500 hover:text-blue-700 font-medium">{t('common_edit')}</button>
                                <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 font-medium">{t('common_delete')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

export default AdminMenuItemCard;