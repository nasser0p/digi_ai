import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { RestaurantProfile, PrintSettings, Order } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import PrintPreview from './PrintPreview';

interface PrintSettingsProps {
    userId: string;
    profile: RestaurantProfile;
    onSave: (updatedProfile: RestaurantProfile) => void;
}

const PrintSettings: React.FC<PrintSettingsProps> = ({ userId, profile, onSave }) => {
    const { t } = useTranslation();

    const defaultSettings: PrintSettings = {
        headerText: t('printable_ticket_default_header'),
        footerText: t('printable_ticket_default_footer'),
        fontSize: 'xs',
        showRestaurantName: true,
        showStoreName: true,
        showPlateNumber: true,
        showOrderId: true,
        showDateTime: true,
        showUrgentBanner: true,
        showQRCode: false,
    };

    const [settings, setSettings] = useState<PrintSettings>(profile.printSettings || defaultSettings);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setSettings(prev => ({...prev, [name]: (e.target as HTMLInputElement).checked}));
        } else {
            setSettings(prev => ({...prev, [name]: value}));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const updatedProfile = { ...profile, printSettings: settings };
            await setDoc(doc(db, 'restaurantProfiles', userId), { printSettings: settings }, { merge: true });
            onSave(updatedProfile);
            setMessage(t('settings_update_success'));
        } catch (error) {
             console.error("Error saving print settings:", error);
             setMessage(t('settings_update_error'));
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const Toggle = ({ name, label, checked }: { name: keyof PrintSettings, label: string, checked: boolean}) => (
        <label htmlFor={name} className="flex justify-between items-center cursor-pointer p-3 bg-brand-gray-50 dark:bg-brand-gray-800 rounded-lg">
            <span className="text-sm font-medium">{label}</span>
            <div className="relative">
                <input type="checkbox" id={name} name={name} checked={checked} onChange={handleChange} className="sr-only" />
                <div className={`block w-10 h-5 rounded-full transition-colors ${checked ? 'bg-brand-teal' : 'bg-brand-gray-300 dark:bg-brand-gray-600'}`}></div>
                <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-5' : ''}`}></div>
            </div>
        </label>
    );

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                 <div className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-1">{t('settings_print_title')}</h2>
                        <p className="text-sm text-brand-gray-500">{t('settings_print_desc')}</p>
                    </div>
                    <div className="space-y-4 border-t border-brand-gray-200 dark:border-brand-gray-700 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="headerText" className="block text-sm font-medium">{t('settings_print_header_label')}</label>
                                <input type="text" name="headerText" id="headerText" value={settings.headerText} onChange={handleChange} className="mt-1 w-full text-sm p-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                            </div>
                            <div>
                                <label htmlFor="footerText" className="block text-sm font-medium">{t('settings_print_footer_label')}</label>
                                <input type="text" name="footerText" id="footerText" value={settings.footerText} onChange={handleChange} className="mt-1 w-full text-sm p-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                            </div>
                        </div>
                        <div>
                           <label htmlFor="fontSize" className="block text-sm font-medium">{t('settings_print_font_size_label')}</label>
                           <select name="fontSize" id="fontSize" value={settings.fontSize} onChange={handleChange} className="mt-1 w-full text-sm p-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md">
                               <option value="xs">{t('settings_font_small')}</option>
                               <option value="sm">{t('settings_font_medium')}</option>
                               <option value="base">{t('settings_font_large')}</option>
                           </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Toggle name="showRestaurantName" label={t('settings_print_show_restaurant_name')} checked={settings.showRestaurantName} />
                            <Toggle name="showStoreName" label={t('settings_print_show_store_name')} checked={settings.showStoreName} />
                            <Toggle name="showPlateNumber" label={t('settings_print_show_plate')} checked={settings.showPlateNumber} />
                            <Toggle name="showOrderId" label={t('settings_print_show_order_id')} checked={settings.showOrderId} />
                            <Toggle name="showDateTime" label={t('settings_print_show_datetime')} checked={settings.showDateTime} />
                            <Toggle name="showUrgentBanner" label={t('settings_print_show_urgent')} checked={settings.showUrgentBanner} />
                            <Toggle name="showQRCode" label={t('settings_print_show_qr')} checked={settings.showQRCode} />
                        </div>
                    </div>
                     <div className="flex justify-end items-center gap-4 pt-4 border-t border-brand-gray-200 dark:border-brand-gray-700">
                        {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
                        <button type="submit" disabled={saving} className="bg-brand-teal text-white font-bold py-2 px-6 rounded-lg text-sm hover:bg-brand-teal-dark disabled:bg-teal-300">
                            {saving ? t('common_saving') : t('settings_save_profile_button')}
                        </button>
                    </div>
                 </div>

                 <div>
                    <h3 className="text-lg font-bold mb-2">{t('settings_print_preview_label')}</h3>
                    <div className="bg-brand-gray-200 dark:bg-brand-gray-800 p-4 rounded-xl flex justify-center">
                        <PrintPreview settings={settings} profile={profile} />
                    </div>
                 </div>
            </div>
        </form>
    );
};

export default PrintSettings;
