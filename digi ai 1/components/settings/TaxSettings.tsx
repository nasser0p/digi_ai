import React, { useState, useEffect } from 'react';
import { doc, setDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { RestaurantProfile, Tax } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';

interface TaxSettingsProps {
    userId: string;
    profile: RestaurantProfile;
    onSave: (updatedProfile: RestaurantProfile) => void;
}

const TaxSettings: React.FC<TaxSettingsProps> = ({ userId, profile, onSave }) => {
    const { t } = useTranslation();
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [newTaxName, setNewTaxName] = useState('');
    const [newTaxRate, setNewTaxRate] = useState(0);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const taxQuery = query(collection(db, 'taxes'), where('userId', '==', userId));
        const unsubscribe = onSnapshot(taxQuery, (snapshot) => {
            const fetchedTaxes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tax));
            setTaxes(fetchedTaxes);
        });
        return unsubscribe;
    }, [userId]);

    const handleAddTax = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaxName.trim() || newTaxRate <= 0) return;

        const docRef = doc(collection(db, 'taxes'));
        const newTax: Tax = {
            id: docRef.id,
            userId,
            name: newTaxName.trim(),
            rate: newTaxRate,
            isDefault: false,
        };
        await setDoc(docRef, newTax);
        setNewTaxName('');
        setNewTaxRate(0);
    };

    const handleDeleteTax = async (taxId: string) => {
        if (window.confirm("Are you sure you want to delete this tax?")) {
            await deleteDoc(doc(db, 'taxes', taxId));
            // Also remove it from profile if it was applied
            const updatedAppliedIds = profile.appliedTaxIds?.filter(id => id !== taxId) || [];
            handleSaveAppliedTaxes(updatedAppliedIds);
        }
    };

    const handleToggleDefault = (taxId: string) => {
        const currentApplied = profile.appliedTaxIds || [];
        const isApplied = currentApplied.includes(taxId);
        const newAppliedIds = isApplied 
            ? currentApplied.filter(id => id !== taxId)
            : [...currentApplied, taxId];
        handleSaveAppliedTaxes(newAppliedIds);
    };

    const handleSaveAppliedTaxes = async (appliedTaxIds: string[]) => {
        setSaving(true);
        setMessage('');
        try {
            const updatedProfile = { ...profile, appliedTaxIds };
            await setDoc(doc(db, 'restaurantProfiles', userId), { appliedTaxIds }, { merge: true });
            onSave(updatedProfile);
            setMessage(t('settings_update_success'));
        } catch (error) {
            console.error("Error saving applied taxes:", error);
            setMessage(t('settings_update_error'));
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 2000);
        }
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-4">Add New Tax</h3>
                <form onSubmit={handleAddTax} className="space-y-4">
                     <div>
                        <label htmlFor="taxName" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Tax Name</label>
                        <input type="text" id="taxName" value={newTaxName} onChange={e => setNewTaxName(e.target.value)} placeholder="e.g., VAT" required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm" />
                    </div>
                     <div>
                        <label htmlFor="taxRate" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">Rate (%)</label>
                        <input type="number" id="taxRate" value={newTaxRate} onChange={e => setNewTaxRate(parseFloat(e.target.value))} required min="0.01" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm" />
                    </div>
                    <button type="submit" className="w-full bg-brand-teal text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal-dark">{t('common_add')}</button>
                </form>
            </div>
             <div className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md">
                 <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-4">Your Taxes</h3>
                 <p className="text-sm text-brand-gray-500 mb-4">Enable the toggle to apply a tax by default to all new orders.</p>
                 <div className="space-y-3">
                     {taxes.map(tax => (
                        <div key={tax.id} className="flex justify-between items-center p-3 bg-brand-gray-50 dark:bg-brand-gray-800 rounded-lg">
                            <div>
                                <p className="font-semibold">{tax.name}</p>
                                <p className="text-sm text-brand-gray-500">{tax.rate}%</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <label htmlFor={`default-${tax.id}`} className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" id={`default-${tax.id}`} checked={profile.appliedTaxIds?.includes(tax.id) || false} onChange={() => handleToggleDefault(tax.id)} className="sr-only" />
                                        <div className={`block w-10 h-5 rounded-full transition-colors ${profile.appliedTaxIds?.includes(tax.id) ? 'bg-brand-teal' : 'bg-brand-gray-300 dark:bg-brand-gray-600'}`}></div>
                                        <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${profile.appliedTaxIds?.includes(tax.id) ? 'transform translate-x-5' : ''}`}></div>
                                    </div>
                                </label>
                                <button onClick={() => handleDeleteTax(tax.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">{t('common_delete')}</button>
                            </div>
                        </div>
                     ))}
                     {taxes.length === 0 && <p className="text-sm text-center text-brand-gray-500 p-4">No taxes created yet.</p>}
                 </div>
                 {message && <p className={`mt-4 text-sm text-center ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
             </div>
        </div>
    );
};

export default TaxSettings;