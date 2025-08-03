import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy, Timestamp, writeBatch, getDocs, increment, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, OrderStatus, Store, PrepItem, RestaurantProfile, Role, MenuItem, FloorPlan } from '../types';
import OrderCard from './OrderCard';
import CompletedOrdersTable from './CompletedOrdersTable';
import OrderDetailModal from './OrderDetailModal';
import PrepView from './PrepView';
import PrintableTicket from './PrintableTicket';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useTranslation, LanguageProvider } from '../contexts/LanguageContext';
import { TranslationKey } from '../i18n/en';

interface OrdersPageProps {
    userId: string;
    onNewOrder: () => void;
    profile: RestaurantProfile | null;
    stores: Store[];
    role: Role | null;
}

type ViewMode = 'kanban' | 'prep' | 'completed';

const OrdersPage: React.FC<OrdersPageProps> = ({ userId, onNewOrder, profile, stores, role }) => {
    const { t } = useTranslation();
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [viewMode, setViewMode] = useState<ViewMode>('kanban');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStoreId, setFilterStoreId] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);

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
        const menuItemsQuery = query(collection(db, "menuItems"), where("userId", "==", userId));
        const unsubscribe = onSnapshot(menuItemsQuery, (snapshot) => {
            setMenuItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem)));
        });
        return unsubscribe;
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);

        const activeStatuses: OrderStatus[] = ['Pending', 'New', 'In Progress', 'Ready'];
        const q = query(
            collection(db, "orders"),
            where("userId", "==", userId),
            where("status", "in", activeStatuses),
            orderBy("createdAt", "asc")
        );
        
        const unsubscribeActive = onSnapshot(q, (snapshot) => {
            const fetchedOrders: Order[] = snapshot.docs.map(doc => {
                 const orderData = doc.data() as Omit<Order, 'id'>;
                 const storeName = stores.find(s => s.id === orderData.storeId)?.name;
                 return { ...orderData, id: doc.id, storeName };
            });
            
            setAllOrders(fetchedOrders);
            setLoading(false);
        }, (error) => {
            console.error("Firebase active orders error:", error);
            setLoading(false);
        });

        return () => unsubscribeActive();
    }, [userId, stores]);
    
    useEffect(() => {
        if (viewMode !== 'completed' || !userId) return;

        const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
        const qCompleted = query(
            collection(db, "orders"),
            where("userId", "==", userId),
            where("status", "==", "Completed"),
            where("createdAt", ">=", twentyFourHoursAgo),
            orderBy("createdAt", "desc")
        );

        const unsubscribeCompleted = onSnapshot(qCompleted, (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => {
                 const orderData = doc.data() as Omit<Order, 'id'>;
                 const storeName = stores.find(s => s.id === orderData.storeId)?.name;
                 return { ...orderData, id: doc.id, storeName };
            });
            setCompletedOrders(fetchedOrders as Order[]);
        }, (error) => {
            console.error("Firebase completed orders error:", error);
        });

        return () => unsubscribeCompleted();
    }, [viewMode, userId, stores]);


    const filteredActiveOrders = useMemo(() => {
        return allOrders.filter(order => {
            const matchesStore = filterStoreId === 'all' || order.storeId === filterStoreId || (filterStoreId === 'online' && !order.storeId);
            const matchesSearch = !searchQuery || order.plateNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || order.id.includes(searchQuery);
            return matchesStore && matchesSearch;
        });
    }, [allOrders, searchQuery, filterStoreId]);

    const ordersByStatus = useMemo(() => {
        const result: Record<OrderStatus, Order[]> = { 'Pending': [], 'New': [], 'In Progress': [], 'Ready': [], 'Completed': [] };
        
        const sortedOrders = [...filteredActiveOrders].sort((a, b) => {
            if (a.isUrgent === b.isUrgent) return 0; // Keep original sort order (createdAt)
            return a.isUrgent ? -1 : 1; // Urgent orders come first
        });
        
        sortedOrders.forEach(order => {
             if (order.status !== 'Completed') {
                result[order.status].push(order);
            }
        });
        return result;
    }, [filteredActiveOrders]);

    const prepItems = useMemo<PrepItem[]>(() => {
        if (viewMode !== 'prep') return [];

        const itemMap = new Map<string, PrepItem>();

        filteredActiveOrders.forEach(order => {
            order.items.forEach(item => {
                if (item.isCompleted) return;

                const modifiersString = item.selectedModifiers?.map(m => m.optionName).sort().join(', ') || '';
                const key = `${item.name}::${modifiersString}::${item.notes || 'no-note'}`;
                
                const existing = itemMap.get(key);

                if (existing) {
                    existing.totalQuantity += item.quantity;
                    existing.orders.push({ orderId: order.id, plateNumber: order.plateNumber, quantity: item.quantity });
                } else {
                    itemMap.set(key, {
                        name: item.name,
                        notes: item.notes,
                        modifiers: modifiersString,
                        totalQuantity: item.quantity,
                        orders: [{ orderId: order.id, plateNumber: order.plateNumber, quantity: item.quantity }]
                    });
                }
            });
        });

        return Array.from(itemMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
    }, [filteredActiveOrders, viewMode]);
    
    const handleMarkAsComplete = async (orderId: string) => {
        const orderToComplete = allOrders.find(o => o.id === orderId);
        if (!orderToComplete) return;

        const batch = writeBatch(db);

        const deductions = new Map<string, number>();
        orderToComplete.items.forEach(orderItem => {
            const menuItem = menuItems.find(mi => mi.id === orderItem.menuItemId);
            if (menuItem?.recipe) {
                menuItem.recipe.forEach(recipeItem => {
                    const totalDeduction = recipeItem.quantity * orderItem.quantity;
                    deductions.set(recipeItem.ingredientId, (deductions.get(recipeItem.ingredientId) || 0) + totalDeduction);
                });
            }
        });

        deductions.forEach((quantityToDeduction, ingredientId) => {
            const ingredientRef = doc(db, 'ingredients', ingredientId);
            batch.update(ingredientRef, { stock: increment(-quantityToDeduction) });
        });

        const orderRef = doc(db, 'orders', orderId);
        batch.update(orderRef, { status: 'Completed' });

        if (orderToComplete.plateNumber) {
            const floorPlanRef = doc(db, 'floorPlans', userId);
            const floorPlanSnap = await getDoc(floorPlanRef);
            if(floorPlanSnap.exists()) {
                const floorPlan = floorPlanSnap.data() as FloorPlan;
                const newTables = floorPlan.tables.map(table => {
                    if (table.label === orderToComplete.plateNumber) {
                        return { ...table, status: 'needs_cleaning' };
                    }
                    return table;
                });
                batch.update(floorPlanRef, { tables: newTables });
            }
        }

        try {
            await batch.commit();
        } catch (error) {
            console.error("Failed to complete order and deduct stock:", error);
        }
    }

    const handleUpdateItemStatus = async (orderId: string, itemIndex: number, newStatus: boolean) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderToUpdate = allOrders.find(o => o.id === orderId) || completedOrders.find(o => o.id === orderId);
        
        if (orderToUpdate) {
            const updatedItems = [...orderToUpdate.items];
            if (updatedItems[itemIndex]) {
                updatedItems[itemIndex].isCompleted = newStatus;
                await updateDoc(orderRef, { items: updatedItems });
            }
        }
    };
    
    const handleToggleUrgent = async (orderId: string, currentStatus: boolean) => {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, { isUrgent: !currentStatus });
    };

    const handleRecallOrder = async (orderId: string) => {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, { status: 'Ready' });
        setViewMode('kanban');
    };

    const handlePrintOrder = (order: Order) => {
        setOrderToPrint(order);
    };
    
    const handleApproveOrder = async (orderId: string) => {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, { status: 'New' });
        onNewOrder();
    };

    const handleRejectOrder = async (orderId: string) => {
        if (window.confirm(t('order_card_reject_confirm'))) {
            const orderRef = doc(db, 'orders', orderId);
            await deleteDoc(orderRef);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        if (role === 'kitchen_staff') return;

        const { source, destination, draggableId } = result;
        if (!destination) return;

        const sourceStatus = source.droppableId as OrderStatus;
        const destStatus = destination.droppableId as OrderStatus;
        
        if (sourceStatus === 'Pending' && destStatus !== 'New') return;

        if (sourceStatus === destStatus && source.index === destination.index) return;
        
        await updateDoc(doc(db, 'orders', draggableId), { status: destStatus });
        
        if (sourceStatus === 'Pending' && destStatus === 'New') {
            onNewOrder();
        }
    };

    const statusConfig: Record<OrderStatus, { titleKey: TranslationKey; color: string; }> = {
        'Pending': { titleKey: 'orders_page_status_pending', color: 'bg-purple-500' },
        'New': { titleKey: 'orders_page_status_new', color: 'bg-blue-500' },
        'In Progress': { titleKey: 'orders_page_status_in_progress', color: 'bg-yellow-500' },
        'Ready': { titleKey: 'orders_page_status_ready', color: 'bg-green-500' },
        'Completed': { titleKey: 'orders_page_status_completed', color: 'bg-gray-500' },
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full">{t('orders_page_loading')}</div>;
    }

    const ViewModeButton = ({ label, current, target }: { label:string, current:ViewMode, target:ViewMode }) => (
        <button
            onClick={() => setViewMode(target)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-sm transition-colors ${
                current === target
                    ? 'bg-brand-teal text-white shadow'
                    : 'bg-white dark:bg-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-600'
            }`}
        >
            {label}
        </button>
    );
    
    const renderKanbanView = () => (
        <DragDropContext onDragEnd={onDragEnd}>
            <div data-tour-id="orders-kanban" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 h-full min-h-[500px]">
                {(['Pending', 'New', 'In Progress', 'Ready'] as OrderStatus[]).map(status => (
                    <div key={status} className="bg-brand-gray-100 dark:bg-brand-gray-800 rounded-xl flex flex-col h-full">
                        <div className={`p-4 rounded-t-xl ${statusConfig[status].color}`}>
                            <h3 className="font-bold text-white text-lg">{t(statusConfig[status].titleKey)} ({ordersByStatus[status].length})</h3>
                        </div>
                        <Droppable droppableId={status} isDropDisabled={role === 'kitchen_staff' || (status === 'Pending' && role !== 'admin' && role !== 'manager')}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`p-2 sm:p-4 flex-grow overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-brand-gray-200 dark:bg-brand-gray-700' : ''}`}
                                >
                                    {ordersByStatus[status].length > 0 ? (
                                        ordersByStatus[status].map((order, index) => (
                                            <OrderCard 
                                                key={order.id} 
                                                order={order} 
                                                index={index} 
                                                onMarkComplete={handleMarkAsComplete}
                                                onToggleUrgent={handleToggleUrgent}
                                                onCardClick={() => setSelectedOrder(order)}
                                                onPrint={() => handlePrintOrder(order)}
                                                onApprove={handleApproveOrder}
                                                onReject={handleRejectOrder}
                                                role={role}
                                            />
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-brand-gray-400">
                                            <p>{t('orders_page_no_orders_in_column')}</p>
                                        </div>
                                    )}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );

    const renderContent = () => {
        switch(viewMode) {
            case 'kanban': return renderKanbanView();
            case 'prep': return <PrepView items={prepItems} />;
            case 'completed': return <CompletedOrdersTable orders={completedOrders} onRecallOrder={handleRecallOrder} />;
            default: return renderKanbanView();
        }
    }

    return (
        <div className="space-y-4">
             <div className="bg-white dark:bg-brand-gray-900 p-4 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <input
                        type="text"
                        placeholder={t('orders_page_search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3 py-1.5 sm:py-2 w-48 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                    />
                    <select
                        value={filterStoreId}
                        onChange={(e) => setFilterStoreId(e.target.value)}
                        className="px-3 py-1.5 sm:py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                    >
                        <option value="all">{t('common_all_stores')}</option>
                         <option value="online">{t('common_online_no_store')}</option>
                        {stores.map(store => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                    </select>
                </div>
                 <div className="flex items-center gap-2 p-1 bg-brand-gray-100 dark:bg-brand-gray-800 rounded-xl">
                     <ViewModeButton label={t('orders_page_view_kanban')} current={viewMode} target="kanban" />
                     <ViewModeButton label={t('orders_page_view_prep')} current={viewMode} target="prep" />
                     {(role === 'admin' || role === 'manager') && <ViewModeButton label={t('orders_page_view_completed')} current={viewMode} target="completed" />}
                </div>
            </div>
            
            {renderContent()}

            {selectedOrder && (
                <OrderDetailModal 
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onPrint={() => handlePrintOrder(selectedOrder)}
                    onUpdateItemStatus={(itemIndex, newStatus) => handleUpdateItemStatus(selectedOrder.id, itemIndex, newStatus)}
                />
            )}
        </div>
    );
};

export default OrdersPage;