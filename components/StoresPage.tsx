import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Store, RestaurantProfile, Role } from '../types';
import { QrCodeIcon } from './icons';
import QRCodeModal from './QRCodeModal';
import { useTranslation } from '../contexts/LanguageContext';

interface StoresPageProps {
    userId: string;
    profile: RestaurantProfile | null;
    stores: Store[];
    role: Role | null;
}

const StoresPage: React.FC<StoresPageProps> = ({ userId, profile, stores, role }) => {
    const { t } = useTranslation();
    const [newStoreName, setNewStoreName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    
    const canEdit = role === 'admin' || role === 'manager';

    const handleAddStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStoreName.trim() || !userId || !canEdit) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "stores"), {
                name: newStoreName,
                userId: userId,
            });
            setNewStoreName('');
        } catch (error) {
            console.error("Error adding store: ", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteStore = async (storeId: string) => {
        if (role !== 'admin') return;

        if (window.confirm(t('stores_page_delete_confirm'))) {
            try {
                await deleteDoc(doc(db, 'stores', storeId));
            } catch (error) {
                console.error("Error deleting store: ", error);
            }
        }
    }
    
    const handleGenerateQR = (store: Store) => {
        setSelectedStore(store);
        setIsModalOpen(true);
    }

    if (!canEdit) {
        return <div className="flex justify-center items-center h-full text-brand-gray-500">{t('common_permission_denied')}</div>;
    }

    return (
        <div className="space-y-6">
            <div data-tour-id="stores-add-form" className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-4">{t('stores_page_add_title')}</h3>
                <form onSubmit={handleAddStore} className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 rtl:space-x-reverse space-y-4 sm:space-y-0">
                    <div className="flex-grow">
                        <label htmlFor="store-name" className="block text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300">{t('stores_page_name_label')}</label>
                        <input
                            id="store-name"
                            type="text"
                            value={newStoreName}
                            onChange={(e) => setNewStoreName(e.target.value)}
                            placeholder={t('stores_page_name_placeholder')}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors disabled:bg-teal-300"
                    >
                        {isSubmitting ? t('stores_page_adding_button') : t('stores_page_add_button')}
                    </button>
                </form>
            </div>

            <div data-tour-id="stores-list" className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-4">{t('stores_page_list_title')}</h3>
                <div className="space-y-3">
                    {stores.length > 0 ? stores.map(store => (
                        <div key={store.id} className="flex justify-between items-center p-4 border border-brand-gray-200 dark:border-brand-gray-700 rounded-lg">
                            <span className="font-semibold">{store.name}</span>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <button onClick={() => handleGenerateQR(store)} title={t('stores_page_qr_title')} className="p-2 rounded-md text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-800">
                                    <QrCodeIcon className="w-5 h-5" />
                                </button>
                                {role === 'admin' && (
                                  <button onClick={() => handleDeleteStore(store.id)} className="text-sm text-red-500 hover:text-red-700">{t('common_delete')}</button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <p className="text-brand-gray-500 dark:text-brand-gray-400">{t('stores_page_no_stores')}</p>
                    )}
                </div>
            </div>
            
            {isModalOpen && selectedStore && (
                <QRCodeModal 
                    store={selectedStore} 
                    restaurantId={userId}
                    profile={profile}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

export default StoresPage;
