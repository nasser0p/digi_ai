import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';

interface ComparisonData {
    current: { revenue: number; orders: number; items: number; };
    previous: { revenue: number; orders: number; items: number; };
    change: { revenue: number; orders: number; items: number; };
}

interface ComparisonViewProps {
    data: ComparisonData;
}

const ComparisonStatCard: React.FC<{ title: string; currentValue: number; previousValue: number; change: number; isCurrency?: boolean }> = ({ title, currentValue, previousValue, change, isCurrency }) => {
    const isPositive = change >= 0;
    const changeColor = change === 0 ? 'text-gray-500' : isPositive ? 'text-green-500' : 'text-red-500';

    const formatValue = (val: number) => isCurrency ? `OMR ${val.toFixed(3)}` : val.toLocaleString();

    return (
        <div className="bg-brand-gray-50 dark:bg-brand-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-brand-gray-500 dark:text-brand-gray-400">{title}</h4>
            <p className="text-2xl font-bold text-brand-gray-800 dark:text-white mt-1">{formatValue(currentValue)}</p>
            <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-brand-gray-500">{formatValue(previousValue)}</span>
                <span className={`font-bold flex items-center ${changeColor}`}>
                    {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                </span>
            </div>
        </div>
    );
};


const ComparisonView: React.FC<ComparisonViewProps> = ({ data }) => {
    const { t } = useTranslation();
    
    return (
        <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">{t('reports_comparison_title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ComparisonStatCard title={t('reports_sales_header_revenue')} currentValue={data.current.revenue} previousValue={data.previous.revenue} change={data.change.revenue} isCurrency />
                <ComparisonStatCard title={t('reports_sales_header_orders')} currentValue={data.current.orders} previousValue={data.previous.orders} change={data.change.orders} />
                <ComparisonStatCard title={t('reports_sales_header_items_sold')} currentValue={data.current.items} previousValue={data.previous.items} change={data.change.items} />
            </div>
        </div>
    );
};

export default ComparisonView;
