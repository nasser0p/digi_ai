import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RestaurantProfile, Role } from '../types';
import StaffManager from './StaffManager';
import { useTranslation } from '../contexts/LanguageContext';
import AppearanceSettings from './settings/AppearanceSettings';
import ProfileSettings from './settings/ProfileSettings';
import PrintSettings from './settings/PrintSettings';
import LoadingSpinner from './ui/LoadingSpinner';
import TaxSettings from './settings/TaxSettings';

interface SettingsPageProps {
    userId: string;
    onProfileUpdate: (profile: RestaurantProfile) => void;
    role: Role | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ userId, onProfileUpdate, role }) => {
    const { t } = useTranslation();
    const [profile, setProfile] = useState<RestaurantProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        if (!userId) return;
        
        const fetchProfile = async () => {
            setLoading(true);
            const docRef = doc(db, 'restaurantProfiles', userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = { ...docSnap.data(), id: docSnap.id } as RestaurantProfile;
                setProfile(data);
                onProfileUpdate(data);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [userId]);

    const handleProfileSave = (updatedProfile: RestaurantProfile) => {
        setProfile(updatedProfile);
        onProfileUpdate(updatedProfile);
    }


    if (loading) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }
    
    if (role !== 'admin') {
         return <div className="flex justify-center items-center h-full text-brand-gray-500">{t('common_permission_denied')}</div>;
    }
    
    if (!profile) {
        return <div className="flex justify-center items-center h-full text-brand-gray-500">{t('settings_user_not_found')}</div>;
    }
    
    const TabButton = ({ view, label }: { view: string; label: string }) => (
        <button
            type="button"
            onClick={() => setActiveTab(view)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeTab === view
                    ? 'bg-brand-teal text-white shadow-sm'
                    : 'text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700'
            }`}
        >
            {label}
        </button>
    );

    const renderContent = () => {
        switch(activeTab) {
            case 'profile':
                return <ProfileSettings userId={userId} profile={profile} onSave={handleProfileSave} />;
            case 'appearance':
                return <AppearanceSettings userId={userId} profile={profile} onSave={handleProfileSave} />;
            case 'staff':
                return <StaffManager ownerId={userId} />;
            case 'taxes':
                return <TaxSettings userId={userId} profile={profile} onSave={handleProfileSave} />;
            case 'print':
                return <PrintSettings userId={userId} profile={profile} onSave={handleProfileSave} />;
            default:
                return null;
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex space-x-2 rtl:space-x-reverse bg-brand-gray-200 dark:bg-brand-gray-900 p-1 rounded-lg self-start">
                <TabButton view="profile" label={t('settings_tab_profile')} />
                <TabButton view="appearance" label={t('settings_tab_appearance')} />
                <TabButton view="staff" label={t('settings_tab_staff')} />
                <TabButton view="taxes" label="Taxes & Fees" />
                <TabButton view="print" label={t('settings_tab_print')} />
            </div>

            <div className="mt-4">
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsPage;