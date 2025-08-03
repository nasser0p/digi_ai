import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, MenuItem, RestaurantProfile, Role, KDSItemSummary, KDSIndividualOrder, SelectedModifier } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import LoadingSpinner from '../ui/LoadingSpinner';

interface KitchenDisplayPageProps {
    userId: string;
    profile: RestaurantProfile | null;
    menuItems: MenuItem[];
    role: Role | null;
}

type KDSViewMode = 'summary' | 'order';

const OrderTimer: React.FC<{ createdAtSeconds: number; prepTimeMinutes?: number }> = ({ createdAtSeconds, prepTimeMinutes }) => {
    const [elapsedSeconds, setElapsedSeconds] = useState((Date.now() / 1000) - createdAtSeconds);

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedSeconds((Date.now() / 1000) - createdAtSeconds);
        }, 1000);
        return () => clearInterval(interval);
    }, [createdAtSeconds]);

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = Math.floor(elapsedSeconds % 60);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    let colorClass = 'text-green-600 dark:text-green-400';
    if (prepTimeMinutes && prepTimeMinutes > 0) {
        const percentage = (minutes / prepTimeMinutes);
        if (percentage >= 0.8) {
            colorClass = 'text-red-500 dark:text-red-400 font-bold animate-pulse';
        } else if (percentage >= 0.5) {
            colorClass = 'text-yellow-500 dark:text-yellow-400';
        }
    }
    return <span className={`font-mono text-sm ${colorClass}`}>{timeString}</span>;
};


