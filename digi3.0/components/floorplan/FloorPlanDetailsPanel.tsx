import React from 'react';
import { FloorPlanTable, Order, TableStatus } from '../../types';
import SlideInPanel from '../ui/SlideInPanel';
import { useTranslation } from '../../contexts/LanguageContext';
import { TranslationKey } from '../../i18n/en';

interface FloorPlanDetailsPanelProps {
    table: (FloorPlanTable & { status: TableStatus }) | null;
    orders: Order[] | null;
    onClose: () => void;
    onUpdateStatus: (tableId: string, status: TableStatus) => void;
    onUpdateOrderItemStatus: (orderId: string, itemIndex: number, newStatus: boolean) => void;
    onAppendToOrder?: (orderId: string, tableNumber: string) => void;
    onPrintBill?: (orders: Order[]) => void;
    onMarkAsComplete?: (orderIds: string[]) => void;
}

const FloorPlanDetailsPanel: React.FC<FloorPlanDetailsPanelProps> = ({ table, orders, onClose, onUpdateStatus, onUpdateOrderItemStatus, onAppendToOrder, onPrintBill, onMarkAsComplete }) => {
    const { t } = useTranslation();

    if (!table) return null;

    const statusTextMap: Record<TableStatus, TranslationKey> = {
        available: 'floor_plan_status_available',
        seated: 'floor_plan_status_seated',
        ordered: 'floor_plan_status_ordered',
        attention: 'floor_plan_status_attention',
        needs_cleaning: 'floor_plan_status_needs_cleaning',
    };
    
    const statusColorMap: Record<TableStatus, string> = {
        available: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        seated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        ordered: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        attention: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        needs_cleaning: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    
    const totalAmount = orders ? orders.reduce((sum, o) => sum + o.total, 0) : 0;

    return (
        <SlideInPanel isOpen={!!table} onClose={onClose}>
            <div className="h-full flex flex-col">
                <div className="p-6 border-b border-brand-gray-200 dark:border-brand-gray-700">
                    <h2 className="text-2xl font-bold">{t('floor_plan_details_panel_title')}</h2>
                    <div className="flex items-baseline gap-3 mt-1">
                        <p className="text-xl font-semibold text-brand-gray-700 dark:text-brand-gray-200">{table.label}</p>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColorMap[table.status]}`}>
                            {t(statusTextMap[table.status])}
                        </span>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-6">
                    <h3 className="font-bold text-brand-gray-700 dark:text-brand-gray-200 mb-3">{t('floor_plan_details_order_items')}</h3>
                    {orders && orders.length > 0 ? (
                        <div className="space-y-4">
                            {orders.map(order => (
                                <div key={order.id} className="border-b border-brand-gray-100 dark:border-brand-gray-700 last:border-b-0 pb-2">
                                    <p className="text-xs font-mono text-brand-gray-400">ID: {order.id.substring(0,8)}</p>
                                    <ul className="space-y-2 mt-1">
                                    {order.items.map((item, index) => (
                                        <li key={index}>
                                            <label className={`flex items-start p-2 rounded-lg cursor-pointer transition-all duration-200 ${item.isCompleted ? 'bg-green-50 dark:bg-green-900/40' : 'bg-brand-gray-50 dark:bg-brand-gray-700/60'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!item.isCompleted}
                                                    onChange={() => onUpdateOrderItemStatus(order.id, index, !item.isCompleted)}
                                                    className="h-5 w-5 mt-0.5 flex-shrink-0 rounded text-brand-teal focus:ring-brand-teal-dark border-gray-300 dark:border-gray-600 dark:bg-brand-gray-700"
                                                />
                                                <div className={`mx-4 flex-grow transition-opacity ${item.isCompleted ? 'opacity-50 line-through' : 'opacity-100'}`}>
                                                    <div className="font-semibold text-sm">{item.quantity}x {item.name}</div>
                                                    <div className="ps-2 text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-1 space-y-1">
                                                        {item.selectedModifiers.length > 0 && (
                                                            <div>
                                                                {item.selectedModifiers.map((mod) => mod.optionName).join(', ')}
                                                            </div>
                                                        )}
                                                        {item.notes && (
                                                            <p className="italic text-amber-600 dark:text-amber-400">
                                                                <span className="font-bold">{t('prep_view_note')}</span> {item.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                            ))}
                            <div className="border-t border-brand-gray-200 dark:border-brand-gray-700 pt-3 mt-3 flex justify-between font-bold">
                                <span>{t('order_detail_total')}</span>
                                <span>OMR {totalAmount.toFixed(3)}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-brand-gray-500 italic">{t('floor_plan_details_no_order')}</p>
                    )}
                </div>

                <div className="flex-shrink-0 p-6 border-t border-brand-gray-200 dark:border-brand-gray-700 space-y-2">
                     {table.status === 'available' && (
                        <button onClick={() => onUpdateStatus(table.id, 'seated')} className="w-full text-center py-2 px-4 rounded-md bg-blue-500 text-white hover:bg-blue-600 font-semibold">{t('floor_plan_popover_mark_seated')}</button>
                    )}
                     {(table.status === 'seated' || table.status === 'needs_cleaning') && (
                        <button onClick={() => onUpdateStatus(table.id, 'available')} className="w-full text-center py-2 px-4 rounded-md bg-green-500 text-white hover:bg-green-600 font-semibold">{t('floor_plan_popover_clear_table')}</button>
                    )}
                    {orders && orders.length > 0 && onMarkAsComplete && (
                        <button onClick={() => onMarkAsComplete(orders.map(o => o.id))} className="w-full text-center py-2 px-4 rounded-md bg-green-500 text-white hover:bg-green-600 font-semibold">{t('floor_plan_mark_as_complete')}</button>
                    )}
                    {orders && orders.length > 0 && onAppendToOrder && (
                        <button onClick={() => onAppendToOrder(orders[orders.length-1].id, table.label)} className="w-full text-center py-2 px-4 rounded-md bg-brand-teal text-white hover:bg-brand-teal-dark font-semibold">{t('floor_plan_popover_add_to_order')}</button>
                    )}
                    {orders && orders.length > 0 && onPrintBill && (
                        <button onClick={() => onPrintBill(orders)} className="w-full text-center py-2 px-4 rounded-md bg-brand-gray-200 dark:bg-brand-gray-600 hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500 font-semibold">{t('floor_plan_popover_view_bill')}</button>
                    )}
                </div>
            </div>
        </SlideInPanel>
    );
};

export default FloorPlanDetailsPanel;