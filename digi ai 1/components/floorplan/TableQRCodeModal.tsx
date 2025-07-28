import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { FloorPlanTable, RestaurantProfile } from '../../types';
import { PrintIcon } from '../icons';
import { createRoot } from 'react-dom/client';
import TableTentPreview from '../ui/TableTentPreview';
import { useTranslation, LanguageProvider } from '../../contexts/LanguageContext';

interface TableQRCodeModalProps {
    table: FloorPlanTable;
    restaurantId: string;
    profile: RestaurantProfile | null;
    onClose: () => void;
}

const TableQRCodeModal: React.FC<TableQRCodeModalProps> = ({ table, restaurantId, profile, onClose }) => {
    const { t } = useTranslation();
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    
    useEffect(() => {
        const generateQrCode = async () => {
            const urlToEncode = `${window.location.origin}/?view=customer&restaurantId=${restaurantId}&table=${table.label}`;
            try {
                const dataUrl = await QRCode.toDataURL(urlToEncode, { width: 300, margin: 2, errorCorrectionLevel: 'H' });
                setQrCodeDataUrl(dataUrl);
            } catch (err) {
                console.error("Failed to generate QR Code:", err);
            }
        };

        generateQrCode();
    }, [table.label, restaurantId]);


    const handlePrintTemplate = () => {
        const printContentElement = document.getElementById('printable-content');
        if (printContentElement) {
            const root = createRoot(printContentElement);
            root.render(
                <React.StrictMode>
                    <LanguageProvider>
                        <TableTentPreview
                            logoUrl={profile?.logoUrl}
                            restaurantName={profile?.name}
                            tableName={table.label}
                            qrCodeUrl={qrCodeDataUrl}
                        />
                    </LanguageProvider>
                </React.StrictMode>
            );
            const timer = setTimeout(() => {
                window.print();
                root.unmount();
            }, 100);

            return () => clearTimeout(timer);
        }
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white dark:bg-brand-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 text-center" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white mb-2">
                    {t('qrcode_modal_title', table.label)}
                </h2>
                <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mb-6">
                    {t('qrcode_modal_desc')}
                </p>

                <div className="flex flex-col items-center">
                    <div className="bg-brand-gray-100 dark:bg-brand-gray-800 p-4 rounded-lg flex justify-center items-start">
                        <div className="transform scale-90 origin-top">
                            <TableTentPreview
                                logoUrl={profile?.logoUrl}
                                restaurantName={profile?.name}
                                tableName={table.label}
                                qrCodeUrl={qrCodeDataUrl}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handlePrintTemplate}
                        className="mt-6 w-full flex items-center justify-center bg-brand-teal text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-teal-dark transition-colors"
                    >
                        <PrintIcon className="w-5 h-5 me-2" />
                        {t('qrcode_modal_print_button')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TableQRCodeModal;