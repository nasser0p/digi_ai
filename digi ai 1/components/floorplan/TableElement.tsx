import React, { useState, useEffect } from 'react';
import { FloorPlanTable, Order, TableStatus } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { BoxIcon } from '../icons';

interface TableElementProps {
    table: FloorPlanTable & { status: TableStatus; orders: Order[] };
    isEditable: boolean;
    onPointerDown?: (e: React.PointerEvent) => void;
    isSelected?: boolean;
    isPlacingModeActive?: boolean;
    isGhosting?: boolean;
    isGhostPreview?: boolean;
    hasCollision?: boolean;
}

const TableElement: React.FC<TableElementProps> = ({ 
    table, 
    isEditable, 
    onPointerDown, 
    isSelected, 
    isPlacingModeActive,
    isGhosting,
    isGhostPreview,
    hasCollision
}) => {
    const { t } = useTranslation();
    const [timer, setTimer] = useState('');
    const latestOrder = table.orders && table.orders.length > 0 ? table.orders[0] : null;

    useEffect(() => {
        if (!latestOrder) {
            setTimer('');
            return;
        }

        const orderDate = new Date(latestOrder.createdAt.seconds * 1000);
        const updateTimer = () => {
            const seconds = Math.floor((new Date().getTime() - orderDate.getTime()) / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const displayMinutes = minutes % 60;
            const displaySeconds = seconds % 60;
            
            let timeString = '';
            if (hours > 0) timeString += `${hours.toString().padStart(2, '0')}:`;
            timeString += `${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
            setTimer(timeString);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [latestOrder]);

    const statusClasses: Record<TableStatus, string> = {
        available: 'bg-green-500/10 text-green-700 border-green-500/80 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/60 group-hover:border-green-500 dark:group-hover:border-green-400 group-hover:bg-green-500/20',
        seated: 'bg-blue-500/10 text-blue-700 border-blue-500/80 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/60',
        ordered: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/80 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/60',
        attention: 'bg-red-500/20 text-red-800 border-red-500 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500',
        needs_cleaning: 'bg-gray-500/10 text-gray-700 border-gray-500/80 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/60',
    };
    
    const gridStyle = {
        gridColumn: `${table.x} / span ${table.width}`,
        gridRow: `${table.y} / span ${table.height}`,
    };

    const shapeClass = table.shape === 'round' ? 'rounded-[50%]' : 'rounded-lg';
    
    const handlePointerDown = (e: React.PointerEvent) => {
        if (isEditable && !isPlacingModeActive) {
            onPointerDown?.(e);
        } else if (!isEditable) {
            onPointerDown?.(e);
        }
    };

    const renderLiveContent = () => {
        if (!latestOrder) {
            return <span className="text-lg">{table.label}</span>;
        }

        const totalItems = latestOrder.items.reduce((sum, item) => sum + item.quantity, 0);
        const completedCount = latestOrder.items.filter(i => i.isCompleted).reduce((sum, item) => sum + item.quantity, 0);
        const progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

        return (
            <div className="w-full h-full p-2 md:p-3 text-left rtl:text-right text-xs flex flex-col justify-between">
                <div className="flex-shrink-0 font-bold flex justify-between items-center pb-1">
                    <span className="text-base md:text-lg">{table.label}</span>
                    {timer && <span className="font-mono text-sm md:text-base text-orange-500">{timer}</span>}
                </div>

                <div className="flex-grow flex flex-col justify-center items-center text-center my-1">
                    <div className="flex items-center gap-1 md:gap-2">
                        <BoxIcon className="w-4 h-4 md:w-5 md:h-5 opacity-80" />
                        <span className="text-base md:text-lg font-bold">{t('floor_plan_items_count', totalItems)}</span>
                    </div>
                    <div className="text-base md:text-lg font-bold text-brand-teal mt-1">
                        OMR {latestOrder.total.toFixed(3)}
                    </div>
                </div>

                <div className="flex-shrink-0 w-full bg-black/10 dark:bg-white/10 rounded-full h-2 p-0.5">
                    <div 
                        className="bg-green-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        )
    }

    const renderEditableContent = () => {
        return (
            <span className="truncate px-1">{table.label}</span>
        );
    }
    
    const baseClasses = `relative group p-1 transition-all duration-200`;
    const cursorClass = isEditable && !isPlacingModeActive ? 'cursor-grab' : !isEditable ? 'cursor-pointer' : '';
    const ghostPreviewClasses = isGhostPreview ? 'absolute z-10 pointer-events-none' : '';
    const ghostingClasses = isGhosting ? 'opacity-40' : '';
    
    const statefulClasses = hasCollision 
        ? 'border-red-500 bg-red-500/20 text-red-500' 
        : isGhostPreview
            ? 'border-brand-teal bg-brand-teal/20 text-brand-teal'
            : statusClasses[table.status];

    return (
        <div
            id={table.id}
            style={gridStyle}
            className={`${baseClasses} ${cursorClass} ${ghostPreviewClasses} ${ghostingClasses}`}
            onPointerDown={handlePointerDown}
        >
            <div
                className={`w-full h-full flex font-bold text-sm select-none transition-all duration-200 border-2 items-center justify-center ${shapeClass} ${statefulClasses} ${isSelected ? 'ring-2 ring-offset-2 dark:ring-offset-brand-gray-900 ring-blue-500' : ''}`}
                style={{
                    boxShadow: !isEditable && table.status === 'attention' ? '0 0 12px 2px rgba(239, 68, 68, 0.7)' : 'none',
                    transform: `rotate(${table.rotation || 0}deg)`
                }}
            >
               {isEditable ? renderEditableContent() : renderLiveContent()}
            </div>
        </div>
    );
};

export default TableElement;