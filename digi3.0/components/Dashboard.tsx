import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import StatCard from './StatCard';
import GrowthChart from './GrowthChart';
import DataTable from './DataTable';
import { DashboardData, StatCardData, DataTableData, Order, MenuItem, Store, Role, Ingredient } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { BoxIcon, ChartBarIcon } from './icons';

type TimeRange = 'today' | 'week' | 'month';

interface DashboardProps {
    userId: string;
    stores: Store[];
    role: Role | null;
}

const Dashboard: React.FC<DashboardProps> = ({ userId, stores, role }) => {
    const { t } = useTranslation();
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [filterStoreId, setFilterStoreId] = useState('all');
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const ordersQuery = query(collection(db, "orders"), where("userId", "==", userId));
        const menuItemsQuery = query(collection(db, "menuItems"), where("userId", "==", userId));
        const ingredientsQuery = query(collection(db, "ingredients"), where("userId", "==", userId));

        const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => doc.data() as Order);
            setAllOrders(fetchedOrders);
            if(loading) setLoading(false);
        }, (error) => {
            console.error("Orders snapshot error:", error);
            setLoading(false);
        });
        
        const unsubscribeMenuItems = onSnapshot(menuItemsQuery, (snapshot) => {
            const fetchedItems = snapshot.docs.map(doc => doc.data() as MenuItem);
            setMenuItems(fetchedItems);
        }, (error) => {
            console.error("Menu items snapshot error:", error);
        });

        const unsubscribeIngredients = onSnapshot(ingredientsQuery, (snapshot) => {
            const fetchedIngredients = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as Ingredient);
            setIngredients(fetchedIngredients);
        }, (error) => {
            console.error("Ingredients snapshot error:", error);
        });

        return () => {
            unsubscribeOrders();
            unsubscribeMenuItems();
            unsubscribeIngredients();
        };
    }, [userId]);

    const data: DashboardData | null = useMemo(() => {
        if (loading) return null;

        const filteredOrdersByStore = allOrders.filter(order => {
            if (filterStoreId === 'all') return true;
            if (filterStoreId === 'online') return !order.storeId;
            return order.storeId === filterStoreId;
        });
        
        const now = new Date();
        const getStartDate = (range: TimeRange) => {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            if (range === 'week') {
                start.setDate(now.getDate() - 6); // 7 days including today
            } else if (range === 'month') {
                start.setDate(now.getDate() - 29); // 30 days including today
            }
            return start;
        };

        const startDate = getStartDate(timeRange);
        const filteredOrders = filteredOrdersByStore.filter(order => {
            const orderDate = new Date(order.createdAt.seconds * 1000);
            return orderDate >= startDate;
        });
        
        const lowStockCount = ingredients.filter(i => i.stock <= i.lowStockThreshold).length;

        const defaultStats = [
            { title: t('dashboard_stat_revenue'), value: "OMR 0.000", icon: ChartBarIcon },
            { title: t('dashboard_stat_total_orders'), value: 0, icon: ChartBarIcon },
            { title: t('dashboard_stat_low_stock'), value: lowStockCount, icon: BoxIcon, iconBgColor: lowStockCount > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-brand-gray-100', iconColor: lowStockCount > 0 ? 'text-red-500' : 'text-brand-gray-600' },
            { title: t('dashboard_stat_items_sold'), value: 0, icon: ChartBarIcon }
        ];

        if (filteredOrders.length === 0) {
            return {
                stats: defaultStats,
                growthChart: { totalGrowth: "OMR 0.000", data: [] },
                mostSoldFoods: { headers: [t('dashboard_table_header_food'), t('dashboard_table_header_sold')], rows: [] },
                qrScanCount: { headers: [], rows: [] }
            };
        }

        // --- Calculate Stats ---
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = filteredOrders.length;
        const totalItemsSold = filteredOrders.reduce((sum, order) => 
            sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

        const stats: StatCardData[] = [
            { title: t('dashboard_stat_revenue'), value: `OMR ${totalRevenue.toFixed(3)}`, icon: ChartBarIcon },
            { title: t('dashboard_stat_total_orders'), value: totalOrders, icon: ChartBarIcon },
            { title: t('dashboard_stat_low_stock'), value: lowStockCount, icon: BoxIcon, iconBgColor: lowStockCount > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-brand-gray-100 dark:bg-brand-gray-800', iconColor: lowStockCount > 0 ? 'text-red-500' : 'text-brand-gray-600 dark:text-brand-gray-300' },
            { title: t('dashboard_stat_items_sold'), value: totalItemsSold, icon: ChartBarIcon }
        ];

        // --- Calculate Most Sold Foods ---
        const foodCounts = new Map<string, number>();
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                foodCounts.set(item.name, (foodCounts.get(item.name) || 0) + item.quantity);
            });
        });
        
        const sortedFoods = [...foodCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const mostSoldFoods: DataTableData = {
            headers: [t('dashboard_table_header_food'), t('dashboard_table_header_sold')],
            rows: sortedFoods.map(([name, count]) => ({ cells: [name, count] }))
        };

        // --- Calculate Growth Chart Data ---
        const itemToCategoryMap = new Map<string, string>();
        menuItems.forEach(item => itemToCategoryMap.set(item.name, item.category));

        const getBucketKey = (date: Date) => {
             if (timeRange === 'today') return `${date.getHours()}`;
             return date.toISOString().split('T')[0]; // YYYY-MM-DD
        };
        
        const timeBuckets = new Map<string, { food: number; drinks: number; other: number }>();
        const daysInRange = timeRange === 'week' ? 7 : 30;

        if (timeRange === 'today') {
            for (let i = 0; i < 24; i++) { timeBuckets.set(`${i}`, { food: 0, drinks: 0, other: 0 }); }
        } else {
            for (let i = 0; i < daysInRange; i++) {
                const d = new Date();
                d.setHours(0,0,0,0);
                d.setDate(now.getDate() - i);
                timeBuckets.set(getBucketKey(d), { food: 0, drinks: 0, other: 0 });
            }
        }

        filteredOrders.forEach(order => {
            const orderDate = new Date(order.createdAt.seconds * 1000);
            const bucketKey = getBucketKey(orderDate);
            const bucket = timeBuckets.get(bucketKey);

            if (bucket) {
                order.items.forEach(item => {
                    const categoryName = itemToCategoryMap.get(item.name);
                    const itemTotal = item.price * item.quantity;
                    if (categoryName?.toLowerCase().includes('drink')) {
                        bucket.drinks += itemTotal;
                    } else {
                        bucket.food += itemTotal;
                    }
                });
            }
        });
        
        const formatBucketKey = (key: string) => {
            if (timeRange === 'today') return `${key}:00`;
            const parts = key.split('-');
            return `${parts[1]}/${parts[2]}`; // MM/DD
        };

        const growthChartData = Array.from(timeBuckets.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, values]) => ({
                name: formatBucketKey(key),
                ...values
            }));

        return {
            stats,
            growthChart: {
                totalGrowth: `OMR ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
                data: growthChartData
            },
            mostSoldFoods,
            qrScanCount: { headers: [], rows: [] } // No longer used
        };
    }, [allOrders, menuItems, ingredients, timeRange, filterStoreId, t, loading]);

    const renderTimeRangeButton = (range: TimeRange, label: string) => {
        const isActive = timeRange === range;
        return (
            <button 
                onClick={() => setTimeRange(range)}
                className={`flex-none font-semibold py-2 px-5 rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-brand-gray-800 focus:ring-brand-teal ${
                    isActive 
                    ? 'bg-brand-teal text-white' 
                    : 'bg-white dark:bg-brand-gray-800 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700'
                }`}
            >
                {label}
            </button>
        );
    }

    if (loading) {
        return <div className="flex justify-center items-center h-full text-brand-gray-500">{t('dashboard_loading')}</div>;
    }

    if (role !== 'admin' && role !== 'manager') {
        return <div className="flex justify-center items-center h-full text-brand-gray-500">{t('common_permission_denied')}</div>;
    }

    if (!data) {
        return (
            <div className="flex flex-col justify-center items-center h-full text-center p-4">
                <h2 className="text-2xl font-bold mb-2 text-brand-gray-700 dark:text-brand-gray-200">{t('dashboard_no_data_title')}</h2>
                <p className="text-brand-gray-500">{t('dashboard_no_data_subtitle')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    {renderTimeRangeButton('today', t('common_today'))}
                    {renderTimeRangeButton('week', t('common_week'))}
                    {renderTimeRangeButton('month', t('common_month'))}
                </div>
                 <select
                    value={filterStoreId}
                    onChange={(e) => setFilterStoreId(e.target.value)}
                    className="flex-none font-semibold py-1.5 px-4 sm:py-2 sm:px-5 rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-brand-gray-800 focus:ring-brand-teal bg-white dark:bg-brand-gray-800 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700"
                >
                    <option value="all">{t('common_all_stores')}</option>
                    <option value="online">{t('common_online_no_store')}</option>
                    {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {data.stats.map(stat => (
                    <StatCard
                        key={stat.title}
                        {...stat}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-brand-gray-900 p-4 sm:p-6 rounded-xl shadow-md">
                    <GrowthChart data={data.growthChart.data} totalGrowth={data.growthChart.totalGrowth} />
                </div>
                <div className="lg:col-span-1">
                    <DataTable title={t('dashboard_top_selling_items')} data={data.mostSoldFoods} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;