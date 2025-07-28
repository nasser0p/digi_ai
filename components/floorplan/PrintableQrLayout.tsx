import React from 'react';
import { FloorPlan, RestaurantProfile } from '../../types';
import TableTentPreview from '../ui/TableTentPreview';

interface PrintableQrLayoutProps {
    plan: FloorPlan;
    profile: RestaurantProfile | null;
}

const PrintableQrLayout: React.FC<PrintableQrLayoutProps> = ({ plan, profile }) => {
    return (
        <div 
            className="p-4 bg-white flex flex-wrap justify-start items-start content-start gap-4"
            style={{
                width: '210mm', // A4 Width for portrait
            }}
        >
            {plan.tables
                .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
                .map(table => (
                 <div 
                    key={table.id}
                    className="flex-shrink-0"
                 >
                    <TableTentPreview
                        logoUrl={profile?.logoUrl}
                        restaurantName={profile?.name}
                        tableName={table.label}
                        qrCodeUrl=''
                        tableForPrint={table}
                        restaurantId={profile?.id}
                    />
                 </div>
            ))}
        </div>
    );
};

export default PrintableQrLayout;