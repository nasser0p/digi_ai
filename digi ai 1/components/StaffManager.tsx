import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { StaffMember, Role, Invite } from '../types';
import Modal from './Modal';
import { CheckCircleIcon } from './icons';
import QRCode from 'qrcode';
import { useTranslation } from '../contexts/LanguageContext';


const CredentialsModal: React.FC<{ name: string; email: string; temporaryPassword: string; onClose: () => void }> = ({ name, email, temporaryPassword, onClose }) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(`${t('staff_modal_email_label')} ${email}\n${t('staff_modal_password_label')} ${temporaryPassword}`);
        alert(t('staff_modal_copied_alert'));
    };
    
    useEffect(() => {
        if (canvasRef.current) {
            const loginUrl = window.location.origin + '/index.html'; 
            QRCode.toCanvas(canvasRef.current, loginUrl, { width: 180, margin: 2 }, (error) => {
                if (error) console.error('QR Code Error:', error);
            });
        }
    }, []);

    return (
        <Modal onClose={onClose}>
            <div className="text-center p-4">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white mb-2">
                    {t('staff_modal_title', name)}
                </h2>
                <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mb-6">
                    {t('staff_modal_desc')}
                </p>
                
                <div className="mb-4 bg-brand-gray-100 dark:bg-brand-gray-700 p-3 rounded-lg text-start">
                    <div className="mb-2">
                      <p className="text-sm text-brand-gray-500">{t('staff_modal_email_label')}</p>
                      <p className="font-mono font-bold text-brand-gray-800 dark:text-brand-gray-200">{email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-brand-gray-500">{t('staff_modal_password_label')}</p>
                      <p className="text-2xl font-mono tracking-widest font-bold text-brand-teal">{temporaryPassword}</p>
                    </div>
                </div>

                <div className="my-4">
                    <p className="text-sm text-brand-gray-500 mb-2">{t('staff_modal_qr_desc')}</p>
                    <div className="flex justify-center">
                        <canvas ref={canvasRef} />
                    </div>
                </div>

                <button
                    onClick={copyToClipboard}
                    className="mt-4 w-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold py-3 px-6 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                >
                    {t('staff_modal_copy_button')}
                </button>

                <button
                    onClick={onClose}
                    className="mt-2 w-full bg-brand-teal text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-teal-dark transition-colors"
                >
                    {t('staff_modal_done_button')}
                </button>
            </div>
        </Modal>
    );
};


interface StaffManagerProps {
    ownerId: string;
}

