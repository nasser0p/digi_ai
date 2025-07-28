import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Promotion, Role, MenuItem, LoyaltyProgram, MultiBuyOffer, SpecialOffer, Order, CustomerLoyaltyProgress } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { MegaphoneIcon, TicketIcon, TagIcon, ChartBarIcon } from '../icons';
import SlideInPanel from '../ui/SlideInPanel';
import LoadingSpinner from '../ui/LoadingSpinner';
import PromotionForm from './PromotionForm';
import Modal from '../Modal';
import PromotionsAnalytics from './PromotionsAnalytics';
import CustomersAnalytics from './CustomersAnalytics';

interface PromotionsPageProps {
    userId: string;
    role: Role | null;
}

export type NewPromotionType = 'loyalty_visit_based' | 'loyalty_spend_based' | 'multi_buy' | 'special_offer';
type PromotionSubView = 'campaigns' | 'analytics' | 'customers';

export interface CustomerAnalyticsData {
    id: string; // phone number
    joinDate: string;
    lastOrderDate: string;
    totalOrders: number;
    totalSpent: number;
    points: number;
}

const PromotionsPage: React.FC<PromotionsPageProps> = ({ userId, role }) => {
    const { t } = useTranslation();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [allCompletedOrders, setAllCompletedOrders] = useState<Order[]>([]);
    const [customerLoyaltyData, setCustomerLoyaltyData] = useState<CustomerLoyaltyProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<PromotionSubView>('campaigns');
    
    // Panel/Modal State
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [newPromotionType, setNewPromotionType] = useState<NewPromotionType | null>(null);
    const [analyticsDateRange, setAnalyticsDateRange] = useState<'today' | 'week' | 'month'>('month');

    const canEdit = role === 'admin' || role === 'manager';
    const isAdmin = role === 'admin';

    useEffect(() => {
        if (!userId) return;

        const promoQuery = query(collection(db, 'promotions'), where('userId', '==', userId));
        const unsubPromos = onSnapshot(promoQuery, snapshot => {
            setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promotion)));
            if (loading) setLoading(false);
        });

        const menuQuery = query(collection(db, 'menuItems'), where('userId', '==', userId));
        const unsubMenu = onSnapshot(menuQuery, snapshot => {
            setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
        });
        
        const ordersQuery = query(collection(db, 'orders'), where('userId', '==', userId));
        const unsubOrders = onSnapshot(ordersQuery, snapshot => {
            setAllCompletedOrders(snapshot.docs.map(doc => doc.data() as Order));
        });
        
        if (isAdmin) {
            const loyaltyQuery = query(collection(db, 'customerLoyalty'), where('userId', '==', userId));
            const unsubLoyalty = onSnapshot(loyaltyQuery, snapshot => {
                setCustomerLoyaltyData(snapshot.docs.map(doc => doc.data() as CustomerLoyaltyProgress));
            });
             return () => { unsubPromos(); unsubMenu(); unsubOrders(); unsubLoyalty(); };
        }

        return () => {
            unsubPromos();
            unsubMenu();
            unsubOrders();
        };
    }, [userId, loading, isAdmin]);
    
    const analyticsData = useMemo(() => {
        const now = new Date();
        const getStartDate = (range: typeof analyticsDateRange) => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            if (range === 'week') start.setDate(now.getDate() - 6);
            else if (range === 'month') start.setDate(now.getDate() - 29);
            return start;
        };

        const startDate = getStartDate(analyticsDateRange);
        const filteredOrders = allCompletedOrders.filter(o => o.status === 'Completed' && new Date(o.createdAt.seconds * 1000) >= startDate);

        const kpis = { redemptions: 0, revenue: 0, cost: 0 };
        const chartMap = new Map<string, number>();
        const tableData = new Map<string, { name: string; redemptions: number; revenue: number; cost: number }>();

        promotions.forEach(p => tableData.set(p.id, { name: p.name, redemptions: 0, revenue: 0, cost: 0 }));

        for (const order of filteredOrders) {
            if (!order.appliedDiscounts || order.appliedDiscounts.length === 0) continue;
            
            const day = new Date(order.createdAt.seconds * 1000).toISOString().split('T')[0];
            chartMap.set(day, (chartMap.get(day) || 0) + 1);
            
            for (const discount of order.appliedDiscounts) {
                const promo = promotions.find(p => p.name === discount.promotionName);
                if (promo) {
                    const promoStats = tableData.get(promo.id)!;
                    promoStats.redemptions += 1;
                    promoStats.revenue += order.total;
                    promoStats.cost += discount.amount;
                    kpis.redemptions += 1;
                    kpis.revenue += order.total;
                    kpis.cost += discount.amount;
                }
            }
        }
        
        const chartData = Array.from(chartMap.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([name, redemptions]) => ({ name, redemptions }));

        return { kpis, chartData, tableData: Array.from(tableData.values()) };

    }, [allCompletedOrders, promotions, analyticsDateRange]);

    const customersAnalyticsData = useMemo<CustomerAnalyticsData[]>(() => {
        if (activeView !== 'customers' || !isAdmin) return [];

        const ordersByCustomer = new Map<string, Order[]>();
        allCompletedOrders.forEach(order => {
            if (order.customerPhoneNumber) {
                if (!ordersByCustomer.has(order.customerPhoneNumber)) {
                    ordersByCustomer.set(order.customerPhoneNumber, []);
                }
                ordersByCustomer.get(order.customerPhoneNumber)!.push(order);
            }
        });
        
        return customerLoyaltyData.map(loyalty => {
            const customerOrders = ordersByCustomer.get(loyalty.id) || [];
            const lastOrder = customerOrders.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds)[0];

            return {
                id: loyalty.id,
                joinDate: new Date(loyalty.createdAt.seconds * 1000).toLocaleDateString(),
                lastOrderDate: lastOrder ? new Date(lastOrder.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
                totalOrders: customerOrders.length,
                totalSpent: customerOrders.reduce((sum, order) => sum + order.total, 0),
                points: loyalty.points,
            };
        });
    }, [activeView, isAdmin, customerLoyaltyData, allCompletedOrders]);
    
    const handleStartCreateFlow = (type: NewPromotionType) => {
        setNewPromotionType(type);
        setEditingPromotion(null);
        setIsTypeModalOpen(false);
        setIsPanelOpen(true);
    };

    const handleEdit = (promo: Promotion) => {
        setEditingPromotion(promo);
        setIsPanelOpen(true);
    }
    
    const handleDelete = async (promoId: string) => {
        if (window.confirm(t('promotions_delete_confirm'))) {
            await deleteDoc(doc(db, 'promotions', promoId));
        }
    }
    
    const getPromotionDescription = (promo: Promotion): string => {
        switch (promo.type) {
            case 'loyalty':
                const details = promo.details as LoyaltyProgram;
                if (details.type === 'visit_based') {
                    const rewardItem = menuItems.find(mi => mi.id === details.rewardItemId)?.name || 'an item';
                    return `Buy ${details.visitGoal || 'X'}, get ${rewardItem} free.`;
                }
                if (details.type === 'spend_based') {
                    return `Earn ${details.earnRate || 1} point per OMR 1 spent.`;
                }
                return t('promotions_form_type_loyalty');
            case 'multi_buy':
                 const mbDetails = promo.details as MultiBuyOffer;
                 return `Buy ${mbDetails.buyQuantity}, get ${mbDetails.getQuantity} free or discounted.`;
            case 'special_offer':
                 const soDetails = promo.details as SpecialOffer;
                 if (soDetails.discountType === 'percentage') {
                    return `${soDetails.discountValue}% off applicable items.`;
                 }
                 return `OMR ${soDetails.discountValue} off applicable items.`;
            default:
                return 'Promotion';
        }
    }
    
    const getPromotionIcon = (promo: Promotion) => {
        switch(promo.type) {
            case 'loyalty': return <TicketIcon className="w-6 h-6 text-brand-teal" />;
            case 'multi_buy':
            case 'special_offer':
                return <TagIcon className="w-6 h-6 text-blue-500" />;
            default: return <MegaphoneIcon className="w-6 h-6 text-brand-gray-500" />;
        }
    }

    if (loading) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }

    if (!canEdit) {
        return <div className="text-center p-8">{t('common_permission_denied')}</div>;
    }

    const TabButton = ({ view, label }: { view: PromotionSubView; label: string }) => (
        <button
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 text-sm font-semibold rounded-md ${activeView === view ? 'bg-brand-teal text-white' : 'text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">{t('promotions_page_title')}</h1>
                    <p className="text-brand-gray-500 dark:text-brand-gray-400 mt-1">{t('promotions_page_desc')}</p>
                </div>
                <button onClick={() => setIsTypeModalOpen(true)} className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-2 px-4 rounded-lg text-sm">
                    {t('promotions_create_button')}
                </button>
            </div>
            
            <div className="flex space-x-2 bg-brand-gray-200 dark:bg-brand-gray-900 p-1 rounded-lg self-start">
                <TabButton view="campaigns" label={t('promotions_campaigns_tab')} />
                <TabButton view="analytics" label={t('promotions_analytics_tab')} />
                {isAdmin && <TabButton view="customers" label={t('promotions_customers_tab')} />}
            </div>

            {activeView === 'campaigns' && (
                <div className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md">
                    <div className="space-y-3">
                        {promotions.length > 0 ? promotions.map(promo => (
                            <div key={promo.id} className="flex justify-between items-center p-4 border border-brand-gray-200 dark:border-brand-gray-700 rounded-lg">
                                <div className="flex items-center gap-4">
                                    {getPromotionIcon(promo)}
                                    <div>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full mr-2 ${promo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                                            {promo.isActive ? t('promotions_status_active') : t('promotions_status_inactive')}
                                        </span>
                                        <span className="font-semibold">{promo.name}</span>
                                        <p className="text-xs text-brand-gray-500">{getPromotionDescription(promo)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                    <button onClick={() => handleEdit(promo)} className="text-sm text-blue-500 hover:text-blue-700 font-medium">{t('common_edit')}</button>
                                    <button onClick={() => handleDelete(promo.id)} className="text-sm text-red-500 hover:text-red-700 font-medium">{t('common_delete')}</button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12">
                                <MegaphoneIcon className="w-12 h-12 mx-auto text-brand-gray-300" />
                                <h3 className="mt-2 text-lg font-semibold text-brand-gray-800 dark:text-white">{t('promotions_no_promotions_title')}</h3>
                                <p className="mt-1 text-sm text-brand-gray-500">{t('promotions_no_promotions_desc')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeView === 'analytics' && (
                 <PromotionsAnalytics
                    data={analyticsData}
                    dateRange={analyticsDateRange}
                    setDateRange={setAnalyticsDateRange}
                 />
            )}
            
            {activeView === 'customers' && isAdmin && (
                <CustomersAnalytics data={customersAnalyticsData} />
            )}

            <SlideInPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)}>
                {isPanelOpen && <PromotionForm userId={userId} promotion={editingPromotion} newPromotionType={newPromotionType} menuItems={menuItems} onClose={() => setIsPanelOpen(false)} />}
            </SlideInPanel>

            {isTypeModalOpen && (
                 <Modal onClose={() => setIsTypeModalOpen(false)}>
                    <div className="p-2">
                        <h3 className="text-lg font-bold text-center mb-4">{t('promotions_select_type_title')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <TypeCard icon={TicketIcon} title={t('promotions_loyalty_punch_card')} description={t('promotions_punch_card_modal_desc')} onClick={() => handleStartCreateFlow('loyalty_visit_based')} />
                           <TypeCard icon={TicketIcon} title={t('promotions_loyalty_points')} description={t('promotions_points_modal_desc')} onClick={() => handleStartCreateFlow('loyalty_spend_based')} />
                           <TypeCard icon={TagIcon} title={t('promotions_type_multi_buy')} description={t('promotions_multi_buy_modal_desc')} onClick={() => handleStartCreateFlow('multi_buy')} />
                           <TypeCard icon={TagIcon} title={t('promotions_form_type_offer')} description={t('promotions_offer_modal_desc')} onClick={() => handleStartCreateFlow('special_offer')} />
                        </div>
                    </div>
                 </Modal>
            )}
        </div>
    );
};

const TypeCard = ({ icon: Icon, title, description, onClick }: { icon: React.FC<any>, title: string, description: string, onClick: () => void }) => (
    <button onClick={onClick} className="text-left p-4 border border-brand-gray-200 dark:border-brand-gray-700 rounded-lg hover:bg-brand-gray-50 dark:hover:bg-brand-gray-700/50 hover:ring-2 hover:ring-brand-teal transition-all">
        <Icon className="w-8 h-8 text-brand-teal mb-2" />
        <h4 className="font-bold text-brand-gray-800 dark:text-white">{title}</h4>
        <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-1">{description}</p>
    </button>
)

export default PromotionsPage;