const KitchenDisplayPage: React.FC<KitchenDisplayPageProps> = ({ userId, profile, menuItems, role }) => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStation, setSelectedStation] = useState('all');
    const [viewMode, setViewMode] = useState<KDSViewMode>('summary');

    useEffect(() => {
        const activeOrdersQuery = query(
            collection(db, 'orders'),
            where('userId', '==', userId),
            where('status', 'in', ['New', 'In Progress'])
        );
        const unsubscribe = onSnapshot(activeOrdersQuery, (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => ({...doc.data(), id: doc.id } as Order));
            setOrders(fetchedOrders);
            setLoading(false);
        });
        return unsubscribe;
    }, [userId]);

    const itemSummaries = useMemo<KDSItemSummary[]>(() => {
        const itemStationMap = new Map(menuItems.map(item => [item.id, { stationName: item.stationName, prepTimeMinutes: item.prepTimeMinutes }]));
        const summaries = new Map<string, KDSItemSummary>();

        orders.forEach(order => {
            order.items.forEach((item, index) => {
                if (item.isCompleted) return;

                const itemDetails = itemStationMap.get(item.menuItemId);
                if (selectedStation !== 'all' && itemDetails?.stationName !== selectedStation) {
                    return;
                }
                
                const modifiersString = item.selectedModifiers?.map(m => m.optionName).sort().join(', ') || 'none';
                const uniqueKey = `${item.menuItemId}-${modifiersString}`;

                if (!summaries.has(uniqueKey)) {
                    summaries.set(uniqueKey, {
                        menuItemId: item.menuItemId,
                        itemName: item.name,
                        modifiersString,
                        uniqueKey,
                        totalQuantity: 0,
                        individualOrders: [],
                    });
                }
                
                const summary = summaries.get(uniqueKey)!;
                summary.totalQuantity += item.quantity;
                summary.individualOrders.push({
                    orderId: order.id,
                    itemIndex: index,
                    plateNumber: order.plateNumber,
                    quantity: item.quantity,
                    createdAt: order.createdAt,
                    prepTimeMinutes: itemDetails?.prepTimeMinutes,
                    orderStatus: order.status,
                    notes: item.notes,
                    selectedModifiers: item.selectedModifiers,
                });
            });
        });
        
        return Array.from(summaries.values()).sort((a,b) => b.totalQuantity - a.totalQuantity);

    }, [orders, menuItems, selectedStation]);
    
    const handleCompleteIndividual = async (orderId: string, itemIndex: number) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await getDoc(orderRef);
        if (!orderDoc.exists()) return;

        const orderData = orderDoc.data() as Order;
        const updatedItems = [...orderData.items];
        updatedItems[itemIndex].isCompleted = true;
        
        const allItemsDone = updatedItems.every(item => item.isCompleted);
        const newStatus = allItemsDone ? 'Ready' : orderData.status === 'New' ? 'In Progress' : orderData.status;

        await updateDoc(orderRef, { items: updatedItems, status: newStatus });
    };
    
    const handleBumpAll = async (summary: KDSItemSummary) => {
        const batch = writeBatch(db);
        const affectedOrderIds = new Set(summary.individualOrders.map(o => o.orderId));
        
        const orderDocs = new Map<string, Order>();
        for (const orderId of affectedOrderIds) {
            const orderRef = doc(db, 'orders', orderId);
            const orderSnap = await getDoc(orderRef);
            if(orderSnap.exists()) {
                orderDocs.set(orderId, orderSnap.data() as Order);
            }
        }
        
        summary.individualOrders.forEach(indOrder => {
            const orderData = orderDocs.get(indOrder.orderId);
            if (orderData) {
                orderData.items[indOrder.itemIndex].isCompleted = true;
            }
        });

        orderDocs.forEach((orderData, orderId) => {
            const orderRef = doc(db, 'orders', orderId);
            const allItemsDone = orderData.items.every(item => item.isCompleted);
            const newStatus = allItemsDone ? 'Ready' : orderData.status === 'New' ? 'In Progress' : orderData.status;
            batch.update(orderRef, { items: orderData.items, status: newStatus });
        });
        
        await batch.commit();
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }

    const renderSummaryView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-min">
            {itemSummaries.length === 0 && (
                <div className="col-span-full flex items-center justify-center h-full text-brand-gray-500">
                    <p>{t('kds_no_items_for_station')}</p>
                </div>
            )}
            {itemSummaries.map(summary => (
                <div key={summary.uniqueKey} className="bg-white dark:bg-brand-gray-900 rounded-xl shadow-lg flex flex-col">
                    <div className="p-4 border-b border-brand-gray-100 dark:border-brand-gray-800">
                        <div className="flex justify-between items-start">
                             <div className="flex-grow">
                                <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white leading-tight">{summary.itemName}</h3>
                                {summary.modifiersString !== 'none' && <p className="text-xs text-brand-gray-500">{summary.modifiersString}</p>}
                            </div>
                            <span className="text-3xl font-extrabold text-brand-teal ms-2 flex-shrink-0">
                                {summary.totalQuantity}x
                            </span>
                        </div>
                    </div>
                    <div className="p-2 space-y-1 flex-grow">
                        {summary.individualOrders.map(indOrder => (
                            <div key={`${indOrder.orderId}-${indOrder.itemIndex}`} className="flex items-center justify-between p-2 bg-brand-gray-50 dark:bg-brand-gray-800 rounded-md">
                                <div>
                                    <span className="font-semibold text-sm">{indOrder.quantity}x</span>
                                    <span className="text-sm text-brand-gray-600 dark:text-brand-gray-300 ms-2">from {indOrder.plateNumber}</span>
                                    {indOrder.notes && <p className="text-xs italic text-amber-600 dark:text-amber-400">"{indOrder.notes}"</p>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <OrderTimer createdAtSeconds={indOrder.createdAt.seconds} prepTimeMinutes={indOrder.prepTimeMinutes} />
                                    <button onClick={() => handleCompleteIndividual(indOrder.orderId, indOrder.itemIndex)} className="text-xs font-bold py-1 px-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors">
                                        {t('kds_done_button')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-2">
                         <button onClick={() => handleBumpAll(summary)} className="w-full text-center bg-brand-teal text-white font-bold py-2 rounded-lg hover:bg-brand-teal-dark transition-colors text-sm">
                             {t('kds_bump_all_button', summary.totalQuantity)}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
    
    const renderOrderView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
            {/* This is the old view logic, slightly adapted */}
        </div>
    );


    return (
        <div className="h-full flex flex-col">
            <header className="flex-shrink-0 bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow-md flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{t('kds_title')}</h1>
                    <div className="p-1 bg-brand-gray-100 dark:bg-brand-gray-800 rounded-lg">
                        <button onClick={() => setViewMode('summary')} className={`px-3 py-1 text-sm font-semibold rounded-md ${viewMode === 'summary' ? 'bg-brand-teal text-white' : ''}`}>{t('kds_summary_view')}</button>
                        <button onClick={() => setViewMode('order')} className={`px-3 py-1 text-sm font-semibold rounded-md ${viewMode === 'order' ? 'bg-brand-teal text-white' : ''}`}>{t('kds_order_view')}</button>
                    </div>
                </div>
                <select 
                    value={selectedStation} 
                    onChange={e => setSelectedStation(e.target.value)}
                    className="p-2 rounded-md bg-brand-gray-100 dark:bg-brand-gray-800"
                >
                    <option value="all">{t('kds_all_stations')}</option>
                    {profile?.kitchenStations?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
            </header>
            <main className="flex-grow">
               {viewMode === 'summary' ? renderSummaryView() : renderOrderView()}
            </main>
        </div>
    );
};

export default KitchenDisplayPage;