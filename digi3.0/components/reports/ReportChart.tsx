import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { useTranslation } from '../../contexts/LanguageContext';
import { TranslationKey } from '../../i18n/en';

interface ReportChartProps {
    data: any[];
    type: 'bar' | 'pie' | 'line';
    titleKey: TranslationKey;
}

const COLORS = ['#28a7a1', '#4b5563', '#9ca3af', '#6b7280', '#d1d5db', '#374151'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-brand-gray-800 p-2 border border-brand-gray-200 dark:border-brand-gray-700 rounded-md shadow-lg">
                <p className="font-bold">{label}</p>
                {payload.map((pld: any, index: number) => (
                    <p key={index} style={{ color: pld.color || pld.stroke }}>
                        {`${pld.name}: ${typeof pld.value === 'number' ? pld.value.toFixed(3) : pld.value}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


const ReportChart: React.FC<ReportChartProps> = ({ data, type, titleKey }) => {
    const { t } = useTranslation();

    const renderChart = () => {
        switch (type) {
            case 'line':
                return (
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="revenue" name={t('reports_sales_header_revenue')} stroke="#28a7a1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                );
            case 'bar':
                 return (
                    <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" name={t('reports_sales_header_revenue')} fill="#28a7a1" />
                    </BarChart>
                );
            case 'pie':
                 return (
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            legendType="circle"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{fontSize: "12px"}} />
                    </PieChart>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white dark:bg-brand-gray-900 p-4 sm:p-6 rounded-xl shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">{t(titleKey)}</h2>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ReportChart;
