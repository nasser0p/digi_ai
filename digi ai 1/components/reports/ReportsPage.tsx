import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, Store, Role, MenuItem, RestaurantProfile, ZReport } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { TranslationKey } from '../../i18n/en';
import { DownloadIcon, PrintIcon } from '../icons';
import ReportTable from './ReportTable';
import PrintableReport from './PrintableReport';
import LoadingSpinner from '../ui/LoadingSpinner';
import ReportChart from './ReportChart';
import ComparisonView from './ComparisonView';
import ZReportModal from './ZReportModal';

type ReportType = 'sales_summary' | 'item_performance' | 'category_performance' | 'peak_hours';
type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom';

interface ReportData {
  titleKey: TranslationKey;
  headers: string[];
  rows: (string | number)[][];
  footers?: (string | number)[];
}

interface ComparisonData {
    current: { revenue: number; orders: number; items: number; };
    previous: { revenue: number; orders: number; items: number; };
    change: { revenue: number; orders: number; items: number; };
}

interface ChartInfo {
    data: any[];
    type: 'bar' | 'pie' | 'line';
    titleKey: TranslationKey;
}


interface ReportsPageProps {
  userId: string;
  stores: Store[];
  role: Role | null;
}

const ReportsPage: React.FC<ReportsPageProps> = ({ userId, stores, role }) => {
    const { t } = useTranslation();

    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [zReports, setZReports] = useState<ZReport[]>([]);
    const [profile, setProfile] = useState<RestaurantProfile | null>(null);
    const [isDataLoading, setIsDataLoading] = useState(true);
    
    const [reportType, setReportType] = useState<ReportType>('sales_summary');
    const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStoreId, setFilterStoreId] = useState('all');
    const [isComparing, setIsComparing] = useState(false);

    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
    const [chartInfo, setChartInfo] = useState<ChartInfo | null>(null);
    const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);


    useEffect(() => {
        handleDatePresetChange('this_month');
    }, []);

    useEffect(() => {
      if (!userId) return;

      const profileRef = doc(db, 'restaurantProfiles', userId);
      const unsubProfile = onSnapshot(profileRef, docSnap => {
          if (docSnap.exists()) setProfile(docSnap.data() as RestaurantProfile);
      });

      const ordersQuery = query(collection(db, "orders"), where("userId", "==", userId), where("status", "==", "Completed"));
      const unsubOrders = onSnapshot(ordersQuery, snapshot => {
          setAllOrders(snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Order)));
          if(isDataLoading) setIsDataLoading(false);
      });

      const menuItemsQuery = query(collection(db, "menuItems"), where("userId", "==", userId));
      const unsubMenuItems = onSnapshot(menuItemsQuery, snapshot => {
          setMenuItems(snapshot.docs.map(doc => doc.data() as MenuItem));
      });
      
      const zReportsQuery = query(collection(db, 'zReports'), where('userId', '==', userId), orderBy('reportDate', 'desc'));
      const unsubZReports = onSnapshot(zReportsQuery, snapshot => {
          setZReports(snapshot.docs.map(doc => doc.data() as ZReport));
      });

      return () => {
          unsubProfile();
          unsubOrders();
          unsubMenuItems();
          unsubZReports();
      };
    }, [userId, isDataLoading]);

    const handleDatePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        const end = new Date();
        let start = new Date();

        switch (preset) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'this_week':
                start.setDate(end.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                break;
            case 'this_month':
                start.setDate(end.getDate() - 29);
                start.setHours(0, 0, 0, 0);
                break;
            case 'custom': return;
        }
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };
    
    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setReportData(null);
        setComparisonData(null);
        setChartInfo(null);
        
        await new Promise(resolve => setTimeout(resolve, 500));

        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);

        const filterOrdersByDate = (orders: Order[], start: Date, end: Date) => {
            return orders.filter(order => {
                const orderDate = new Date(order.createdAt.seconds * 1000);
                const matchesStore = filterStoreId === 'all' || order.storeId === filterStoreId || (filterStoreId === 'online' && !order.storeId);
                return orderDate >= start && orderDate <= end && matchesStore;
            });
        }
        
        const filteredOrders = filterOrdersByDate(allOrders, sDate, eDate);

        if (isComparing) {
            const mainPeriodDuration = eDate.getTime() - sDate.getTime();
            const compareEndDate = new Date(sDate.getTime() - 24 * 60 * 60 * 1000); // Day before the start date
            compareEndDate.setHours(23, 59, 59, 999);
            const compareStartDate = new Date(compareEndDate.getTime() - mainPeriodDuration);
            compareStartDate.setHours(0, 0, 0, 0);

            const previousOrders = filterOrdersByDate(allOrders, compareStartDate, compareEndDate);
            
            const calcStats = (orders: Order[]) => ({
                revenue: orders.reduce((sum, o) => sum + o.total, 0),
                orders: orders.length,
                items: orders.reduce((sum, o) => sum + o.items.reduce((iSum, i) => iSum + i.quantity, 0), 0)
            });

            const currentStats = calcStats(filteredOrders);
            const previousStats = calcStats(previousOrders);

            const calcChange = (current: number, previous: number) => {
                if (previous === 0) return current > 0 ? 100.0 : 0;
                return ((current - previous) / previous) * 100;
            };

            setComparisonData({
                current: currentStats,
                previous: previousStats,
                change: {
                    revenue: calcChange(currentStats.revenue, previousStats.revenue),
                    orders: calcChange(currentStats.orders, previousStats.orders),
                    items: calcChange(currentStats.items, previousStats.items),
                }
            });
        }

        if (filteredOrders.length === 0) {
            setIsGenerating(false);
            return;
        }

        if (reportType === 'sales_summary') {
            const dailyData: Record<string, { orders: number; items: number; tips: number; revenue: number }> = {};
            filteredOrders.forEach(order => {
                const day = new Date(order.createdAt.seconds * 1000).toISOString().split('T')[0];
                if (!dailyData[day]) dailyData[day] = { orders: 0, items: 0, tips: 0, revenue: 0 };
                dailyData[day].orders += 1;
                dailyData[day].items += order.items.reduce((sum, item) => sum + item.quantity, 0);
                dailyData[day].tips += order.tip;
                dailyData[day].revenue += order.total;
            });
            const rows = Object.entries(dailyData).map(([date, data]) => [date, data.orders, data.items, data.tips.toFixed(3), data.revenue.toFixed(3)]);
            const totals = Object.values(dailyData).reduce((acc, data) => {
                acc[0] += data.orders;
                acc[1] += data.items;
                acc[2] += data.tips;
                acc[3] += data.revenue;
                return acc;
            }, [0, 0, 0, 0]);

            setReportData({
                titleKey: 'reports_type_sales',
                headers: [t('reports_sales_header_date'), t('reports_sales_header_orders'), t('reports_sales_header_items_sold'), t('reports_sales_header_tips'), t('reports_sales_header_revenue')],
                rows: rows.sort((a,b) => String(a[0]).localeCompare(String(b[0]))),
                footers: [t('reports_sales_footer_totals'), totals[0], totals[1], totals[2].toFixed(3), totals[3].toFixed(3)],
            });
            const chartData = Object.entries(dailyData).map(([date, data]) => ({name: date, revenue: data.revenue})).sort((a,b) => a.name.localeCompare(b.name));
            setChartInfo({ data: chartData, type: 'line', titleKey: 'reports_chart_title_revenue_trend' });
        }

        if (reportType === 'item_performance') {
            const itemData: Record<string, { quantity: number; revenue: number }> = {};
            filteredOrders.forEach(order => {
                order.items.forEach(item => {
                    if (!itemData[item.name]) itemData[item.name] = { quantity: 0, revenue: 0 };
                    itemData[item.name].quantity += item.quantity;
                    itemData[item.name].revenue += item.price * item.quantity;
                });
            });
            const rows = Object.entries(itemData).map(([name, data]) => [name, data.quantity, data.revenue.toFixed(3)]);
            const sortedRows = rows.sort((a, b) => Number(b[2]) - Number(a[2]));
            setReportData({
                titleKey: 'reports_type_item',
                headers: [t('reports_item_header_name'), t('reports_item_header_quantity'), t('reports_item_header_revenue')],
                rows: sortedRows,
            });
            const top5 = sortedRows.slice(0, 5).map(r => ({name: String(r[0]), value: Number(r[2])}));
            const otherValue = sortedRows.slice(5).reduce((sum, r) => sum + Number(r[2]), 0);
            if (otherValue > 0) top5.push({ name: 'Other', value: otherValue });
            setChartInfo({ data: top5, type: 'pie', titleKey: 'reports_chart_title_sales_by_item' });
        }
        
        if (reportType === 'category_performance') {
            const categoryData: Record<string, { items: number; revenue: number }> = {};
            const itemCategoryMap = new Map(menuItems.map(item => [item.name, item.category]));
            
            filteredOrders.forEach(order => {
                order.items.forEach(item => {
                    const category = itemCategoryMap.get(item.name) || 'Uncategorized';
                    if (!categoryData[category]) categoryData[category] = { items: 0, revenue: 0 };
                    categoryData[category].items += item.quantity;
                    categoryData[category].revenue += item.price * item.quantity;
                });
            });
            const rows = Object.entries(categoryData).map(([name, data]) => [name, data.items, data.revenue.toFixed(3)]);
            const sortedRows = rows.sort((a, b) => Number(b[2]) - Number(a[2]));
             setReportData({
                titleKey: 'reports_type_category',
                headers: [t('reports_category_header_name'), t('reports_category_header_items_sold'), t('reports_category_header_revenue')],
                rows: sortedRows,
            });
            const chartData = sortedRows.map(r => ({name: String(r[0]), value: Number(r[2])}));
            setChartInfo({ data: chartData, type: 'pie', titleKey: 'reports_chart_title_sales_by_category' });
        }

        if (reportType === 'peak_hours') {
            const hourlyData: { orders: number; revenue: number }[] = Array(24).fill(0).map(() => ({ orders: 0, revenue: 0 }));
            filteredOrders.forEach(order => {
                const hour = new Date(order.createdAt.seconds * 1000).getHours();
                hourlyData[hour].orders += 1;
                hourlyData[hour].revenue += order.total;
            });
            const rows = hourlyData.map((h, i) => [`${String(i).padStart(2, '0')}:00 - ${String(i).padStart(2, '0')}:59`, h.orders, h.revenue.toFixed(3)]);
            setReportData({
                titleKey: 'reports_type_peak_hours',
                headers: [t('reports_peak_hours_header_hour'), t('reports_peak_hours_header_orders'), t('reports_peak_hours_header_revenue')],
                rows: rows
            });
            const chartData = hourlyData.map((h, i) => ({ name: `${i}:00`, revenue: h.revenue }));
            setChartInfo({ data: chartData, type: 'bar', titleKey: 'reports_chart_title_sales_by_hour' });
        }

        setIsGenerating(false);
    };

    const convertToCSV = (headers: string[], rows: (string|number)[][], footers?: (string|number)[]) => {
        const headerRow = headers.join(',');
        const rowData = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        let csv = `${headerRow}\n${rowData}`;
        if (footers) {
            const footerRow = footers.join(',');
            csv += `\n\n${footerRow}`;
        }
        return csv;
    };

    const downloadCSV = () => {
        if (!reportData) return;
        const csvContent = convertToCSV(reportData.headers, reportData.rows, reportData.footers);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${reportType}_${startDate}_to_${endDate}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const printPDF = () => {
        if (!reportData) return;
        const printContainer = document.getElementById('printable-content');
        if (printContainer) {
            const root = createRoot(printContainer);
            const selectedStoreName = stores.find(s => s.id === filterStoreId)?.name || (filterStoreId === 'online' ? t('common_online_no_store') : t('common_all_stores'));
            root.render(
                <React.StrictMode>
                    <PrintableReport
                        title={t(reportData.titleKey)}
                        filters={{ dateRange: t('reports_date_range_display', startDate, endDate), store: t('reports_store_display', selectedStoreName) }}
                        profile={profile}
                        headers={reportData.headers}
                        rows={reportData.rows}
                        footers={reportData.footers}
                    />
                </React.StrictMode>
            );
            setTimeout(() => {
                window.print();
                root.unmount();
            }, 300);
        }
    };

    if (role !== 'admin' && role !== 'manager') {
        return <div className="text-center p-8">{t('common_permission_denied')}</div>;
    }
    
    const ReportTypeButton = ({ type, labelKey }: { type: ReportType, labelKey: TranslationKey }) => (
        <button
            onClick={() => setReportType(type)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-sm transition-colors ${reportType === type ? 'bg-brand-teal text-white shadow' : 'bg-white dark:bg-brand-gray-700 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-600'}`}
        >{t(labelKey)}</button>
    );

    const DatePresetButton = ({ preset, label }: { preset: DatePreset, label: string }) => (
        <button onClick={() => handleDatePresetChange(preset)} className={`px-3 py-1 text-sm rounded-md ${datePreset === preset ? 'bg-brand-teal text-white' : 'bg-brand-gray-200 dark:bg-brand-gray-600 hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500'}`}>{label}</button>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                  <h1 className="text-2xl font-bold">{t('reports_title')}</h1>
                  <p className="text-brand-gray-500 dark:text-brand-gray-400 mt-1">{t('reports_desc')}</p>
              </div>
              <button onClick={() => setIsZReportModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
                Close Out Day
              </button>
            </div>

            <div className="bg-white dark:bg-brand-gray-900 p-4 sm:p-6 rounded-xl shadow-md space-y-6">
                <div>
                    <label className="block text-sm font-bold text-brand-gray-700 dark:text-brand-gray-300 mb-2">{t('reports_type_label')}</label>
                    <div className="flex flex-wrap items-center gap-2 p-1 bg-brand-gray-100 dark:bg-brand-gray-800 rounded-xl self-start">
                        <ReportTypeButton type="sales_summary" labelKey="reports_type_sales" />
                        <ReportTypeButton type="item_performance" labelKey="reports_type_item" />
                        <ReportTypeButton type="category_performance" labelKey="reports_type_category" />
                        <ReportTypeButton type="peak_hours" labelKey="reports_type_peak_hours" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-brand-gray-700 dark:text-brand-gray-300 mb-2">{t('reports_date_range_label')}</label>
                        <div className="flex flex-col gap-3">
                           <div className="flex items-center gap-2 p-1 bg-brand-gray-100 dark:bg-brand-gray-800 rounded-lg self-start">
                                <DatePresetButton preset="today" label={t('common_today')} />
                                <DatePresetButton preset="this_week" label={t('common_week')} />
                                <DatePresetButton preset="this_month" label={t('common_month')} />
                                <DatePresetButton preset="custom" label={t('reports_custom_date')} />
                           </div>
                           <div className="flex flex-wrap items-center gap-2 text-sm">
                                <input type="date" value={startDate} onChange={e => {setStartDate(e.target.value); setDatePreset('custom')}} className="p-1.5 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                                <span>-</span>
                                <input type="date" value={endDate} onChange={e => {setEndDate(e.target.value); setDatePreset('custom')}} className="p-1.5 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />
                           </div>
                            <label htmlFor="compare-toggle" className="flex items-center cursor-pointer">
                                <input type="checkbox" id="compare-toggle" checked={isComparing} onChange={(e) => setIsComparing(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal" />
                                <span className="ml-2 text-sm font-medium">{t('reports_compare_label')}</span>
                            </label>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="store-filter" className="block text-sm font-bold text-brand-gray-700 dark:text-brand-gray-300 mb-2">{t('reports_store_filter_label')}</label>
                        <select id="store-filter" value={filterStoreId} onChange={e => setFilterStoreId(e.target.value)} className="w-full max-w-xs p-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal">
                            <option value="all">{t('common_all_stores')}</option>
                            <option value="online">{t('common_online_no_store')}</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="border-t border-brand-gray-200 dark:border-brand-gray-700 pt-4 flex justify-end">
                    <button onClick={handleGenerateReport} disabled={isGenerating || isDataLoading || !startDate || !endDate} className="bg-brand-blue text-white font-bold py-2 px-6 rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:bg-blue-300">
                        {isGenerating ? t('reports_generating_button') : t('reports_generate_button')}
                    </button>
                </div>
            </div>

            {isGenerating && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
            
            {!isGenerating && comparisonData && <ComparisonView data={comparisonData} />}
            {!isGenerating && chartInfo && <ReportChart data={chartInfo.data} type={chartInfo.type} titleKey={chartInfo.titleKey} />}

            {reportData && (
                <div className="bg-white dark:bg-brand-gray-900 p-4 sm:p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">{t('reports_results_title')}</h2>
                        <div className="flex items-center gap-2">
                             <button onClick={downloadCSV} className="flex items-center gap-2 text-sm font-semibold py-2 px-3 rounded-md bg-brand-gray-100 dark:bg-brand-gray-800 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700">
                                <DownloadIcon className="w-4 h-4" /> CSV
                            </button>
                             <button onClick={printPDF} className="flex items-center gap-2 text-sm font-semibold py-2 px-3 rounded-md bg-brand-gray-100 dark:bg-brand-gray-800 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700">
                                <PrintIcon className="w-4 h-4" /> PDF
                            </button>
                        </div>
                    </div>
                    <ReportTable headers={reportData.headers} rows={reportData.rows} footers={reportData.footers} />
                </div>
            )}

            {!isGenerating && !reportData && !isDataLoading && !comparisonData && (
                 <div className="text-center p-8 bg-white dark:bg-brand-gray-900 rounded-xl shadow-md">
                    <p className="text-brand-gray-500">{t('reports_no_data')}</p>
                 </div>
            )}
            
            {isZReportModalOpen && (
              <ZReportModal
                userId={userId}
                stores={stores}
                orders={allOrders}
                lastReport={zReports[0] || null}
                onClose={() => setIsZReportModalOpen(false)}
              />
            )}
        </div>
    );
};

export default ReportsPage;