const StaffManager: React.FC<StaffManagerProps> = ({ ownerId }) => {
    const { t } = useTranslation();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [newInviteEmail, setNewInviteEmail] = useState('');
    const [newStaffName, setNewStaffName] = useState('');
    const [newInviteRole, setNewInviteRole] = useState<Role>('kitchen_staff');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [modalData, setModalData] = useState<{name: string, email: string; temporaryPassword: string;} | null>(null);

    useEffect(() => {
        if (!ownerId) return;

        setLoading(true);
        const staffQuery = query(collection(db, 'staff'), where('restaurantId', '==', ownerId));
        const invitesQuery = query(collection(db, 'invites'), where('restaurantId', '==', ownerId));

        const unsubStaff = onSnapshot(staffQuery, snapshot => {
            setStaffList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
            setLoading(false);
        });

        const unsubInvites = onSnapshot(invitesQuery, snapshot => {
            setInvites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invite)));
        });

        return () => {
            unsubStaff();
            unsubInvites();
        };

    }, [ownerId]);
    
    const generatePassword = () => {
        const parts = [
            ['RED', 'BLUE', 'GREEN', 'GRAY', 'PINK', 'GOLD'],
            ['CAR', 'BOAT', 'TREE', 'CUP', 'KEY', 'STAR'],
            [123, 456, 789, 321, 654, 987, 258, 147]
        ];
        const pass = parts.map(part => part[Math.floor(Math.random() * part.length)]).join('-');
        return pass;
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = newInviteEmail.trim().toLowerCase();
        if (!email || !newStaffName.trim()) return;

        setIsSubmitting(true);
        setMessage('');

        try {
            const temporaryPassword = generatePassword();
            const newInvite: Omit<Invite, 'id'> = {
                email,
                name: newStaffName,
                role: newInviteRole,
                restaurantId: ownerId,
                temporaryPassword,
            };
            
            await setDoc(doc(db, 'invites', email), newInvite);
            
            setModalData({ email, name: newStaffName, temporaryPassword });

            setNewInviteEmail('');
            setNewStaffName('');
            setNewInviteRole('kitchen_staff');

        } catch (error) {
            console.error("Error creating staff invite:", error);
            setMessage(t('staff_manager_create_fail'));
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteStaff = async (staffId: string) => {
        if (window.confirm(t('staff_manager_remove_confirm'))) {
            await deleteDoc(doc(db, 'staff', staffId));
        }
    }

    const handleDeleteInvite = async (inviteId: string) => {
        if (window.confirm(t('staff_manager_revoke_confirm'))) {
            await deleteDoc(doc(db, 'invites', inviteId));
        }
    }

    const handleUpdateRole = async (staffId: string, newRole: Role) => {
        if (newRole === 'admin') return;
        const staffRef = doc(db, 'staff', staffId);
        await updateDoc(staffRef, { role: newRole });
    }

    const roleOptions: { value: Role, label: string }[] = [
        { value: 'manager', label: t('role_manager') },
        { value: 'front_of_house', label: t('role_front_of_house') },
        { value: 'kitchen_staff', label: t('role_kitchen_staff') },
    ];

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-4">{t('staff_manager_title')}</h3>
                    <form onSubmit={handleAddStaff} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">{t('staff_manager_name_label')}</label>
                            <input
                                type="text"
                                id="name"
                                value={newStaffName}
                                onChange={e => setNewStaffName(e.target.value)}
                                placeholder={t('staff_manager_name_placeholder')}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">{t('staff_manager_email_label')}</label>
                            <input
                                type="email"
                                id="email"
                                value={newInviteEmail}
                                onChange={e => setNewInviteEmail(e.target.value)}
                                placeholder={t('staff_manager_email_placeholder')}
                                required
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                            />
                        </div>
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300">{t('staff_manager_role_label')}</label>
                            <select
                                id="role"
                                value={newInviteRole}
                                onChange={e => setNewInviteRole(e.target.value as Role)}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                            >
                                {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-brand-teal text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-brand-teal-dark disabled:bg-teal-300">
                                {isSubmitting ? t('staff_manager_creating') : t('staff_manager_add_button')}
                            </button>
                        </div>
                        {message && <p className="text-sm text-center text-red-500">{message}</p>}
                    </form>
                </div>

                <div className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-4">{t('staff_manager_team_title')}</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {loading && <p>{t('staff_manager_loading_team')}</p>}
                        {!loading && staffList.length === 0 && invites.length === 0 && <p className="text-sm text-brand-gray-500">{t('staff_manager_no_staff')}</p>}
                        
                        {staffList.map(staff => (
                            <div key={staff.id} className="flex flex-wrap items-center justify-between p-3 bg-brand-gray-50 dark:bg-brand-gray-800 rounded-lg">
                                <div>
                                    <p className="font-semibold text-brand-gray-800 dark:text-brand-gray-200">{staff.name || 'Unnamed User'}</p>
                                    <p className="text-xs text-brand-gray-500">{staff.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select value={staff.role} onChange={e => handleUpdateRole(staff.id, e.target.value as Role)} className="text-xs bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-500 rounded p-1">
                                        {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                    <button onClick={() => handleDeleteStaff(staff.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">{t('common_remove')}</button>
                                </div>
                            </div>
                        ))}

                        {invites.map(invite => (
                            <div key={invite.id} className="flex flex-wrap items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg opacity-80 hover:opacity-100 transition-opacity">
                                <div>
                                    <p className="font-semibold text-brand-gray-800 dark:text-brand-gray-200">{invite.name || invite.email}</p>
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                        {invite.email} - {t('staff_manager_pending_invite')} ({roleOptions.find(r => r.value === invite.role)?.label})
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                     <button 
                                      onClick={() => setModalData({ name: invite.name || '', email: invite.email, temporaryPassword: invite.temporaryPassword || '' })} 
                                      className="text-xs text-brand-teal hover:underline font-semibold"
                                      disabled={!invite.temporaryPassword}
                                      title={t('staff_manager_show_creds')}
                                    >
                                      {t('staff_manager_show_creds')}
                                    </button>
                                    <button onClick={() => handleDeleteInvite(invite.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">{t('staff_manager_revoke_button')}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {modalData && (
                <CredentialsModal 
                    {...modalData}
                    onClose={() => setModalData(null)}
                />
            )}
        </>
    );
};

export default StaffManager;
