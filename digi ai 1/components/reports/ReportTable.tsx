import React from 'react';

interface ReportTableProps {
    headers: string[];
    rows: (string | number)[][];
    footers?: (string | number)[];
}

const ReportTable: React.FC<ReportTableProps> = ({ headers, rows, footers }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right">
                <thead className="text-xs text-brand-gray-500 dark:text-brand-gray-400 uppercase bg-brand-gray-50 dark:bg-brand-gray-800">
                    <tr>
                        {headers.map((header, i) => (
                            <th key={i} scope="col" className="p-3 font-medium">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-gray-100 dark:divide-brand-gray-800">
                    {rows.map((row, i) => (
                        <tr key={i} className="hover:bg-brand-gray-50 dark:hover:bg-brand-gray-800/50">
                            {row.map((cell, j) => (
                                <td key={j} className={`p-3 ${typeof cell === 'number' ? 'font-mono' : ''}`}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                {footers && (
                    <tfoot className="border-t-2 border-brand-gray-200 dark:border-brand-gray-700">
                        <tr className="font-bold text-brand-gray-800 dark:text-brand-gray-100">
                            {footers.map((footer, i) => (
                                <td key={i} className={`p-3 ${typeof footer === 'number' ? 'font-mono' : ''}`}>{footer}</td>
                            ))}
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
};

export default ReportTable;
