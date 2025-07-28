import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { RestaurantProfile } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';

interface ProfileSettingsProps {
    userId: string;
    profile: RestaurantProfile;
    onSave: (updatedProfile: RestaurantProfile) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ userId, profile, onSave }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState(profile);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl || null);
    const [logoPreview, setLogoPreview] = useState<string | null>(profile.logoUrl || null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setFormData(profile);
        setAvatarPreview(profile.avatarUrl || null);
        setLogoPreview(profile.logoUrl || null);
    }, [profile]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'logo') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'avatar') {
                    setAvatarFile(file);
                    setAvatarPreview(reader.result as string);
                } else {
                    setLogoFile(file);
                    setLogoPreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            let updatedData = { ...formData };

            if (avatarFile) {
                const avatarRef = ref(storage, `avatars/${userId}/${avatarFile.name}`);
                const snapshot = await uploadBytes(avatarRef, avatarFile);
                updatedData.avatarUrl = await getDownloadURL(snapshot.ref);
            }
            if (logoFile) {
                const logoRef = ref(storage, `logos/${userId}/${logoFile.name}`);
                const snapshot = await uploadBytes(logoRef, logoFile);
                updatedData.logoUrl = await getDownloadURL(snapshot.ref);
            }

            const profileRef = doc(db, 'restaurantProfiles', userId);
            await setDoc(profileRef, updatedData, { merge: true });
            
            onSave(updatedData);
            setAvatarFile(null);
            setLogoFile(null);
            setMessage(t('settings_update_success'));

        } catch (error) {
            console.error("Error saving profile:", error);
            setMessage(t('settings_update_error'));
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const defaultAvatar = 'https://placehold.co/100x100/1f2937/374151?text=AV';
    const defaultLogo = 'https://placehold.co/400x200/1f2937/e5e7eb?text=Logo';

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md space-y-8">
            {/* Account Settings */}
            <div data-tour-id="settings-branding">
                <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white">{t('settings_account_title')}</h2>
                <p className="text-sm text-brand-gray-500">{t('settings_account_desc')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">{t('settings_info_label')}</label>
                        <div className="space-y-3 mt-2">
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder={t('settings_name_label')} className="w-full text-sm p-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                            <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder={t('settings_address_label')} className="w-full text-sm p-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                            <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder={t('settings_phone_label')} className="w-full text-sm p-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">{t('settings_avatar_label')}</label>
                        <div className="mt-2 flex items-center gap-4">
                            <img src={avatarPreview || defaultAvatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                             <label htmlFor="avatar-upload" className="cursor-pointer bg-white dark:bg-brand-gray-700 py-2 px-3 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm text-sm font-medium text-brand-gray-700 dark:text-brand-gray-200 hover:bg-brand-gray-50 dark:hover:bg-brand-gray-600">
                                <span>{t('settings_change_button')}</span>
                                <input id="avatar-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'avatar')} accept="image/*" />
                            </label>
                        </div>
                    </div>
                </div>
                 <div className="mt-6">
                    <label className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">{t('settings_logo_label')}</label>
                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                        <div className="w-48 h-24 rounded-md border border-brand-gray-200 dark:border-brand-gray-700 flex items-center justify-center p-1">
                            <img src={logoPreview || defaultLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                         <label htmlFor="logo-upload" className="cursor-pointer bg-white dark:bg-brand-gray-700 py-2 px-3 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm text-sm font-medium text-brand-gray-700 dark:text-brand-gray-200 hover:bg-brand-gray-50 dark:hover:bg-brand-gray-600">
                            <span>{t('settings_change_button')}</span>
                            <input id="logo-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'logo')} accept="image/*" />
                        </label>
                    </div>
                </div>
            </div>

            {/* Customer Experience */}
            <div className="border-t border-brand-gray-200 dark:border-brand-gray-700 pt-6">
                <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white">{t('settings_experience_label')}</h2>
                <div className="mt-4 space-y-4">
                    <label htmlFor="tracking-toggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" id="tracking-toggle" name="isLiveTrackingEnabled" checked={!!formData.isLiveTrackingEnabled} onChange={handleChange} className="sr-only" />
                            <div className={`block w-12 h-6 rounded-full transition-colors ${formData.isLiveTrackingEnabled ? 'bg-brand-teal' : 'bg-brand-gray-300 dark:bg-brand-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isLiveTrackingEnabled ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium">{t('settings_tracking_toggle')}</p>
                            <p className="text-xs text-brand-gray-500">{t('settings_tracking_desc')}</p>
                        </div>
                    </label>
                </div>
            </div>
            
             <div className="flex justify-end items-center gap-4 pt-4 border-t border-brand-gray-200 dark:border-brand-gray-700">
                {message && <p className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
                <button type="submit" disabled={saving} className="bg-brand-teal text-white font-bold py-2 px-6 rounded-lg text-sm hover:bg-brand-teal-dark disabled:bg-teal-300">
                    {saving ? t('common_saving') : t('settings_save_profile_button')}
                </button>
            </div>
        </form>
    );
};

export default ProfileSettings;
