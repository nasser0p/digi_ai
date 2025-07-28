import React, { useEffect, useState, useRef } from 'react';
import { Order } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { XIcon } from '../icons';

interface PendingOrderToastProps {
    order: Order;
    onDismiss: (orderId: string) => void;
    onApprove: (orderId: string) => void;
    onReject: (orderId: string) => void;
    onNavigateToOrders: () => void;
    duration?: number;
}

const PendingOrderToast: React.FC<PendingOrderToastProps> = ({ order, onDismiss, onApprove, onReject, onNavigateToOrders, duration = 15000 }) => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);
    const timerRef = useRef<number | null>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fade in
        const fadeInTimer = setTimeout(() => setIsVisible(true), 100);

        // Auto-dismiss timer
        timerRef.current = window.setTimeout(() => {
            handleDismiss();
        }, duration);

        // Animate progress bar
        const progressTimer = setTimeout(() => {
            if (progressRef.current) {
                progressRef.current.style.transition = `width ${duration}ms linear`;
                progressRef.current.style.width = '0%';
            }
        }, 150);
        
        return () => {
            clearTimeout(fadeInTimer);
            clearTimeout(progressTimer);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [duration]);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => onDismiss(order.id), 300); // Wait for fade-out animation
    };
    
    const handleApprove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onApprove(order.id);
        handleDismiss();
    };

    const handleReject = (e: React.MouseEvent) => {
        e.stopPropagation();
        onReject(order.id);
        handleDismiss();
    };
    
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div 
            onClick={onNavigateToOrders}
            className={`w-80 bg-white dark:bg-brand-gray-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5 transition-all duration-300 ease-in-out transform ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 rtl:-translate-x-10'}`}
        >
            <div className="p-4 cursor-pointer">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-brand-gray-800 dark:text-white">{t('toast_title')}</h4>
                        <p className="text-sm text-brand-gray-500">{t('toast_table', order.plateNumber || '')}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDismiss(); }} className="p-1 rounded-full text-brand-gray-400 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="mt-2 text-sm flex justify-between items-center text-brand-gray-600 dark:text-brand-gray-300">
                    <span>{t('toast_items', itemCount)}</span>
                    <span className="font-bold text-brand-teal">OMR {order.total.toFixed(3)}</span>
                </div>
                <div className="mt-4 flex gap-2">
                    <button onClick={handleReject} className="w-full text-center bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-800 dark:text-brand-gray-200 font-bold py-2 rounded-lg hover:bg-brand-gray-300 dark:hover:bg-brand-gray-600 transition-colors text-sm">
                        {t('toast_reject')}
                    </button>
                     <button onClick={handleApprove} className="w-full text-center bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition-colors text-sm">
                        {t('toast_approve')}
                    </button>
                </div>
            </div>
             <div className="h-1 bg-brand-gray-200 dark:bg-brand-gray-700">
                <div ref={progressRef} className="h-full bg-brand-teal w-full"></div>
            </div>
        </div>
    );
};

export default PendingOrderToast;
