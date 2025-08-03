import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { RestaurantProfile } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { XIcon } from '../icons';

interface KitchenSettingsProps {
    userId: string;
    profile: RestaurantProfile;
    onSave: (updatedProfile: RestaurantProfile) => void;
}

const KitchenSettings: React.FC<KitchenSettingsProps> = ({ userId, profile, onSave }) => {
    const { t } = useTranslation();
    const [stations, setStations] = useState(profile.kitchenStations || []);
    const [newStationName, setNewStationName] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleSave = async (updatedStations: {id: string, name: string}[]) => {
        setSaving(true);
        setMessage('');
        try {
            const updatedProfile = { ...profile, kitchenStations: updatedStations };
            await setDoc(doc(db, 'restaurantProfiles', userId), { kitchenStations: updatedStations }, { merge: true });
            onSave(updatedProfile);
            setStations(updatedStations);
            setMessage(t('settings_update_success'));
        } catch (error) {
            console.error("Error saving kitchen stations:", error);
            setMessage(t('settings_update_error'));
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 2000);
        }
    };
    
    const handleAddStation = () => {
        if (!newStationName.trim()) return;
        const newStation = {
            id: `station_${Date.now()}`,
            name: newStationName.trim()
        };
        handleSave([...stations, newStation]);
        setNewStationName('');
    };

    const handleDeleteStation = (stationId: string) => {
        const updatedStations = stations.filter(s => s.id !== stationId);
        handleSave(updatedStations);
    };

    return (
        <div className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-1">{t('settings_kitchen_title')}</h2>
            <p className="text-sm text-brand-gray-500 mb-6">{t('settings_kitchen_desc')}</p>
            
            <div className="space-y-3 mb-6">
                {stations.length > 0 ? stations.map(station => (
                    <div key={station.id} className="flex justify-between items-center p-3 bg-brand-gray-50 dark:bg-brand-gray-800 rounded-lg">
                        <p className="font-semibold">{station.name}</p>
                        <button onClick={() => handleDeleteStation(station.id)} className="text-red-500 hover:text-red-700">
                           <XIcon className="w-5 h-5"/>
                        </button>
                    </div>
                )) : (
                    <p className="text-center text-sm text-brand-gray-400 py-4">{t('settings_kitchen_no_stations')}</p>
                )}
            </div>

            <div className="flex items-center gap-3 border-t border-brand-gray-200 dark:border-brand-gray-700 pt-4">
                <input 
                    type="text"
                    value={newStationName}
                    onChange={e => setNewStationName(e.target.value)}
                    placeholder={t('settings_kitchen_station_name')}
                    className="flex-grow w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm"
                />
                <button onClick={handleAddStation} className="bg-brand-teal text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal-dark">
                    {t('settings_kitchen_add_station')}
                </button>
            </div>
            {message && <p className={`mt-4 text-sm text-center ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
        </div>
    );
};

export default KitchenSettings;