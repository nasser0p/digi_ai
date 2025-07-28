
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RestaurantProfile, StaffMember } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { LogoutIcon } from './icons';

interface SuperAdminPageProps {
    onLogout: () => void;
}

const SuperAdminPage: React.FC<SuperAdminPageProps> = ({ onLogout }) => {
    const { t } = useTranslation();
    const [profiles, setProfiles] = useState<RestaurantProfile[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'locked'>('all');

    useEffect(() => {
        // =========================================================================================
        // !! DEVELOPER NOTE: If you see a "permission-denied" error from this component,         !!
        // !! it means the UID in your `firestorerules.txt` file is NOT set correctly.            !!
        // !! The app code knows you are a Super Admin, but the database doesn't.                 !!
        // !!                                                                                     !!
        // !! FIX: Copy your UID from Firebase Auth and paste it into BOTH `firebase.ts`          !!
        // !! AND `firestorerules.txt`.                                                           !!
        // =========================================================================================
        const profilesQuery = collection(db, 'restaurantProfiles');
        const unsubProfiles = onSnapshot(profilesQuery, (querySnapshot) => {
            const profilesData = querySnapshot.docs.map(d => ({...d.data(), id: d.id } as RestaurantProfile));
            setProfiles(profilesData);
            if(loading) setLoading(false);
        }, (error) => {
             console.error("Super Admin Page Error: Could not fetch restaurant profiles.", error);
             setLoading(false);
        });
        
        const staffQuery = collection(db, 'staff');
        const unsubStaff = onSnapshot(staffQuery, (querySnapshot) => {
            const staffData = querySnapshot.docs.map(d => d.data() as StaffMember);
            setStaff(staffData);
        }, (error) => {
             console.error("Super Admin Page Error: Could not fetch staff.", error);
        });

        return () => {
            unsubProfiles();
            unsubStaff();
        };
    }, []);

    const handleLockToggle = async (profileId: string, currentStatus: boolean) => {
        const profileRef = doc(db, 'restaurantProfiles', profileId);
        await updateDoc(profileRef, { isLocked: !currentStatus });
    };

    const staffCounts = useMemo(() => {
        const counts = new Map<string, number>();
        staff.forEach(s => {
            counts.set(s.restaurantId, (counts.get(s.restaurantId) || 0) + 1);
        });
        return counts;
    }, [staff]);

    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (p.email || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            if (filterStatus === 'active') {
                return !p.isLocked && matchesSearch;
            }
            if (filterStatus === 'locked') {
                return p.isLocked && matchesSearch;
            }
            return matchesSearch;
        });
    }, [profiles, searchTerm, filterStatus]);

    const summaryStats = useMemo(() => ({
        total: profiles.length,
        active: profiles.filter(p => !p.isLocked).length,
        locked: profiles.filter(p => p.isLocked).length,
    }), [profiles]);

    const FilterButton = ({ status, label }: { status: 'all' | 'active' | 'locked', label: string }) => (
        <button
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 text-sm font-semibold rounded-md ${
                filterStatus === status
                ? 'bg-brand-teal text-white'
                : 'text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-brand-gray-100 dark:bg-brand-gray-800 text-brand-gray-800 dark:text-brand-gray-200">
            <header className="bg-white dark:bg-brand-gray-900 shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                     <h1 className="text-xl font-bold tracking-wider text-brand-teal">
                        DIGI<span className="text-brand-gray-800 dark:text-white">PLATE</span>
                        <span className="ml-2 text-xs font-mono bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">SUPER ADMIN</span>
                    </h1>
                    <button onClick={onLogout} className="flex items-center text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300 hover:text-brand-teal">
                        <LogoutIcon className="w-5 h-5 me-2" />
                        {t('sidebar_logout')}
                    </button>
                </div>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white">{t('super_admin_title')}</h2>
                    <p className="text-brand-gray-500 dark:text-brand-gray-400 mt-1">{t('super_admin_desc')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow">
                        <h4 className="text-sm font-medium text-brand-gray-500">{t('super_admin_total_restaurants')}</h4>
                        <p className="text-3xl font-bold text-brand-gray-800 dark:text-white">{summaryStats.total}</p>
                    </div>
                     <div className="bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow">
                        <h4 className="text-sm font-medium text-brand-gray-500">{t('super_admin_active_accounts')}</h4>
                        <p className="text-3xl font-bold text-green-500">{summaryStats.active}</p>
                    </div>
                     <div className="bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow">
                        <h4 className="text-sm font-medium text-brand-gray-500">{t('super_admin_locked_accounts')}</h4>
                        <p className="text-3xl font-bold text-red-500">{summaryStats.locked}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-brand-gray-900 p-4 sm:p-6 rounded-xl shadow-md">
                    <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                        <input
                            type="text"
                            placeholder={t('super_admin_search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-auto max-w-sm px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                        />
                         <div className="flex space-x-2 bg-brand-gray-100 dark:bg-brand-gray-800 p-1 rounded-lg">
                            <FilterButton status="all" label={t('super_admin_filter_all')} />
                            <FilterButton status="active" label={t('super_admin_filter_active')} />
                            <FilterButton status="locked" label={t('super_admin_filter_locked')} />
                        </div>
                    </div>
                    {loading ? (
                        <p className="text-center py-8">{t('common_loading')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left rtl:text-right">
                                <thead className="text-xs text-brand-gray-500 dark:text-brand-gray-400 uppercase bg-brand-gray-50 dark:bg-brand-gray-800">
                                    <tr>
                                        <th scope="col" className="p-4 font-medium">{t('super_admin_restaurant_name')}</th>
                                        <th scope="col" className="p-4 font-medium">{t('super_admin_owner_email')}</th>
                                        <th scope="col" className="p-4 font-medium">{t('super_admin_phone_number')}</th>
                                        <th scope="col" className="p-4 font-medium">{t('super_admin_staff_count')}</th>
                                        <th scope="col" className="p-4 font-medium">{t('super_admin_registered_on')}</th>
                                        <th scope="col" className="p-4 font-medium">{t('super_admin_status')}</th>
                                        <th scope="col" className="p-4 font-medium text-center">{t('super_admin_actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-gray-100 dark:divide-brand-gray-800">
                                    {filteredProfiles.length > 0 ? filteredProfiles.map(profile => (
                                        <tr key={profile.id} className="hover:bg-brand-gray-50 dark:hover:bg-brand-gray-800/50">
                                            <td className="p-4 font-semibold text-brand-gray-800 dark:text-brand-gray-100">{profile.name}</td>
                                            <td className="p-4 text-brand-gray-600 dark:text-brand-gray-300">{profile.email}</td>
                                            <td className="p-4 text-brand-gray-600 dark:text-brand-gray-300">{profile.phoneNumber || t('common_na')}</td>
                                            <td className="p-4 text-brand-gray-600 dark:text-brand-gray-300 font-mono text-center">{staffCounts.get(profile.id) || 0}</td>
                                            <td className="p-4 text-brand-gray-600 dark:text-brand-gray-300">{profile.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : t('common_na')}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    profile.isLocked 
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' 
                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                                }`}>
                                                    {profile.isLocked ? t('super_admin_status_locked') : t('super_admin_status_active')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <label htmlFor={`lock-${profile.id}`} className="flex items-center justify-center cursor-pointer select-none">
                                                    <div className="relative">
                                                        <input 
                                                            type="checkbox" 
                                                            id={`lock-${profile.id}`} 
                                                            className="sr-only" 
                                                            checked={!profile.isLocked} 
                                                            onChange={() => handleLockToggle(profile.id, !!profile.isLocked)} 
                                                        />
                                                        <div className={`block w-12 h-6 rounded-full transition-colors ${!profile.isLocked ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${!profile.isLocked ? 'transform translate-x-6' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} className="text-center p-8 text-brand-gray-400">
                                                {t('super_admin_no_users')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SuperAdminPage;