import React from 'react';
import { RestaurantProfile } from '../../types';

interface PrintableReportProps {
    title: string;
    filters: { dateRange: string; store: string };
    profile: RestaurantProfile | null;
    headers: string[];
    rows: (string | number)[][];
    footers?: (string | number)[];
}

const PrintableReport: React.FC<PrintableReportProps> = ({ title, filters, profile, headers, rows, footers }) => {
    return (
        <div className="p-4 font-sans text-black bg-white">
            <div className="text-center mb-4">
                {profile?.logoUrl && <img src={profile.logoUrl} alt="Logo" className="h-16 mx-auto mb-2" />}
                <h1 className="text-xl font-bold">{profile?.name}</h1>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-xs text-gray-600">{filters.dateRange}</p>
                <p className="text-xs text-gray-600">{filters.store}</p>
            </div>
            <table className="w-full text-xs border-collapse" style={{ tableLayout: 'auto' }}>
                <thead>
                    <tr className="border-b-2 border-black">
                        {headers.map((h, i) => <th key={i} className="p-1 text-left font-bold">{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-gray-300">
                            {row.map((cell, j) => <td key={j} className="p-1">{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
                {footers && (
                    <tfoot>
                        <tr className="border-t-2 border-black font-bold">
                            {footers.map((f, i) => <td key={i} className="p-1">{f}</td>)}
                        </tr>
                    </tfoot>
                )}
            </table>
            <p className="text-center text-xs mt-4">Generated on {new Date().toLocaleString()}</p>
        </div>
    );
};

export default PrintableReport;
