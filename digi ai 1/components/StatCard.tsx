import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  bgColor?: string;
  textColor?: string;
  showChart?: boolean;
  showArrow?: boolean;
  iconBgColor?: string;
  iconColor?: string;
  chartData?: { name: string; uv: number }[];
}

const StatCard: React.FC<StatCardProps> = ({ 
    title, 
    value, 
    icon: Icon, 
    bgColor = "bg-white dark:bg-brand-gray-900", 
    textColor = "text-brand-gray-800 dark:text-white",
    showChart = false,
    showArrow = false,
    iconBgColor = 'bg-brand-gray-100',
    iconColor = 'text-brand-gray-600',
    chartData = []
}) => {

  return (
    <div className={`p-4 sm:p-5 rounded-xl shadow-md flex ${showChart ? 'flex-col justify-between h-40 sm:h-48' : 'items-center'} ${bgColor} ${textColor} relative overflow-hidden`}>
      {showArrow && (
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full"></div>
      )}
      <div className="flex-1">
        <p className={`text-sm ${showChart || showArrow ? 'text-white/80' : 'text-brand-gray-500 dark:text-brand-gray-400'}`}>{title}</p>
        <h3 className="text-2xl sm:text-3xl font-bold mt-1">{value}</h3>
      </div>
      
      {Icon && (
        <div className={`p-2 sm:p-3 rounded-full ${iconBgColor}`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
        </div>
      )}

      {showChart && (
        <div className="w-full h-16 -ml-5 -mb-5">
            <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData}>
                    <Line type="monotone" dataKey="uv" stroke="#ffffff" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      )}
      {showArrow && (
        <div className="text-white text-2xl font-bold cursor-pointer">
           &#x2197;
        </div>
      )}
    </div>
  );
};

export default StatCard;