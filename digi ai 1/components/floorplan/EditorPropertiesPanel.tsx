import React, { useState, useEffect, useRef } from 'react';
import { FloorPlanTable, RestaurantProfile } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { RotateCwIcon } from '../icons';
import TableQRCodeModal from './TableQRCodeModal';

interface EditorPropertiesPanelProps {
    table: FloorPlanTable;
    onUpdate: (tableId: string, updates: Partial<FloorPlanTable>) => void;
    onDelete: (tableId: string) => void;
    restaurantId: string;
    profile: RestaurantProfile | null;
}

const EditorPropertiesPanel: React.FC<EditorPropertiesPanelProps> = ({ table, onUpdate, onDelete, restaurantId, profile }) => {
    const { t } = useTranslation();
    const [showQRModal, setShowQRModal] = useState(false);
    const labelInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (table) {
            labelInputRef.current?.focus();
            labelInputRef.current?.select();
        }
    }, [table]);

    const handleUpdate = (field: keyof FloorPlanTable, value: any) => {
        onUpdate(table.id, { [field]: value });
    };

    return (
        <>
            <div className="w-64 flex-shrink-0 bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow-md space-y-4">
                <h3 className="font-bold border-b border-brand-gray-200 dark:border-brand-gray-700 pb-2">{t('floor_plan_editor_title')}</h3>
                
                <div>
                    <label htmlFor="label" className="text-sm font-medium">{t('floor_plan_table_label')}</label>
                    <input ref={labelInputRef} type="text" id="label" value={table.label} onChange={(e) => handleUpdate('label', e.target.value)} className="mt-1 w-full text-sm p-1.5 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label htmlFor="width" className="text-sm font-medium">{t('floor_plan_table_size').split(' ')[0]}</label>
                        <input type="number" id="width" value={table.width} onChange={(e) => handleUpdate('width', parseInt(e.target.value, 10))} className="mt-1 w-full text-sm p-1.5 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                    </div>
                     <div>
                        <label htmlFor="height" className="text-sm font-medium">{t('floor_plan_table_size').split(' ')[1]}</label>
                        <input type="number" id="height" value={table.height} onChange={(e) => handleUpdate('height', parseInt(e.target.value, 10))} className="mt-1 w-full text-sm p-1.5 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                    </div>
                </div>

                <div>
                    <label htmlFor="rotation" className="text-sm font-medium">{t('floor_plan_table_rotation')}</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input type="range" id="rotation" min="0" max="270" step="90" value={table.rotation || 0} onChange={(e) => handleUpdate('rotation', parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                        <span className="text-xs font-mono w-10 text-center">{table.rotation || 0}°</span>
                    </div>
                </div>

                <div className="pt-2 space-y-2">
                     <button
                        onClick={() => setShowQRModal(true)}
                        className="w-full text-sm font-semibold py-2 px-4 rounded-lg border border-brand-teal text-brand-teal hover:bg-brand-teal/10"
                    >
                        {t('floor_plan_generate_qr')}
                    </button>
                    <button
                        onClick={() => onDelete(table.id)}
                        className="w-full text-sm font-semibold py-2 px-4 rounded-lg border border-red-500 text-red-500 hover:bg-red-500/10"
                    >
                        {t('floor_plan_table_delete')}
                    </button>
                </div>
            </div>
            {showQRModal && (
                <TableQRCodeModal
                    table={table}
                    restaurantId={restaurantId}
                    profile={profile}
                    onClose={() => setShowQRModal(false)}
                />
            )}
        </>
    );
};

export default EditorPropertiesPanel;
