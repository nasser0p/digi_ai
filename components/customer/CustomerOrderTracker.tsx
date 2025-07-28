
import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, OrderStatus } from '../../types';
import { CheckIcon, BellIcon, PartyPopperIcon, FlameIcon, ReceiptIcon, ClockIcon } from '../icons';
import { useTranslation } from '../../contexts/LanguageContext';

interface CustomerOrderTrackerProps {
    orderId: string;
    onDismiss: (orderId: string) => void;
}

const CustomerOrderTracker: React.FC<CustomerOrderTrackerProps> = ({ orderId, onDismiss }) => {
    const { t } = useTranslation();
    const [order, setOrder] = useState<Order | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderId) {
            setError(t('customer_tracker_error_general'));
            setLoading(false);
            return;
        }

        const orderRef = doc(db, 'orders', orderId);
        const unsubscribe = onSnapshot(orderRef, (docSnap) => {
            if (docSnap.exists()) {
                setOrder({ ...(docSnap.data() as Order), id: docSnap.id });
            } else {
                setError(t('customer_tracker_error_not_found'));
            }
            setLoading(false);
        }, (err) => {
            console.error("Error tracking order:", err);
            setError(t('customer_tracker_error_general'));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [orderId, t]);

    const getStepStatus = (stepStatus: OrderStatus, currentStatus: OrderStatus | undefined): 'active' | 'complete' | 'pending' => {
        if (!currentStatus) return 'pending';
        
        const statusOrder: OrderStatus[] = ['Pending', 'New', 'In Progress', 'Ready', 'Completed'];
        const stepIndex = statusOrder.indexOf(stepStatus);
        const currentIndex = statusOrder.indexOf(currentStatus);
        
        if (currentIndex > stepIndex) return 'complete';
        if (currentIndex === stepIndex) return 'active';
        return 'pending';
    };

    const StepperStep = ({ icon, title, status }: { icon: React.ReactNode, title: string, status: 'active' | 'complete' | 'pending' }) => {
        const statusClasses = {
            active: 'bg-brand-customer text-white animate-pulse',
            complete: 'bg-green-500 text-white',
            pending: 'bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-400 dark:text-brand-gray-500',
        };
        return (
            <div className="flex flex-col items-center text-center w-20">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${statusClasses[status]}`}>
                    {status === 'complete' ? <CheckIcon className="w-5 h-5" /> : icon}
                </div>
                <p className={`mt-2 text-xs font-semibold transition-colors ${status === 'pending' ? 'text-brand-gray-400' : 'text-brand-gray-800 dark:text-white'}`}>{title}</p>
            </div>
        );
    }
    
    const StepperLine = ({ status }: { status: 'active' | 'complete' | 'pending' }) => (
        <div className={`flex-1 h-1 rounded-full mx-2 transition-colors duration-500 ${status === 'complete' ? 'bg-green-500' : 'bg-brand-gray-200 dark:bg-brand-gray-700'}`}></div>
    );

    if (loading) {
        return <div className="bg-white dark:bg-brand-gray-800 p-4 rounded-xl shadow-md animate-pulse">{t('customer_tracker_loading')}</div>;
    }
    
    if (error) {
        return <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-xl shadow-md text-red-700 dark:text-red-300">{error}</div>;
    }

    if (!order) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-brand-gray-800 p-5 rounded-2xl shadow-lg border border-brand-gray-200 dark:border-brand-gray-700">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-lg text-brand-gray-800 dark:text-white">{t('customer_tracker_plate', order.plateNumber || '')}</h3>
                    <p className="text-xs text-brand-gray-500">ID: {order.id.substring(0, 8)}</p>
                </div>
                {order.status === 'Completed' && (
                    <button
                        onClick={() => onDismiss(order.id)}
                        className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
                    >
                        {t('customer_tracker_dismiss')}
                    </button>
                )}
            </div>
            
            {order.status === 'Completed' ? (
                <div className="flex items-center justify-center gap-3 text-green-600 dark:text-green-400 p-4">
                    <PartyPopperIcon className="w-8 h-8"/>
                    <span className="font-bold text-lg">{t('customer_tracker_completed_message')}</span>
                </div>
            ) : (
                <div className="flex items-center w-full mt-4">
                    <StepperStep 
                        icon={<ClockIcon className="w-5 h-5" />}
                        title={t('customer_tracker_step_pending')}
                        status={getStepStatus('Pending', order.status)}
                    />
                    <StepperLine status={getStepStatus('Pending', order.status)} />
                     <StepperStep 
                        icon={<ReceiptIcon className="w-5 h-5" />}
                        title={t('customer_tracker_step_confirmed')}
                        status={getStepStatus('New', order.status)}
                    />
                    <StepperLine status={getStepStatus('New', order.status)} />
                    <StepperStep 
                        icon={<FlameIcon className="w-5 h-5" />}
                        title={t('customer_tracker_step_preparing')}
                        status={getStepStatus('In Progress', order.status)}
                    />
                    <StepperLine status={getStepStatus('In Progress', order.status)} />
                    <StepperStep 
                        icon={<BellIcon className="w-5 h-5" />}
                        title={t('customer_tracker_step_ready')}
                        status={getStepStatus('Ready', order.status)}
                    />
                </div>
            )}
        </div>
    );
};

export default CustomerOrderTracker;