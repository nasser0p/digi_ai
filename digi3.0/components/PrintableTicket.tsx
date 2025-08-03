import React, { useEffect, useRef } from 'react';
import { Order, RestaurantProfile, PrintSettings } from '../types';
import QRCode from 'qrcode';
import { useTranslation } from '../contexts/LanguageContext';

interface PrintableTicketProps {
    order: Order;
    profile: RestaurantProfile | null;
}

const PrintableTicket: React.FC<PrintableTicketProps> = ({ order, profile }) => {
    const { t } = useTranslation();

    const defaultPrintSettings: PrintSettings = {
        headerText: t('printable_ticket_default_header'),
        footerText: t('printable_ticket_default_footer'),
        fontSize: 'xs',
        showRestaurantName: true,
        showStoreName: true,
        showPlateNumber: true,
        showOrderId: true,
        showDateTime: true,
        showUrgentBanner: true,
        showQRCode: false,
    };

    const settings = profile?.printSettings || defaultPrintSettings;
    const fontSizeClass = `text-${settings.fontSize}`;
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (settings.showQRCode && canvasRef.current) {
            let urlToEncode = `${window.location.origin}/?view=customer&restaurantId=${order.userId}`;
            if (order.storeId) {
                urlToEncode += `&storeId=${order.storeId}`;
            }
            QRCode.toCanvas(canvasRef.current, urlToEncode, { width: 80, margin: 1 }, (error) => {
                if (error) console.error('QR Code Error:', error);
            });
        }
    }, [order, settings]);

    return (
        <div className={`font-mono text-black bg-white p-2 w-[300px] ${fontSizeClass}`}>
            {/* Header */}
            <div className="text-center mb-2">
                <h3 className="font-bold text-lg">{settings.headerText}</h3>
                {settings.showRestaurantName && <p>{profile?.name}</p>}
                {settings.showStoreName && <p>{t('printable_ticket_store')} {order.storeName || t('order_card_online')}</p>}
                {settings.showPlateNumber && <p>{t('order_card_plate')} <span className="font-bold">{order.plateNumber || t('common_na')}</span></p>}
                {settings.showOrderId && <p>ID: {order.id.substring(0, 8)}</p>}
                {settings.showDateTime && <p>{new Date(order.createdAt.seconds * 1000).toLocaleString()}</p>}
            </div>
            
            {order.notes && (
                <div className="font-bold text-center my-2 p-1 border-y-2 border-dashed border-black">
                    <p className="uppercase">{t('prep_view_note')} (Overall)</p>
                    <p>{order.notes}</p>
                </div>
            )}

            {order.isUrgent && settings.showUrgentBanner && <div className="font-bold text-lg text-center my-2 p-1 border-2 border-black">{t('printable_ticket_urgent_banner')}</div>}

            {/* Items */}
            <div className="border-t border-b border-dashed border-black my-2 py-2">
                {order.items.map((item, index) => (
                    <div key={index} className="mb-1">
                        <div className="flex justify-between">
                            <span className="font-bold">{item.quantity}x {item.name}</span>
                        </div>
                        <div className="pl-2">
                            {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                <p className="text-xs">&nbsp;&nbsp;+ {item.selectedModifiers.map(mod => mod.optionName).join(', ')}</p>
                            )}
                             {item.notes && (
                                <p className="text-xs font-bold">&nbsp;&nbsp;* {item.notes}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <p className="text-center font-bold mt-2">{settings.footerText}</p>

            {settings.showQRCode && (
                <div className="flex flex-col items-center mt-2 text-center">
                    <p className="text-xs">{t('printable_ticket_order_again')}</p>
                    <canvas ref={canvasRef} className="mt-1"></canvas>
                </div>
            )}
        </div>
    );
};

export default PrintableTicket;