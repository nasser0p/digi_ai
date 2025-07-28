import React, { useEffect } from 'react';
import { XIcon } from '../icons';

interface SlideInPanelProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const SlideInPanel: React.FC<SlideInPanelProps> = ({ isOpen, onClose, children }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            ></div>

            {/* Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-brand-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700 rounded-full"
                    aria-label="Close panel"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <div className="h-full">
                    {children}
                </div>
            </div>
        </>
    );
};

export default SlideInPanel;
