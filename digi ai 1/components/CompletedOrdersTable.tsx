

import React from 'react';
import { Order } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface CompletedOrdersTableProps {
    orders: Order[];
    onRecallOrder: (orderId: string) => void;
}

const CompletedOrdersTable: React.FC<CompletedOrdersTableProps> = ({ orders, onRecallOrder }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-brand-gray-900 p-4 sm:p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white mb-4">
                {t('completed_orders_title')}
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                    <thead className="text-xs text-brand-gray-500 dark:text-brand-gray-400 uppercase bg-brand-gray-50 dark:bg-brand-gray-800">
                        <tr>
                            <th scope="col" className="p-3 font-medium">{t('completed_orders_header_id')}</th>
                            <th scope="col" className="p-3 font-medium">{t('completed_orders_header_date')}</th>
                            <th scope="col" className="p-3 font-medium">{t('completed_orders_header_store')}</th>
                            <th scope="col" className="p-3 font-medium">{t('completed_orders_header_plate')}</th>
                            <th scope="col" className="p-3 font-medium text-right rtl:text-left">{t('completed_orders_header_total')}</th>
                            <th scope="col" className="p-3 font-medium text-right rtl:text-left">{t('completed_orders_header_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-gray-100 dark:divide-brand-gray-800">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-brand-gray-50 dark:hover:bg-brand-gray-800/50">
                                <td className="p-3 font-mono text-xs text-brand-gray-500">{order.id.substring(0,8)}</td>
                                <td className="p-3 text-brand-gray-700 dark:text-brand-gray-200">
                                    {new Date(order.createdAt.seconds * 1000).toLocaleString()}
                                </td>
                                <td className="p-3 text-brand-gray-700 dark:text-brand-gray-200">{order.storeName || t('order_card_online')}</td>
                                <td className="p-3 font-semibold text-brand-gray-800 dark:text-brand-gray-100">{order.plateNumber}</td>
                                <td className="p-3 font-bold text-brand-teal text-right rtl:text-left">OMR {order.total.toFixed(3)}</td>
                                <td className="p-3 text-right rtl:text-left">
                                    <button
                                        onClick={() => onRecallOrder(order.id)}
                                        className="font-medium text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 px-3 py-1 rounded-md transition-colors"
                                    >
                                        {t('completed_orders_recall')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {orders.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center p-8 text-brand-gray-400">
                                    {t('completed_orders_none')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CompletedOrdersTable;
