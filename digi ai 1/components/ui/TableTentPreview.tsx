import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from '../../contexts/LanguageContext';
import { FloorPlanTable } from '../../types';

interface TableTentPreviewProps {
    logoUrl?: string;
    restaurantName?: string;
    storeName?: string;
    tableName?: string;
    qrCodeUrl: string;
    tableForPrint?: FloorPlanTable;
    restaurantId?: string;
}

const TableTentPreview: React.FC<TableTentPreviewProps> = ({
    logoUrl,
    restaurantName,
    storeName,
    tableName,
    qrCodeUrl,
    tableForPrint,
    restaurantId
}) => {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const title = tableName || storeName || '';
    const name = restaurantName || t('onboarding_business_name_label'); 

     useEffect(() => {
        if (tableForPrint && restaurantId && canvasRef.current) {
            const urlToEncode = `${window.location.origin}/?view=customer&restaurantId=${restaurantId}&table=${tableForPrint.label}`;
            QRCode.toCanvas(canvasRef.current, urlToEncode, { width: 160, margin: 1, errorCorrectionLevel: 'H' }, (error) => {
                if (error) console.error('QR Code Error:', error);
            });
        }
    }, [tableForPrint, restaurantId]);

    const renderQrCode = () => {
        if (tableForPrint) {
            return <canvas ref={canvasRef} className="w-40 h-40" />;
        }
        if (qrCodeUrl) {
            return <img src={qrCodeUrl} alt={`QR Code for ${title}`} className="w-40 h-40 object-contain" />;
        }
        return <div className="w-40 h-40 bg-gray-200 animate-pulse rounded-md"></div>
    }

    return (
        <div className="w-[280px] h-[400px] bg-white dark:bg-brand-gray-900 border-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 rounded-lg p-6 flex flex-col items-center justify-between text-center font-sans">
            <div className="w-full">
                {logoUrl && (
                    <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-full mx-auto mb-2 shadow-md" />
                )}
                <h3 className="text-lg font-bold text-brand-gray-800 dark:text-white">{name}</h3>
                <p className="text-2xl font-extrabold text-brand-teal mt-2">{title}</p>
            </div>

            <div className="my-4">
                {renderQrCode()}
            </div>

            <p className="text-sm font-semibold text-brand-gray-600 dark:text-brand-gray-400">
                {t('printable_ticket_order_again')}
            </p>
        </div>
    );
};

export default TableTentPreview;
