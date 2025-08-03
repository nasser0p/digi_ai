import React from 'react';
import { Order } from '../../types';
import PendingOrderToast from './PendingOrderToast';

interface ToastContainerProps {
    toasts: Order[];
    onDismiss: (orderId: string) => void;
    onApprove: (orderId: string) => void;
    onReject: (orderId: string) => void;
    onNavigateToOrders: () => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss, onApprove, onReject, onNavigateToOrders }) => {
    return (
        <div className="fixed top-20 right-4 rtl:right-auto rtl:left-4 z-[100] space-y-3">
            {toasts.map(order => (
                <PendingOrderToast 
                    key={order.id}
                    order={order}
                    onDismiss={onDismiss}
                    onApprove={onApprove}
                    onReject={onReject}
                    onNavigateToOrders={onNavigateToOrders}
                />
            ))}
        </div>
    );
};

export default ToastContainer;
