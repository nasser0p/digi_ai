import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Store, RestaurantProfile } from '../types';
import { DownloadIcon, PrintIcon } from './icons';
import Modal from './Modal';
import { createRoot } from 'react-dom/client';
import TableTentPreview from './ui/TableTentPreview';
import { useTranslation, LanguageProvider } from '../contexts/LanguageContext';

interface QRCodeModalProps {
    store: Store;
    restaurantId: string;
    profile: RestaurantProfile | null;
    onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ store, restaurantId, profile, onClose }) => {
    const { t } = useTranslation();
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [activeTab, setActiveTab] = useState<'qr' | 'template'>('qr');
    
    useEffect(() => {
        const generateQrCode = async () => {
            const urlToEncode = `${window.location.origin}/?view=customer&restaurantId=${restaurantId}&storeId=${store.id}`;
            try {
                const dataUrl = await QRCode.toDataURL(urlToEncode, { width: 300, margin: 2, errorCorrectionLevel: 'H' });
                setQrCodeDataUrl(dataUrl);
            } catch (err) {
                console.error("Failed to generate QR Code:", err);
            }
        };

        generateQrCode();
    }, [store.id, restaurantId]);

    const handleDownload = () => {
        if (!qrCodeDataUrl) return;
        const link = document.createElement('a');
        link.href = qrCodeDataUrl;
        link.download = `${store.name}-qrcode.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                            storeName={store.name}
                            qrCodeUrl={qrCodeDataUrl}
                        />
                    </LanguageProvider>
                </React.StrictMode>
            );

            // Use a timeout to ensure the component has rendered before printing
            const timer = setTimeout(() => {
                window.print();
                root.unmount();
            }, 100);

            return () => clearTimeout(timer);
        }
    }


    return (
        <Modal onClose={onClose}>
            <div className="text-center p-4">
                <h2 className="text-2xl font-bold text-brand-gray-800 dark:text-white mb-2">
                    {t('qrcode_modal_title', store.name)}
                </h2>
                <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 mb-6">
                    {t('qrcode_modal_desc')}
                </p>

                <div className="flex justify-center mb-4 border-b border-brand-gray-200 dark:border-brand-gray-700">
                    <button onClick={() => setActiveTab('qr')} className={`px-4 py-2 font-semibold text-sm ${activeTab === 'qr' ? 'border-b-2 border-brand-teal text-brand-teal' : 'text-brand-gray-500'}`}>
                        {t('qrcode_modal_tab_qr')}
                    </button>
                    <button onClick={() => setActiveTab('template')} className={`px-4 py-2 font-semibold text-sm ${activeTab === 'template' ? 'border-b-2 border-brand-teal text-brand-teal' : 'text-brand-gray-500'}`}>
                        {t('qrcode_modal_tab_template')}
                    </button>
                </div>
                
                {activeTab === 'qr' && (
                    <div className="flex flex-col items-center">
                         <div className="flex justify-center items-center bg-gray-100 dark:bg-brand-gray-700 p-4 rounded-lg">
                            {qrCodeDataUrl ? (
                                <img src={qrCodeDataUrl} alt={`QR Code for ${store.name}`} className="w-64 h-64 object-contain" />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center text-brand-gray-500">{t('qrcode_modal_generating')}</div>
                            )}
                        </div>
                        <button
                            onClick={handleDownload}
                            className="mt-6 flex items-center justify-center bg-brand-teal text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-teal-dark transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5 me-2" />
                            {t('qrcode_modal_download_button')}
                        </button>
                    </div>
                )}

                {activeTab === 'template' && (
                     <div className="flex flex-col items-center">
                         <div className="bg-brand-gray-100 dark:bg-brand-gray-800 p-4 rounded-lg flex justify-center items-start">
                            <div className="transform scale-90 origin-top">
                                <TableTentPreview
                                    logoUrl={profile?.logoUrl}
                                    restaurantName={profile?.name}
                                    storeName={store.name}
                                    qrCodeUrl={qrCodeDataUrl}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handlePrintTemplate}
                            className="mt-6 flex items-center justify-center bg-brand-teal text-white font-bold py-3 px-6 rounded-lg hover:bg-brand-teal-dark transition-colors"
                        >
                            <PrintIcon className="w-5 h-5 me-2" />
                            {t('qrcode_modal_print_button')}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default QRCodeModal;