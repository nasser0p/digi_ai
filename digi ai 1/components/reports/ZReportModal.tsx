import React, { useState, useMemo, useEffect } from 'react';
import { doc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order, ZReport, Store } from '../../types';
import Modal from '../Modal';
import { useTranslation } from '../../contexts/LanguageContext';

interface ZReportModalProps {
    userId: string;
    stores: Store[];
    orders: Order[];
    lastReport: ZReport | null;
    onClose: () => void;
}

const ZReportModal: React.FC<ZReportModalProps> = ({ userId, stores, orders, lastReport, onClose }) => {
    const { t } = useTranslation();
    const [storeId, setStoreId] = useState('all');
    const [cashCounted, setCashCounted] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);

    const reportStartDate = useMemo(() => {
        if (lastReport) {
            return new Date(lastReport.endDate.seconds * 1000 + 1000); // 1 second after last report
        }
        return new Date(0); // Epoch if no reports exist
    }, [lastReport]);
    
    const reportEndDate = useMemo(() => new Date(), []);

    const relevantOrders = useMemo(() => {
        return orders.filter(order => {
            const orderDate = new Date(order.createdAt.seconds * 1000);
            const matchesStore = storeId === 'all' || order.storeId === storeId || (storeId === 'online' && !order.storeId);
            return orderDate >= reportStartDate && orderDate <= reportEndDate && matchesStore;
        });
    }, [orders, reportStartDate, reportEndDate, storeId]);

    const reportData = useMemo(() => {
        const grossSales = relevantOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
        const discounts = relevantOrders.reduce((sum, o) => sum + (o.appliedDiscounts?.reduce((dSum, d) => dSum + d.amount, 0) || 0), 0);
        const netSales = grossSales - discounts;
        const taxAmount = relevantOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
        const tips = relevantOrders.reduce((sum, o) => sum + (o.tip || 0), 0);
        const totalRevenue = netSales + taxAmount + tips;

        const cashPayments = relevantOrders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + (o.total || 0), 0);
        const cardPayments = relevantOrders.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + (o.total || 0), 0);
        const otherPayments = relevantOrders.filter(o => o.paymentMethod === 'other' || !o.paymentMethod).reduce((sum, o) => sum + (o.total || 0), 0);
        const totalPayments = cashPayments + cardPayments + otherPayments;

        return { grossSales, discounts, netSales, taxAmount, tips, totalRevenue, cashPayments, cardPayments, otherPayments, totalPayments, totalOrders: relevantOrders.length };
    }, [relevantOrders]);

    const cashVariance = useMemo(() => {
        if (cashCounted === '') return 0;
        return cashCounted - reportData.cashPayments;
    }, [cashCounted, reportData.cashPayments]);
    
    const handleRunReport = async () => {
        setLoading(true);
        const reportId = `${reportEndDate.toISOString().split('T')[0]}-${storeId}`;
        const storeName = stores.find(s => s.id === storeId)?.name || (storeId === 'online' ? 'Online' : 'All Stores');
        
        const zReport: ZReport = {
            id: reportId,
            userId,
            storeId,
            storeName,
            reportDate: Timestamp.fromDate(reportEndDate),
            startDate: Timestamp.fromDate(reportStartDate),
            endDate: Timestamp.fromDate(reportEndDate),
            ...reportData,
            cashCounted: cashCounted === '' ? 0 : cashCounted,
            cashVariance,
        };
        
        try {
            await setDoc(doc(db, 'zReports', reportId), zReport);
            onClose();
        } catch (error) {
            console.error("Error saving Z-Report:", error);
            alert("Failed to save report.");
        } finally {
            setLoading(false);
        }
    };

    const f = (n: number) => `OMR ${n.toFixed(3)}`;

    return (
        <Modal onClose={onClose}>
            <div className="p-4 max-h-[85vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4">End of Day Report (Z-Report)</h2>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="mb-4">
                        <label htmlFor="store-filter" className="block text-sm font-medium">Store</label>
                        <select id="store-filter" value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full mt-1 p-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md">
                            <option value="all">{t('common_all_stores')}</option>
                            <option value="online">{t('common_online_no_store')}</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                         <p className="text-xs text-brand-gray-500 mt-1">
                            Showing data from {reportStartDate.toLocaleString()} to now.
                        </p>
                    </div>

                    <div className="font-mono text-sm space-y-2">
                        {/* Sales Summary */}
                        <div className="p-3 bg-brand-gray-50 dark:bg-brand-gray-700/50 rounded-lg">
                           <h3 className="font-bold border-b border-dashed pb-1 mb-2">Sales Summary</h3>
                           <Row label="Gross Sales" value={f(reportData.grossSales)} />
                           <Row label="Discounts" value={`-${f(reportData.discounts)}`} />
                           <Row label="Net Sales" value={f(reportData.netSales)} isBold />
                           <Row label="Taxes" value={f(reportData.taxAmount)} />
                           <Row label="Tips" value={f(reportData.tips)} />
                           <Row label="Total Revenue" value={f(reportData.totalRevenue)} isBold />
                           <Row label="Total Orders" value={reportData.totalOrders} />
                        </div>

                        {/* Tenders */}
                        <div className="p-3 bg-brand-gray-50 dark:bg-brand-gray-700/50 rounded-lg">
                           <h3 className="font-bold border-b border-dashed pb-1 mb-2">Tenders</h3>
                           <Row label="Cash Payments" value={f(reportData.cashPayments)} />
                           <Row label="Card Payments" value={f(reportData.cardPayments)} />
                           <Row label="Other" value={f(reportData.otherPayments)} />
                           <Row label="Total Collected" value={f(reportData.totalPayments)} isBold />
                        </div>

                        {/* Reconciliation */}
                        <div className="p-3 bg-brand-gray-50 dark:bg-brand-gray-700/50 rounded-lg">
                           <h3 className="font-bold border-b border-dashed pb-1 mb-2">Cash Reconciliation</h3>
                           <Row label="Expected Cash" value={f(reportData.cashPayments)} />
                           <div className="flex justify-between items-center py-1">
                               <span>Counted Cash</span>
                               <input 
                                  type="number"
                                  value={cashCounted}
                                  onChange={e => setCashCounted(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                  placeholder="0.000"
                                  className="w-24 text-right rtl:text-left font-mono p-1 rounded bg-white dark:bg-brand-gray-800 border border-brand-gray-300 dark:border-brand-gray-600"
                                />
                           </div>
                           <Row 
                                label="Variance (Over/Short)"
                                value={f(cashVariance)} 
                                isBold
                                valueColor={cashVariance > 0 ? 'text-green-500' : cashVariance < 0 ? 'text-red-500' : ''}
                            />
                        </div>

                    </div>
                </div>

                <div className="flex-shrink-0 flex justify-end space-x-3 mt-6 pt-4 border-t">
                    <button type="button" onClick={onClose} className="bg-brand-gray-200 text-brand-gray-800 font-bold py-2 px-4 rounded-lg">{t('common_cancel')}</button>
                    <button onClick={handleRunReport} disabled={loading || cashCounted === ''} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                        {loading ? "Saving..." : "Run Report & End Day"}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const Row = ({ label, value, isBold = false, valueColor = '' }: { label: string, value: string | number, isBold?: boolean, valueColor?: string }) => (
    <div className={`flex justify-between py-0.5 ${isBold ? 'font-bold border-t border-dashed mt-1 pt-1' : ''}`}>
        <span>{label}</span>
        <span className={valueColor}>{value}</span>
    </div>
);


export default ZReportModal;