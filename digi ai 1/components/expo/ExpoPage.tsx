import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, MenuItem, Role, Ingredient } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import { CheckIcon } from '../icons';
import { POSContext } from '../../App';

interface ExpoPageProps {
    userId: string;
    role: Role | null;
    menuItems: MenuItem[];
    ingredients: Ingredient[];
    onOpenPOS: (context: POSContext) => void;
}

const ExpoPage: React.FC<ExpoPageProps> = ({ userId, role, menuItems, ingredients, onOpenPOS }) => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'orders'),
            where('userId', '==', userId),
            where('status', 'in', ['In Progress', 'Ready'])
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedOrders = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Order));
            fetchedOrders.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
            setOrders(fetchedOrders);
            setLoading(false);
        });
        return unsubscribe;
    }, [userId]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
                {orders.length === 0 ? (
                    <div className="col-span-full text-center p-12 text-brand-gray-500">
                        <p>{t('expo_no_active_orders')}</p>
                    </div>
                ) : (
                    orders.map(order => {
                        const allItemsReady = order.status === 'Ready';
                        return (
                            <div
                                key={order.id}
                                className={`bg-white dark:bg-brand-gray-900 rounded-xl shadow-md flex flex-col transition-all duration-300 text-left w-full ${
                                    allItemsReady
                                        ? 'ring-2 ring-green-500'
                                        : 'ring-1 ring-brand-gray-200 dark:ring-brand-gray-700'
                                }`}
                            >
                                <header className={`p-3 rounded-t-xl ${allItemsReady ? 'bg-green-500 text-white' : 'bg-brand-gray-100 dark:bg-brand-gray-800'}`}>
                                    <h3 className="font-bold">{order.plateNumber || t('order_card_online')}</h3>
                                    <p className="text-xs opacity-80">ID: {order.id.substring(0,8)}</p>
                                </header>
                                <div className="p-3 flex-grow space-y-2">
                                    {order.items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-start text-sm">
                                            <div className="flex items-start gap-2">
                                                 <div className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded-sm flex items-center justify-center ${item.isCompleted ? 'bg-green-500' : 'bg-brand-gray-300 dark:bg-brand-gray-600'}`}>
                                                    {item.isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
                                                </div>
                                                <div>
                                                    <span className={`${item.isCompleted ? 'line-through opacity-60' : ''}`}>{item.quantity}x {item.name}</span>
                                                    {item.notes && <p className="text-xs italic text-amber-600 dark:text-amber-400">"{item.notes}"</p>}
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-brand-gray-500">
                                                {item.isCompleted ? t('expo_ready') : t('expo_waiting_for')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <footer className="p-3 mt-auto border-t border-brand-gray-100 dark:border-brand-gray-800">
                                    {allItemsReady ? (
                                        <button
                                            onClick={() => onOpenPOS({
                                                type: order.orderType || (order.plateNumber ? 'dine-in' : 'takeaway'),
                                                orderIds: [order.id],
                                                tableNumber: order.plateNumber,
                                            })}
                                            className="w-full text-center bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                                        >
                                            {t('expo_proceed_to_payment')}
                                        </button>
                                    ) : (
                                        <div className="w-full text-center bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-500 font-bold py-2 rounded-lg text-sm cursor-not-allowed">
                                            {t('expo_awaiting_kitchen')}
                                        </div>
                                    )}
                                </footer>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};

export default ExpoPage;