import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { doc, onSnapshot, setDoc, collection, query, where, updateDoc, getDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { Role, FloorPlan, Order, FloorPlanTable, TableStatus, RestaurantProfile, MenuItem, Category, OrderStatus, AppliedTax } from '../../types';
import { useTranslation, LanguageProvider } from '../../contexts/LanguageContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import FloorPlanEditor from './FloorPlanEditor';
import LiveFloorPlanView from './LiveFloorPlanView';
import PrintableTicket from '../PrintableTicket';
import { POSContext } from '../../App';

interface FloorPlanPageProps {
    userId: string;
    role: Role | null;
    profile: RestaurantProfile | null;
    onOpenPOS: (context: Omit<POSContext, 'type'>) => void;
}

const FloorPlanPage: React.FC<FloorPlanPageProps> = ({ userId, role, profile, onOpenPOS }) => {
    const { t } = useTranslation();
    const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'live' | 'edit'>('live');
    
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);


    const canEdit = role === 'admin' || role === 'manager';

    useEffect(() => {
        if (orderToPrint && profile) {
            const printContainer = document.getElementById('printable-content');
            if (printContainer) {
                const root = createRoot(printContainer);
                root.render(
                    <React.StrictMode>
                        <LanguageProvider>
                            <PrintableTicket order={orderToPrint} profile={profile} />
                        </LanguageProvider>
                    </React.StrictMode>
                );

                const timer = setTimeout(() => {
                    window.print();
                    root.unmount();
                    setOrderToPrint(null);
                }, 200);

                return () => clearTimeout(timer);
            }
        }
    }, [orderToPrint, profile]);

    useEffect(() => {
        if (!userId) return;

        const planRef = doc(db, 'floorPlans', userId);
        const unsubPlan = onSnapshot(planRef, (docSnap) => {
            if (docSnap.exists()) {
                setFloorPlan(docSnap.data() as FloorPlan);
            } else {
                setFloorPlan(null);
            }
            if(loading) setLoading(false);
        }, (error) => {
            console.error("Floor plan snapshot error:", error);
            if(loading) setLoading(false);
        });
        
        const activeOrdersQuery = query(collection(db, 'orders'), where('userId', '==', userId), where('status', 'in', ['Pending', 'New', 'In Progress', 'Ready']));
        const unsubOrders = onSnapshot(activeOrdersQuery, (querySnapshot) => {
            const fetchedOrders = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Order));
            setOrders(fetchedOrders);
        });

        return () => {
            unsubPlan();
            unsubOrders();
        };
    }, [userId, loading]);
    
    const tablesWithStatus = useMemo(() => {
        if (!floorPlan) return [];

        const ordersByTable = new Map<string, Order[]>();
        orders.forEach(order => {
            if (order.plateNumber && order.orderType !== 'takeaway') {
                const plateKey = order.plateNumber.toUpperCase();
                if (!ordersByTable.has(plateKey)) {
                    ordersByTable.set(plateKey, []);
                }
                ordersByTable.get(plateKey)!.push(order);
            }
        });

        return floorPlan.tables.map(table => {
            const tableOrders = ordersByTable.get(table.label.toUpperCase()) || [];
            tableOrders.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);

            let status: TableStatus = 'available';
            if (table.status === 'needs_cleaning') {
                status = 'needs_cleaning';
            } else if (tableOrders.length > 0) {
                 const hasReadyOrder = tableOrders.some(o => o.status === 'Ready');
                 const hasActiveOrder = tableOrders.some(o => o.status === 'In Progress' || o.status === 'New');
                 if (hasReadyOrder) status = 'attention';
                 else if (hasActiveOrder) status = 'ordered';
            } else if (table.status === 'seated') {
                status = 'seated';
            }
            
            return { 
                ...table, 
                status, 
                orders: tableOrders
            };
        });
    }, [floorPlan, orders]);


    const occupancy = useMemo(() => {
        const filled = tablesWithStatus.filter(t => t.status === 'seated' || t.status === 'ordered' || t.status === 'attention').length;
        return { filled, total: tablesWithStatus.length };
    }, [tablesWithStatus]);

    const liveRevenue = useMemo(() => {
        return orders.reduce((acc, order) => {
            const tableOnPlan = floorPlan?.tables.find(t => t.label.toUpperCase() === order.plateNumber?.toUpperCase());
            return tableOnPlan ? acc + order.total : acc;
        }, 0);
    }, [orders, floorPlan]);
    
    const handleSelectTable = (table: FloorPlanTable & { status: TableStatus; orders: Order[] }) => {
        if (role === 'kitchen_staff') return;

        if (table.status === 'needs_cleaning') {
             if (window.confirm(`Clear table ${table.label}?`)) {
                handleUpdateTableStatus(table.id, 'available');
            }
            return;
        }

        const context: Omit<POSContext, 'type'> = {
            tableNumber: table.label,
            orderIds: table.orders.map(o => o.id)
        };
        onOpenPOS(context);
    };

    const handleUpdateTableStatus = async (tableId: string, status: TableStatus) => {
        if (!floorPlan) return;
        const newTables = floorPlan.tables.map(t => t.id === tableId ? { ...t, status } : t);
        const planRef = doc(db, 'floorPlans', floorPlan.id);
        await updateDoc(planRef, { tables: newTables });
    };
    
    const handleSaveLayout = async (newPlan: FloorPlan) => {
        const planRef = doc(db, 'floorPlans', newPlan.id);
        const tablesToSave = newPlan.tables.map(({ status, ...t }) => t);
        await setDoc(planRef, { ...newPlan, tables: tablesToSave }, { merge: true });
        
        setFloorPlan(newPlan);
        setViewMode('live');
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }
    
    if (!floorPlan && canEdit) {
        return <FloorPlanEditor 
            planToEdit={{ id: userId, userId, gridWidth: 20, gridHeight: 12, tables: [] }} 
            onSaveLayout={handleSaveLayout}
            profile={profile}
        />;
    }
    
    if (!floorPlan) {
        return <div className="text-center p-8">{t('common_permission_denied')}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h4 className="text-sm font-medium text-brand-gray-500">{t('floor_plan_occupancy')}</h4>
                        <p className="text-2xl font-bold text-brand-gray-800 dark:text-white">{occupancy.filled} / {occupancy.total}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-brand-gray-500">{t('floor_plan_live_revenue')}</h4>
                        <p className="text-2xl font-bold text-brand-teal">OMR {liveRevenue.toFixed(3)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     {canEdit && (
                        <div className="flex items-center gap-2 p-1 bg-brand-gray-100 dark:bg-brand-gray-800 rounded-xl">
                            <ViewModeButton label={t('floor_plan_live_view')} current={viewMode} target="live" onClick={() => setViewMode('live')} />
                            <ViewModeButton label={t('floor_plan_edit_mode')} current={viewMode} target="edit" onClick={() => setViewMode('edit')} />
                        </div>
                     )}
                </div>
            </div>
            
            {viewMode === 'edit' && canEdit ? (
                <FloorPlanEditor planToEdit={floorPlan} onSaveLayout={handleSaveLayout} profile={profile} />
            ) : (
                <LiveFloorPlanView 
                    plan={floorPlan} 
                    tablesWithStatus={tablesWithStatus} 
                    onSelectTable={handleSelectTable}
                />
            )}
        </div>
    );
};

const ViewModeButton: React.FC<{ label: string, current: string, target: string, onClick: () => void }> = ({ label, current, target, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
            current === target
                ? 'bg-brand-teal text-white shadow'
                : 'bg-white dark:bg-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-600'
        }`}
    >
        {label}
    </button>
);

export default FloorPlanPage;