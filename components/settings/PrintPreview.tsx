import React from 'react';
import { PrintSettings, RestaurantProfile, Order } from '../../types';
import PrintableTicket from '../PrintableTicket';

interface PrintPreviewProps {
    settings: PrintSettings;
    profile: RestaurantProfile | null;
}

const sampleOrder: Order = {
    id: 'DEMO12345',
    plateNumber: 'T-12',
    storeName: 'Downtown Branch',
    items: [
        { name: 'Gourmet Burger', quantity: 1, price: 9.500, menuItemId: '1', selectedModifiers: [{groupName: 'Add-ons', optionName: 'Extra Cheese', optionPrice: 1.000}], notes: "Well done" },
        { name: 'Iced Coffee', quantity: 2, price: 3.500, menuItemId: '2', selectedModifiers: [] },
    ],
    subtotal: 16.500,
    tip: 2.000,
    taxAmount: 0,
    taxes: [],
    appliedDiscounts: [],
    platformFee: 0.500,
    total: 19.000,
    status: 'New',
    userId: '',
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    isUrgent: true,
};

const PrintPreview: React.FC<PrintPreviewProps> = ({ settings, profile }) => {
    
    const previewProfile: RestaurantProfile = {
        ...profile!,
        printSettings: settings
    };

    return (
        <div className="transform scale-[0.9] origin-top">
            <PrintableTicket order={sampleOrder} profile={previewProfile} />
        </div>
    );
};

export default PrintPreview;