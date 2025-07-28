import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { doc, onSnapshot, setDoc, collection, query, where, updateDoc, getDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { Role, FloorPlan, Order, FloorPlanTable, TableStatus, RestaurantProfile, MenuItem, Category, OrderStatus, AppliedTax } from '../../types';
import { useTranslation, LanguageProvider } from '../../contexts/LanguageContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import FloorPlanEditor from './FloorPlanEditor';
import LiveFloorPlanView from './LiveFloorPlanView';
import FloorPlanDetailsPanel from './FloorPlanDetailsPanel';
import PrintableTicket from '../PrintableTicket';

interface RapidOrderContext {
    tableNumber: string;
    orderIdToAppend?: string;
}

interface FloorPlanPageProps {
    userId: string;
    role: Role | null;
    profile: RestaurantProfile | null;
    onTableOrder: (context: RapidOrderContext) => void;
    onTakeawayOrder: () => void;
}

const FloorPlanPage: React.FC<FloorPlanPageProps> = ({ userId, role, profile, onTableOrder, onTakeawayOrder }) => {
    const { t } = useTranslation();
    const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'live' | 'edit'>('live');
    
    const [selectedTable, setSelectedTable] = useState<(FloorPlanTable & { status: TableStatus; orders: Order[] }) | null>(null);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);


    const canEdit = role === 'admin' || role === 'manager';
    const canPlaceOrders = role === 'admin' || role === 'manager' || role === 'front_of_house';

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
        
        const menuItemsQuery = query(collection(db, 'menuItems'), where('userId', '==', userId));
        const unsubMenuItems = onSnapshot(menuItemsQuery, (snapshot) => {
            setMenuItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem)));
        });

        return () => {
            unsubPlan();
            unsubOrders();
            unsubMenuItems();
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
            if (tableOrders.length > 0) {
                const hasAttentionOrder = tableOrders.some(o => {
                    const ageMinutes = (Date.now() - o.createdAt.seconds * 1000) / 60000;
                    return (o.status === 'New' || o.status === 'In Progress') && ageMinutes > 15;
                });
                status = hasAttentionOrder ? 'attention' : 'ordered';
            } else if (table.status && (table.status === 'seated' || table.status === 'needs_cleaning')) {
                status = table.status;
            }
            
            const taxAmount = tableOrders.reduce((s, o) => s + (o.taxAmount || 0), 0);
            const aggregatedTaxesMap = new Map<string, AppliedTax>();
            tableOrders.flatMap(o => o.taxes || []).forEach(tax => {
                const existing = aggregatedTaxesMap.get(tax.name);
                if (existing) {
                    existing.amount += tax.amount;
                } else {
                    aggregatedTaxesMap.set(tax.name, { ...tax });
                }
            });
            const taxes = Array.from(aggregatedTaxesMap.values());
            const appliedDiscounts = tableOrders.flatMap(o => o.appliedDiscounts || []);

            const orderForDisplay: Order | null = tableOrders.length > 0 ? {
                id: tableOrders.map(o => o.id.substring(0, 4)).join(' | '),
                items: tableOrders.flatMap(o => o.items),
                total: tableOrders.reduce((sum, o) => sum + o.total, 0),
                createdAt: tableOrders[0].createdAt,
                plateNumber: table.label,
                userId,
                status: 'New',
                subtotal: tableOrders.reduce((s, o) => s + o.subtotal, 0),
                tip: tableOrders.reduce((s, o) => s + o.tip, 0),
                taxAmount,
                taxes,
                appliedDiscounts,
                platformFee: tableOrders.reduce((s, o) => s + o.platformFee, 0),
            } : null;

            return { 
                ...table, 
                status, 
                order: orderForDisplay,
                orders: tableOrders
            };
        });
    }, [floorPlan, orders, userId]);


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
        if (role !== 'kitchen_staff' && (table.status === 'available' || table.status === 'seated')) {
            onTableOrder({ tableNumber: table.label });
        } else {
            setSelectedTable(table);
        }
    };

    const handleUpdateTableStatus = async (tableId: string, status: TableStatus) => {
        if (!floorPlan) return;
        const newTables = floorPlan.tables.map(t => t.id === tableId ? { ...t, status } : t);
        const planRef = doc(db, 'floorPlans', floorPlan.id);
        await updateDoc(planRef, { tables: newTables });
        setSelectedTable(null);
    };

    const handleUpdateOrderItemStatus = async (orderId: string, itemIndex: number, newStatus: boolean) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderToUpdate = orders.find(o => o.id === orderId);
        
        if (orderToUpdate) {
            const updatedItems = [...orderToUpdate.items];
            if (updatedItems[itemIndex]) {
                updatedItems[itemIndex].isDelivered = newStatus;
                await updateDoc(orderRef, { items: updatedItems });
            }
        }
    };

    const handleMarkOrderAsComplete = async (orderIds: string[]) => {
        const ordersToComplete = orders.filter(o => orderIds.includes(o.id));
        if (ordersToComplete.length === 0) return;

        const batch = writeBatch(db);
        const deductions = new Map<string, number>();

        ordersToComplete.forEach(orderToComplete => {
            orderToComplete.items.forEach(orderItem => {
                const menuItem = menuItems.find(mi => mi.id === orderItem.menuItemId);
                if (menuItem?.recipe) {
                    menuItem.recipe.forEach(recipeItem => {
                        const totalDeduction = recipeItem.quantity * orderItem.quantity;
                        deductions.set(recipeItem.ingredientId, (deductions.get(recipeItem.ingredientId) || 0) + totalDeduction);
                    });
                }
            });
            batch.update(doc(db, 'orders', orderToComplete.id), { status: 'Completed' });
        });

        deductions.forEach((quantityToDeduction, ingredientId) => {
            batch.update(doc(db, 'ingredients', ingredientId), { stock: increment(-quantityToDeduction) });
        });
        
        const plateNumber = ordersToComplete[0].plateNumber;
        if (floorPlan && plateNumber) {
            const newTables = floorPlan.tables.map(table => 
                table.label.toUpperCase() === plateNumber.toUpperCase() 
                ? { ...table, status: 'needs_cleaning' } 
                : table
            );
            batch.update(doc(db, 'floorPlans', userId), { tables: newTables });
        }

        try {
            await batch.commit();
            setSelectedTable(null);
        } catch (error) {
            console.error("Failed to complete order:", error);
        }
    };

    const handleSaveLayout = async (newPlan: FloorPlan) => {
        const planRef = doc(db, 'floorPlans', newPlan.id);
        const tablesToSave = newPlan.tables.map(({ status, ...t }) => t);
        await setDoc(planRef, { ...newPlan, tables: tablesToSave }, { merge: true });
        
        setFloorPlan(newPlan);
        setViewMode('live');
    };
    
    const handlePrintBill = (ordersToPrint: Order[]) => {
        if (!ordersToPrint || ordersToPrint.length === 0) return;

        const taxAmount = ordersToPrint.reduce((s, o) => s + (o.taxAmount || 0), 0);
        const aggregatedTaxesMap = new Map<string, { name: string, rate: number, amount: number }>();
        ordersToPrint.flatMap(o => o.taxes || []).forEach(tax => {
            const existing = aggregatedTaxesMap.get(tax.name);
            if (existing) {
                existing.amount += tax.amount;
            } else {
                aggregatedTaxesMap.set(tax.name, { ...tax });
            }
        });
        const taxes = Array.from(aggregatedTaxesMap.values());
        const appliedDiscounts = ordersToPrint.flatMap(o => o.appliedDiscounts || []);

        const aggregatedOrderForPrint: Order = {
            id: ordersToPrint.map(o => o.id.substring(0, 4)).join(' | '),
            plateNumber: ordersToPrint[0].plateNumber,
            items: ordersToPrint.flatMap(o => o.items),
            subtotal: ordersToPrint.reduce((s, o) => s + o.subtotal, 0),
            tip: ordersToPrint.reduce((s, o) => s + o.tip, 0),
            taxAmount,
            taxes,
            appliedDiscounts,
            platformFee: ordersToPrint.reduce((s, o) => s + o.platformFee, 0),
            total: ordersToPrint.reduce((s, o) => s + o.total, 0),
            createdAt: ordersToPrint[0].createdAt,
            status: 'Ready',
            userId: userId,
            storeName: ordersToPrint[0].storeName,
        };
        setOrderToPrint(aggregatedOrderForPrint);
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
                     {canPlaceOrders && viewMode === 'live' && (
                        <button
                            onClick={onTakeawayOrder}
                            className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                            {t('floor_plan_new_takeaway_order')}
                        </button>
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

            <FloorPlanDetailsPanel 
                table={selectedTable}
                orders={selectedTable?.orders || null}
                onClose={() => setSelectedTable(null)}
                onUpdateStatus={handleUpdateTableStatus}
                onUpdateOrderItemStatus={handleUpdateOrderItemStatus}
                onAppendToOrder={(_orderId, tableNumber) => {
                    if (selectedTable?.orders && selectedTable.orders.length > 0) {
                        const latestOrder = selectedTable.orders[selectedTable.orders.length - 1];
                        onTableOrder({ orderIdToAppend: latestOrder.id, tableNumber })
                    }
                }}
                onPrintBill={handlePrintBill}
                onMarkAsComplete={handleMarkOrderAsComplete}
            />

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