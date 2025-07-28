import React, { useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Order, OrderItem, Role } from '../types';
import { FlameIcon, PrintIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';

interface OrderCardProps {
    order: Order;
    index: number;
    onMarkComplete: (orderId: string) => void;
    onToggleUrgent: (orderId: string, currentStatus: boolean) => void;
    onCardClick: (order: Order) => void;
    onPrint: () => void;
    role: Role | null;
    onApprove?: (orderId: string) => void;
    onReject?: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, index, onMarkComplete, onToggleUrgent, onCardClick, onPrint, role, onApprove, onReject }) => {
    const { t } = useTranslation();
    const [timer, setTimer] = useState('');
    const [borderColor, setBorderColor] = useState('border-blue-500');

    const canMarkComplete = role === 'admin' || role === 'manager' || role === 'front_of_house';
    const canMarkUrgent = role === 'admin' || role === 'manager';
    const canInteract = role !== 'kitchen_staff';
    const canApprove = role === 'admin' || role === 'manager';

    useEffect(() => {
        const orderDate = new Date(order.createdAt.seconds * 1000);

        const updateTimer = () => {
            const seconds = Math.floor((new Date().getTime() - orderDate.getTime()) / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            const displayMinutes = minutes % 60;
            const displaySeconds = seconds % 60;
            
            let timeString = '';
            if (hours > 0) timeString += `${hours}:`;
            timeString += `${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
            setTimer(timeString);

            // Update border color based on age
            if (minutes >= 10 && order.status !== 'Pending') {
                setBorderColor('border-red-500');
            } else if (minutes >= 5 && order.status !== 'Pending') {
                setBorderColor('border-yellow-500');
            } else if (order.status !== 'Pending') {
                setBorderColor('border-green-500');
            } else {
                 setBorderColor('border-purple-500');
            }
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [order.createdAt, order.status]);
    
    const renderOrderItem = (item: OrderItem, itemIndex: number) => (
        <li key={itemIndex}>
            <div className="flex justify-between">
                <span>{item.quantity} x {item.name}</span>
                <span className="text-brand-gray-600 dark:text-brand-gray-300">OMR {(item.quantity * item.price).toFixed(3)}</span>
            </div>
            <div className="ps-4 text-xs text-brand-gray-500">
                {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                    <div>{item.selectedModifiers.map((mod) => mod.optionName).join(', ')}</div>
                )}
                {item.notes && (
                    <p className="italic text-amber-600 dark:text-amber-400">{t('prep_view_note')} {item.notes}</p>
                )}
            </div>
        </li>
    );
    
    return (
        <Draggable draggableId={order.id} index={index} isDragDisabled={!canInteract}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onCardClick(order)}
                    className={`bg-white dark:bg-brand-gray-900 rounded-lg shadow-md mb-4 border-s-4 transition-all duration-300 ${canInteract ? 'cursor-pointer' : ''} ${
                        snapshot.isDragging ? 'shadow-2xl' : ''
                    } ${order.isUrgent ? 'border-red-500 ring-2 ring-red-500/70 animate-pulse' : borderColor}`}
                >
                    <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-lg">{order.storeName || t('order_card_online')}</h4>
                                {order.plateNumber && (
                                    <p className="text-sm font-semibold text-brand-teal">
                                        {order.orderType === 'takeaway' ? t('order_card_label_takeaway') : t('order_card_label_table')} {order.plateNumber}
                                    </p>
                                )}
                                <p className="text-xs text-brand-gray-400">ID: {order.id.substring(0, 8)}</p>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                 <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPrint();
                                    }}
                                    title={t('order_card_print_title')}
                                    className="p-1 sm:p-1.5 rounded-full bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <PrintIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                {canMarkUrgent && (
                                     <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleUrgent(order.id, !!order.isUrgent);
                                        }}
                                        title={order.isUrgent ? t('order_card_remove_urgent_title') : t('order_card_mark_urgent_title')}
                                        className={`p-1 sm:p-1.5 rounded-full transition-colors ${
                                            order.isUrgent
                                                ? 'bg-red-500 text-white animate-pulse'
                                                : 'bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-red-200 dark:hover:bg-red-500/20'
                                        }`}
                                    >
                                        <FlameIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                )}
                                 <div className="text-center flex-shrink-0">
                                    <span className="font-mono text-lg sm:text-xl font-bold text-brand-gray-700 dark:text-brand-gray-200">{timer}</span>
                                    <p className="text-xs text-brand-gray-500">{t('order_card_time_active')}</p>
                                </div>
                            </div>
                        </div>

                        <ul className="space-y-2 text-sm mb-3">
                            {order.items.map(renderOrderItem)}
                        </ul>
                        {order.notes && (
                            <div className="mt-2 pt-2 border-t border-dashed border-brand-gray-200 dark:border-brand-gray-700">
                                <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 italic">
                                    <span className="font-bold">{t('prep_view_note')}</span> {order.notes}
                                </p>
                            </div>
                        )}
                         <div className="border-t border-brand-gray-200 dark:border-brand-gray-700 pt-2">
                            <div className="flex justify-between items-center mt-1 pt-1">
                                <span className="font-bold">{t('order_detail_total')}</span>
                                <span className="font-bold text-lg text-brand-teal">OMR {order.total.toFixed(3)}</span>
                            </div>
                        </div>
                    </div>
                     {order.status === 'Ready' && canMarkComplete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkComplete(order.id);
                            }}
                            className="w-full text-center bg-green-500 text-white font-bold py-2 rounded-b-lg hover:bg-green-600 transition-colors"
                        >
                            {t('order_card_mark_complete_button')}
                        </button>
                    )}
                    {order.status === 'Pending' && canApprove && onApprove && onReject && (
                        <div className="flex">
                            <button
                                onClick={(e) => { e.stopPropagation(); onReject(order.id); }}
                                className="w-1/2 text-center bg-red-500 text-white font-bold py-2 rounded-bl-lg hover:bg-red-600 transition-colors"
                            >
                                {t('order_card_reject')}
                            </button>
                             <button
                                onClick={(e) => { e.stopPropagation(); onApprove(order.id); }}
                                className="w-1/2 text-center bg-green-500 text-white font-bold py-2 rounded-br-lg hover:bg-green-600 transition-colors"
                            >
                                {t('order_card_approve')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    );
};

export default OrderCard;