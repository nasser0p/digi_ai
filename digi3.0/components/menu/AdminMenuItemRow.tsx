import React from 'react';
import { MenuItem } from '../../types';
import { Draggable } from '@hello-pangea/dnd';
import { GripVerticalIcon } from '../icons';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTranslation } from '../../contexts/LanguageContext';

interface AdminMenuItemRowProps {
    item: MenuItem;
    index: number;
    onEdit: (item: MenuItem) => void;
}

const AdminMenuItemRow: React.FC<AdminMenuItemRowProps> = ({ item, index, onEdit }) => {
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
    
    const placeholderName = item.name.split(' ')[0];

    return (
        <Draggable draggableId={item.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`p-3 flex items-center space-x-4 transition-shadow ${snapshot.isDragging ? 'shadow-lg bg-brand-gray-50 dark:bg-brand-gray-800' : ''} ${!item.isAvailable ? 'opacity-60' : ''}`}
                >
                    <div {...provided.dragHandleProps} className="cursor-grab text-brand-gray-400 hover:text-brand-gray-600" title={t('menu_item_drag_to_reorder')}>
                        <GripVerticalIcon className="w-5 h-5" />
                    </div>
                    <img src={item.imageUrl || `https://placehold.co/128x128/1f2937/e5e7eb?text=${encodeURIComponent(placeholderName)}`} alt={item.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                    <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-brand-gray-800 dark:text-white truncate">{item.name}</h4>
                        <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400">OMR {item.price.toFixed(3)}</p>
                    </div>
                    <div className="flex items-center space-x-4 flex-shrink-0">
                        <label htmlFor={`available-row-${item.id}`} className="flex items-center cursor-pointer select-none" title={item.isAvailable ? t('menu_item_available') : t('menu_item_unavailable')}>
                            <div className="relative">
                                <input type="checkbox" id={`available-row-${item.id}`} className="sr-only" checked={item.isAvailable} onChange={handleToggleAvailability} />
                                <div className={`block w-12 h-6 rounded-full transition-colors ${item.isAvailable ? 'bg-brand-teal' : 'bg-brand-gray-300 dark:bg-brand-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${item.isAvailable ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                        <div className="w-24 text-right">
                           <button onClick={() => onEdit(item)} className="text-sm text-blue-500 hover:text-blue-700 font-medium">{t('common_edit')}</button>
                           <span className="mx-2 text-brand-gray-300 dark:text-brand-gray-600">|</span>
                           <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 font-medium">{t('common_delete')}</button>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

export default AdminMenuItemRow;