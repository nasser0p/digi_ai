import React, { useState, useMemo } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { CustomerAnalyticsData } from './PromotionsPage';
import { DownloadIcon } from '../icons';

interface CustomersAnalyticsProps {
    data: CustomerAnalyticsData[];
}

type SortKey = keyof CustomerAnalyticsData;
type SortDirection = 'asc' | 'desc';

const CustomersAnalytics: React.FC<CustomersAnalyticsProps> = ({ data }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'joinDate', direction: 'desc' });

    const filteredAndSortedData = useMemo(() => {
        let sortedData = [...data];

        if (sortConfig) {
            sortedData.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    if (sortConfig.key === 'joinDate' || sortConfig.key === 'lastOrderDate') {
                        aValue = new Date(aValue).getTime();
                        bValue = new Date(bValue).getTime();
                    }
                }
                
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        if (searchTerm) {
            return sortedData.filter(customer => customer.id.includes(searchTerm));
        }

        return sortedData;
    }, [data, searchTerm, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const downloadCSV = () => {
        const headers = [
            "Customer (Phone)", "Join Date", "Last Order Date", 
            "Total Orders", "Total Spent (OMR)", "Loyalty Points"
        ];
        const rows = filteredAndSortedData.map(c => [
            c.id, c.joinDate, c.lastOrderDate, c.totalOrders, c.totalSpent.toFixed(3), c.points
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', 'customers.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const headers: { key: SortKey; label: string }[] = [
        { key: 'id', label: t('promotions_customers_header_customer') },
        { key: 'joinDate', label: t('promotions_customers_header_join_date') },
        { key: 'lastOrderDate', label: t('promotions_customers_header_last_order') },
        { key: 'totalOrders', label: t('promotions_customers_header_total_orders') },
        { key: 'totalSpent', label: t('promotions_customers_header_total_spent') },
        { key: 'points', label: t('promotions_customers_header_points') },
    ];

    return (
        <div className="bg-white dark:bg-brand-gray-900 p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                <input
                    type="text"
                    placeholder={t('promotions_customers_search_placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto max-w-sm px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                />
                <button onClick={downloadCSV} className="flex items-center gap-2 text-sm font-semibold py-2 px-3 rounded-md bg-brand-gray-100 dark:bg-brand-gray-800 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700">
                    <DownloadIcon className="w-4 h-4" /> {t('promotions_customers_download_csv')}
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                    <thead className="text-xs text-brand-gray-500 dark:text-brand-gray-400 uppercase bg-brand-gray-50 dark:bg-brand-gray-800">
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} scope="col" className="p-3 font-medium cursor-pointer" onClick={() => requestSort(header.key)}>
                                    {header.label}
                                    {sortConfig?.key === header.key && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                     <tbody className="divide-y divide-brand-gray-100 dark:divide-brand-gray-800">
                        {filteredAndSortedData.length > 0 ? filteredAndSortedData.map(customer => (
                             <tr key={customer.id} className="hover:bg-brand-gray-50 dark:hover:bg-brand-gray-800/50">
                                <td className="p-3 font-semibold">{customer.id}</td>
                                <td className="p-3">{customer.joinDate}</td>
                                <td className="p-3">{customer.lastOrderDate}</td>
                                <td className="p-3 font-mono text-center">{customer.totalOrders}</td>
                                <td className="p-3 font-mono">OMR {customer.totalSpent.toFixed(3)}</td>
                                <td className="p-3 font-mono font-bold text-brand-teal">{customer.points}</td>
                             </tr>
                        )) : (
                             <tr>
                                <td colSpan={headers.length} className="text-center p-8 text-brand-gray-400">
                                    {t('promotions_customers_no_customers')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-brand-gray-400 mt-4 text-center">{t('promotions_customers_privacy_note')}</p>
        </div>
    );
};

export default CustomersAnalytics;