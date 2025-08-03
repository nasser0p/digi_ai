

import React, { useState } from 'react';
import { ModifierGroup, ModifierOption } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface ModifierManagerProps {
    initialGroups: ModifierGroup[];
    onChange: (groups: ModifierGroup[]) => void;
}

const ModifierManager: React.FC<ModifierManagerProps> = ({ initialGroups, onChange }) => {
    const { t } = useTranslation();
    const [groups, setGroups] = useState<ModifierGroup[]>(initialGroups);

    const updateGroups = (newGroups: ModifierGroup[]) => {
        setGroups(newGroups);
        onChange(newGroups);
    }

    const addGroup = () => {
        const newGroup: ModifierGroup = {
            id: `group_${Date.now()}`,
            name: t('modifier_manager_new_group_default'),
            selectionType: 'single',
            options: [],
        };
        updateGroups([...groups, newGroup]);
    };
    
    const deleteGroup = (groupId: string) => {
        updateGroups(groups.filter(g => g.id !== groupId));
    };

    const updateGroup = (groupId: string, field: keyof ModifierGroup, value: any) => {
        updateGroups(groups.map(g => g.id === groupId ? { ...g, [field]: value } : g));
    };
    
    const addOption = (groupId: string) => {
        const newOption: ModifierOption = { id: `option_${Date.now()}`, name: t('modifier_manager_new_option_default'), price: 0 };
        updateGroups(groups.map(g => g.id === groupId ? { ...g, options: [...g.options, newOption] } : g));
    };

    const deleteOption = (groupId: string, optionId: string) => {
        updateGroups(groups.map(g => g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g));
    };

    const updateOption = (groupId: string, optionId: string, field: keyof ModifierOption, value: any) => {
        updateGroups(groups.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    options: g.options.map(o => o.id === optionId ? { ...o, [field]: value } : o)
                }
            }
            return g;
        }));
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-brand-gray-700 dark:text-brand-gray-200">{t('modifier_manager_title')}</h3>
            <div className="space-y-4">
                {groups.map(group => (
                    <div key={group.id} className="p-4 bg-brand-gray-50 dark:bg-brand-gray-700/50 rounded-lg border border-brand-gray-200 dark:border-brand-gray-600">
                        <div className="flex items-center justify-between mb-3">
                            <input
                                type="text"
                                value={group.name}
                                onChange={e => updateGroup(group.id, 'name', e.target.value)}
                                className="font-semibold text-md bg-transparent focus:outline-none focus:ring-0 border-b border-dashed border-brand-gray-400"
                            />
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <select value={group.selectionType} onChange={e => updateGroup(group.id, 'selectionType', e.target.value)} className="text-xs bg-white dark:bg-brand-gray-600 border border-brand-gray-300 dark:border-brand-gray-500 rounded p-1">
                                    <option value="single">{t('modifier_manager_single_choice')}</option>
                                    <option value="multiple">{t('modifier_manager_multiple_choice')}</option>
                                </select>
                                <button type="button" onClick={() => deleteGroup(group.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">{t('common_remove')}</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {group.options.map(option => (
                                <div key={option.id} className="flex items-center justify-between gap-2">
                                    <input
                                        type="text"
                                        value={option.name}
                                        placeholder={t('modifier_manager_option_name_placeholder')}
                                        onChange={e => updateOption(group.id, option.id, 'name', e.target.value)}
                                        className="text-sm flex-grow px-2 py-1 bg-white dark:bg-brand-gray-600 border border-brand-gray-300 dark:border-brand-gray-500 rounded"
                                    />
                                    <div className="flex items-center">
                                       <span className="text-sm mx-1 text-brand-gray-500">+ OMR</span>
                                       <input
                                            type="number"
                                            value={option.price}
                                            step="0.001"
                                            onChange={e => updateOption(group.id, option.id, 'price', parseFloat(e.target.value) || 0)}
                                            className="text-sm w-20 px-2 py-1 bg-white dark:bg-brand-gray-600 border border-brand-gray-300 dark:border-brand-gray-500 rounded"
                                        />
                                    </div>
                                    <button type="button" onClick={() => deleteOption(group.id, option.id)} className="text-red-500 hover:text-red-700 p-1">&times;</button>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={() => addOption(group.id)} className="mt-3 text-xs text-brand-teal hover:text-brand-teal-dark font-semibold">{t('modifier_manager_add_option')}</button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={addGroup} className="w-full text-sm font-semibold py-2 px-4 rounded-lg border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 text-brand-gray-500 hover:border-brand-teal hover:text-brand-teal">
                {t('modifier_manager_add_group')}
            </button>
        </div>
    );
};

export default ModifierManager;