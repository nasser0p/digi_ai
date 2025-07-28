import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GrowthChartData } from '../types';
import { ChevronDownIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';

interface GrowthChartProps {
    data: GrowthChartData[];
    totalGrowth: string;
}

const GrowthChart: React.FC<GrowthChartProps> = ({ data, totalGrowth }) => {
  const { t, dir } = useTranslation();
  return (
    <div className="h-96 w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
            <h3 className="text-lg font-bold text-brand-gray-800 dark:text-white">{t('dashboard_growth_chart_title')}</h3>
            <p className="text-2xl font-bold text-brand-gray-900 dark:text-white">{totalGrowth}</p>
        </div>
        <div className="flex items-center gap-2">
            <button className="flex items-center text-sm font-medium text-brand-gray-600 dark:text-brand-gray-300 bg-white dark:bg-brand-gray-800 border border-brand-gray-200 dark:border-brand-gray-700 px-3 py-1 rounded-md shadow-sm hover:bg-brand-gray-50 dark:hover:bg-brand-gray-700">
                <span>{t('common_today')}</span>
                <ChevronDownIcon className="w-4 h-4 ms-2 text-brand-gray-400" />
            </button>
            <button className="p-2 rounded-md hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">
                <svg className="h-5 w-5 text-brand-gray-500 dark:text-brand-gray-400"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: dir === 'rtl' ? -20 : 0,
            left: dir === 'ltr' ? -20 : 0,
            bottom: 5,
          }}
          barCategoryGap="35%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(229, 231, 235, 0.1)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} orientation={dir === 'rtl' ? 'right' : 'left'}/>
          <Tooltip
            cursor={{ fill: 'rgba(243, 244, 246, 0.1)' }}
            contentStyle={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          {/* Stacking order: bottom to top */}
          <Bar dataKey="drinks" name={t('dashboard_chart_legend_drinks')} stackId="a" fill="#4b5563" barSize={15} radius={[0, 0, 8, 8]} />
          <Bar dataKey="food" name={t('dashboard_chart_legend_food')} stackId="a" fill="#28a7a1" barSize={15} />
          <Bar dataKey="other" name={t('dashboard_chart_legend_other')} stackId="a" fill="#d1d5db" barSize={15} radius={[8, 8, 0, 0]}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GrowthChart;
