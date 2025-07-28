import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

interface DataTableProps {
  title: string;
  data: {
    headers: string[];
    rows: { cells: (string|number)[] }[];
  };
}

const DataTable: React.FC<DataTableProps> = ({ title, data }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-brand-gray-900 p-6 rounded-xl shadow-md">
      <h3 className="text-lg font-bold text-brand-gray-800 dark:text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-start">
          <thead className="text-xs text-brand-gray-500 dark:text-brand-gray-400 uppercase">
            <tr>
              {data.headers.map((header) => (
                <th key={header} scope="col" className="pb-3 pe-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length > 0 ? data.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-brand-gray-100 dark:border-brand-gray-800">
                {row.cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`py-3 pe-3 ${cellIndex === 0 ? 'font-semibold text-brand-gray-800 dark:text-brand-gray-100' : 'text-brand-gray-600 dark:text-brand-gray-300'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={data.headers.length} className="text-center py-4 text-brand-gray-400">
                  {t('dashboard_no_data_table')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
