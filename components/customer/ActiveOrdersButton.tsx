import React, { useEffect, useState } from 'react';
import { ReceiptIcon } from '../icons';

interface ActiveOrdersButtonProps {
    orderCount: number;
    onClick: () => void;
    animate: boolean;
}

const ActiveOrdersButton: React.FC<ActiveOrdersButtonProps> = ({ orderCount, onClick, animate }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (animate) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 400); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [animate]);
    
    return (
        <button
            onClick={onClick}
            className={`fixed top-24 right-4 z-30 flex items-center gap-2 bg-white dark:bg-brand-gray-800 pl-3 pr-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 ${isAnimating ? 'scale-110' : 'scale-100'}`}
        >
            <div className="relative">
                <ReceiptIcon className="w-6 h-6 text-brand-teal" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-white dark:border-brand-gray-800">
                    {orderCount}
                </span>
            </div>
            <span className="font-semibold text-sm text-brand-gray-700 dark:text-brand-gray-200">
                My Orders
            </span>
        </button>
    );
};

export default ActiveOrdersButton;
