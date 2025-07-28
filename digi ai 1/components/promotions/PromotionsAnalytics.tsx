import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import StatCard from '../StatCard';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ChartBarIcon, TagIcon, ReceiptIcon } from '../icons';

interface AnalyticsData {
    kpis: { redemptions: number; revenue: number; cost: number; };
    chartData: { name: string; redemptions: number; }[];
    tableData: { name: string; redemptions: number; revenue: number; cost: number; }[];
}

interface PromotionsAnalyticsProps {
    data: AnalyticsData;
    dateRange: 'today' | 'week' | 'month';
    setDateRange: (range: 'today' | 'week' | 'month') => void;
}

const PromotionsAnalytics: React.FC<PromotionsAnalyticsProps> = ({ data, dateRange, setDateRange }) => {
    const { t } = useTranslation();

    const renderTimeRangeButton = (range: 'today' | 'week' | 'month', label: string) => {
        const isActive = dateRange === range;
        return (
            <button 
                onClick={() => setDateRange(range)}
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 sm:gap-4">
                {renderTimeRangeButton('today', t('common_today'))}
                {renderTimeRangeButton('week', t('common_week'))}
                {renderTimeRangeButton('month', t('common_month'))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <StatCard title={t('promotions_analytics_total_redemptions')} value={data.kpis.redemptions} icon={TagIcon} />
                <StatCard title={t('promotions_analytics_revenue')} value={`OMR ${data.kpis.revenue.toFixed(3)}`} icon={ChartBarIcon} />
                <StatCard title={t('promotions_analytics_discounts_given')} value={`OMR ${data.kpis.cost.toFixed(3)}`} icon={ReceiptIcon} iconBgColor="bg-red-100 dark:bg-red-900/50" iconColor="text-red-500" />
            </div>
            
            <div className="bg-white dark:bg-brand-gray-900 p-4 sm:p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-bold text-brand-gray-800 dark:text-white mb-4">{t('promotions_analytics_redemptions_over_time')}</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer>
                        <LineChart data={data.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'currentColor' }} />
                            <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="redemptions" name={t('promotions_analytics_total_redemptions')} stroke="#28a7a1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
             <div className="bg-white dark:bg-brand-gray-900 p-4 sm:p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-bold text-brand-gray-800 dark:text-white mb-4">{t('promotions_analytics_performance_table')}</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="text-xs text-brand-gray-500 dark:text-brand-gray-400 uppercase bg-brand-gray-50 dark:bg-brand-gray-800">
                            <tr>
                                <th scope="col" className="p-3 font-medium">{t('promotions_analytics_header_promotion')}</th>
                                <th scope="col" className="p-3 font-medium">{t('promotions_analytics_header_redemptions')}</th>
                                <th scope="col" className="p-3 font-medium">{t('promotions_analytics_header_revenue')}</th>
                                <th scope="col" className="p-3 font-medium">{t('promotions_analytics_header_cost')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-gray-100 dark:divide-brand-gray-800">
                           {data.tableData.map((promo, index) => (
                                <tr key={index} className="hover:bg-brand-gray-50 dark:hover:bg-brand-gray-800/50">
                                    <td className="p-3 font-semibold">{promo.name}</td>
                                    <td className="p-3 font-mono">{promo.redemptions}</td>
                                    <td className="p-3 font-mono">OMR {promo.revenue.toFixed(3)}</td>
                                    <td className="p-3 font-mono">OMR {promo.cost.toFixed(3)}</td>
                                </tr>
                           ))}
                           {data.tableData.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-brand-gray-400">{t('dashboard_no_data_table')}</td>
                                </tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default PromotionsAnalytics;
