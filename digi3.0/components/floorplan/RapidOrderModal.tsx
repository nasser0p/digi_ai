import React, { useState, useMemo, useEffect } from 'react';
import { collection, Timestamp, query, where, doc, getDoc, getDocs, addDoc, orderBy, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { MenuItem, Category, CartItem, Order, OrderItem, Tax, RestaurantProfile, PaymentMethod } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { XIcon } from '../icons';
import ItemDetailModal from '../customer/ItemDetailModal';

interface RapidOrderContext {
    type: 'dine-in' | 'takeaway';
    tableNumber?: string;
    orderIdToAppend?: string;
}

interface RapidOrderModalProps {
    restaurantId: string;
    context: RapidOrderContext;
    onClose: () => void;
    menuItems: MenuItem[];
    categories: Category[];
}

const RapidOrderModal: React.FC<RapidOrderModalProps> = ({
    restaurantId,
    context,
    onClose,
    menuItems: allItems,
    categories
}) => {
    const { t } = useTranslation();
    const { type, tableNumber, orderIdToAppend } = context;

    const [modalView, setModalView] = useState<'order' | 'payment'>('order');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [orderNotes, setOrderNotes] = useState('');
    const [identifier, setIdentifier] = useState(tableNumber || '');
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [profile, setProfile] = useState<RestaurantProfile | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [tenderedAmount, setTenderedAmount] = useState<number | ''>('');

    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        const unsubProfile = onSnapshot(doc(db, 'restaurantProfiles', restaurantId), (docSnap) => {
            if(docSnap.exists()) setProfile(docSnap.data() as RestaurantProfile);
        });

        const unsubTaxes = onSnapshot(query(collection(db, 'taxes'), where('userId', '==', restaurantId)), (snap) => {
            setTaxes(snap.docs.map(d => d.data() as Tax));
        });

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            unsubProfile();
            unsubTaxes();
        };
    }, [onClose, restaurantId]);
    
    useEffect(() => {
        if (modalView === 'order') {
            setTenderedAmount('');
        }
    }, [modalView]);

    const filteredMenuItems = useMemo(() => {
        if (!searchTerm) return allItems.filter(item => item.isAvailable);
        return allItems.filter(item => 
            item.isAvailable && item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allItems, searchTerm]);

    const getItemsForCategory = (categoryId: string) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return [];
        return filteredMenuItems
            .filter(item => item.category === category.name)
            .sort((a,b) => a.order - b.order);
    }

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.basePrice + item.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0)) * item.quantity, 0), [cart]);

    const appliedTaxes = useMemo(() => {
        if (!profile || !profile.appliedTaxIds) return [];
        return taxes
            .filter(t => profile.appliedTaxIds!.includes(t.id))
            .map(t => ({
                name: t.name,
                rate: t.rate,
                amount: subtotal * (t.rate / 100)
            }));
    }, [profile, taxes, subtotal]);

    const taxAmount = useMemo(() => appliedTaxes.reduce((sum, t) => sum + t.amount, 0), [appliedTaxes]);
    const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);
    const changeDue = useMemo(() => (typeof tenderedAmount === 'number' ? tenderedAmount : 0) - total, [tenderedAmount, total]);

    const quickCashOptions = useMemo(() => {
        if (total <= 0) return [];
        const nextWhole = Math.ceil(total);
        const next5 = Math.ceil(total / 5) * 5;
        const next10 = Math.ceil(total / 10) * 10;
        const options = new Set([nextWhole]);
        if (next5 > nextWhole) options.add(next5);
        if (next10 > next5) options.add(next10);
        return Array.from(options).slice(0, 3);
    }, [total]);


    const handleAddToCart = (item: CartItem) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(cartItem => cartItem.cartItemId === item.cartItemId && cartItem.notes === item.notes);
            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex].quantity += item.quantity;
                return newCart;
            } else {
                 return [...prevCart, item];
            }
        });
        setSelectedItem(null);
    };

    const handleUpdateQuantity = (cartItemId: string, change: number) => {
        setCart(prevCart => {
            const itemIndex = prevCart.findIndex(item => item.cartItemId === cartItemId);
            if (itemIndex === -1) return prevCart;
            
            const newCart = [...prevCart];
            const newQuantity = newCart[itemIndex].quantity + change;
            
            if (newQuantity <= 0) {
                newCart.splice(itemIndex, 1);
            } else {
                newCart[itemIndex] = { ...newCart[itemIndex], quantity: newQuantity };
            }
            return newCart;
        });
    };
    
    const handleNoteChange = (cartItemId: string, note: string) => {
        setCart(prevCart =>
            prevCart.map(item =>
                item.cartItemId === cartItemId ? { ...item, notes: note } : item
            )
        );
    };


    const handleSelectItem = (item: MenuItem) => {
        if (!item.modifierGroups || item.modifierGroups.length === 0) {
            const cartItemId = item.id;
            const cartItem: CartItem = {
                cartItemId,
                id: item.id,
                name: item.name,
                basePrice: item.price,
                quantity: 1,
                imageUrl: item.imageUrl,
                selectedModifiers: [],
            };
            handleAddToCart(cartItem);
        } else {
            setSelectedItem(item);
        }
    }

    const handleSubmitOrder = async () => {
        if (cart.length === 0 || (type === 'takeaway' && !identifier)) return;
        setLoading(true);

        const orderItems: OrderItem[] = cart.map(cartItem => {
            const newOrderItem: OrderItem = {
                name: cartItem.name,
                menuItemId: cartItem.id,
                price: cartItem.basePrice + cartItem.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0),
                quantity: cartItem.quantity,
                selectedModifiers: cartItem.selectedModifiers,
                isCompleted: false,
            };

            if (cartItem.notes) {
                newOrderItem.notes = cartItem.notes;
            }
            
            return newOrderItem;
        });
        
        try {
            if (orderIdToAppend) {
                const orderRef = doc(db, 'orders', orderIdToAppend);
                const orderSnap = await getDoc(orderRef);
                if (orderSnap.exists()) {
                    const existingOrder = orderSnap.data() as Order;
                    const combinedItems = [...existingOrder.items, ...orderItems];
                    const newSubtotal = combinedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                    // Recalculate taxes based on new subtotal
                    const newAppliedTaxes = taxes
                        .filter(t => profile?.appliedTaxIds?.includes(t.id))
                        .map(t => ({ name: t.name, rate: t.rate, amount: newSubtotal * (t.rate / 100) }));
                    const newTaxAmount = newAppliedTaxes.reduce((sum, t) => sum + t.amount, 0);

                    const newTotal = newSubtotal + newTaxAmount + existingOrder.tip;

                    await updateDoc(orderRef, {
                        items: combinedItems,
                        subtotal: newSubtotal,
                        taxes: newAppliedTaxes,
                        taxAmount: newTaxAmount,
                        total: newTotal
                    });
                }
            } else {
                const newOrderData: Omit<Order, 'id'> = {
                    items: orderItems,
                    plateNumber: identifier,
                    subtotal,
                    taxes: appliedTaxes,
                    taxAmount,
                    tip: 0,
                    platformFee: 0, // No platform fee for staff orders
                    total,
                    status: 'New',
                    createdAt: Timestamp.now(),
                    userId: restaurantId,
                    notes: orderNotes.trim(),
                    orderType: type,
                    paymentMethod: paymentMethod,
                    appliedDiscounts: []
                };
                await addDoc(collection(db, "orders"), newOrderData);
            }
            onClose();
        } catch (error) {
            console.error("Error creating/updating order:", error);
            alert("Failed to send order.");
        } finally {
            setLoading(false);
        }
    }

    const renderOrderView = () => (
        <div className="w-2/5 flex flex-col bg-brand-gray-50 dark:bg-brand-gray-800/50">
            <div className="p-4 flex-shrink-0">
                <h3 className="text-lg font-bold text-brand-gray-800 dark:text-white">{t('rapid_order_live_ticket')}</h3>
                {type === 'takeaway' && (
                    <div className="mt-2">
                        <label htmlFor="customerIdentifier" className="text-xs font-medium text-brand-gray-600 dark:text-brand-gray-400">{t('rapid_order_customer_id_label')}</label>
                        <input
                            type="text"
                            id="customerIdentifier"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder={t('rapid_order_customer_id_placeholder')}
                            className="w-full mt-1 p-2 text-sm bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md"
                        />
                    </div>
                )}
            </div>
            <div className="flex-grow overflow-y-auto px-4 space-y-3">
               {cart.length === 0 && <p className="text-center text-brand-gray-500 p-8">{t('rapid_order_no_items')}</p>}
               {cart.map(item => (
                   <div key={item.cartItemId} className="bg-white dark:bg-brand-gray-700 p-3 rounded-lg shadow-sm">
                       <div className="flex justify-between items-center">
                           <span className="font-semibold">{item.name}</span>
                           <div className="flex items-center gap-2">
                               <button onClick={() => handleUpdateQuantity(item.cartItemId, -1)} className="w-6 h-6 rounded-full border text-lg font-bold flex items-center justify-center">-</button>
                               <span className="font-bold w-4 text-center">{item.quantity}</span>
                               <button onClick={() => handleUpdateQuantity(item.cartItemId, 1)} className="w-6 h-6 rounded-full border text-lg font-bold flex items-center justify-center">+</button>
                           </div>
                       </div>
                        <div className="text-xs text-brand-gray-500 dark:text-brand-gray-400 pl-1 pt-1">
                           {item.selectedModifiers.length > 0 && (
                               <p>{item.selectedModifiers.map(m => `+ ${m.optionName}`).join(', ')}</p>
                           )}
                           <input
                                type="text"
                                placeholder={t('rapid_order_item_note_placeholder')}
                                value={item.notes || ''}
                                onChange={(e) => handleNoteChange(item.cartItemId, e.target.value)}
                                className="w-full text-xs p-1 mt-1 rounded border bg-brand-gray-50 dark:bg-brand-gray-600 border-brand-gray-200 dark:border-brand-gray-500"
                                onClick={(e) => e.stopPropagation()}
                            />
                       </div>
                   </div>
               ))}
            </div>
            <div className="flex-shrink-0 px-4 pb-4">
                <label htmlFor="orderNotes" className="text-sm font-semibold text-brand-gray-600 dark:text-brand-gray-300">{t('rapid_order_notes_label')}</label>
                <textarea
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder={t('rapid_order_notes_placeholder')}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 text-sm bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                />
            </div>
            <footer className="flex-shrink-0 p-4 border-t border-brand-gray-200 dark:border-brand-gray-700 space-y-3">
               <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                        <span>{t('rapid_order_subtotal')}</span>
                        <span>OMR {subtotal.toFixed(3)}</span>
                    </div>
                    {appliedTaxes.map(tax => (
                        <div key={tax.name} className="flex justify-between">
                            <span>{tax.name} ({tax.rate}%)</span>
                            <span>OMR {tax.amount.toFixed(3)}</span>
                        </div>
                    ))}
               </div>
               <div className="flex justify-between font-bold text-xl border-t border-brand-gray-200 dark:border-brand-gray-700 pt-2 mt-2">
                    <span>{t('rapid_order_total')}</span>
                    <span>OMR {total.toFixed(3)}</span>
                </div>
               <button 
                    onClick={() => setModalView('payment')}
                    disabled={cart.length === 0}
                    className="w-full bg-brand-teal text-white font-bold py-3 rounded-lg hover:bg-brand-teal-dark transition-colors disabled:bg-teal-300"
               >
                   Proceed to Payment
               </button>
            </footer>
        </div>
    );

    const renderPaymentView = () => (
        <div className="w-2/5 flex flex-col bg-brand-gray-50 dark:bg-brand-gray-800/50 p-6">
            <div className="flex-shrink-0 flex items-center gap-4 mb-6">
                <button onClick={() => setModalView('order')} className="p-2 rounded-full hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white">Payment</h3>
            </div>
            
            <div className="text-center">
                <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400">Total Due</p>
                <p className="text-5xl font-extrabold text-brand-gray-800 dark:text-white my-2">OMR {total.toFixed(3)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 my-8">
                <button onClick={() => setPaymentMethod('cash')} className={`py-4 rounded-lg font-semibold text-lg transition-all ${paymentMethod === 'cash' ? 'bg-brand-teal text-white shadow-lg' : 'bg-white dark:bg-brand-gray-700 hover:bg-brand-gray-100'}`}>Cash</button>
                <button onClick={() => setPaymentMethod('card')} className={`py-4 rounded-lg font-semibold text-lg transition-all ${paymentMethod === 'card' ? 'bg-brand-teal text-white shadow-lg' : 'bg-white dark:bg-brand-gray-700 hover:bg-brand-gray-100'}`}>Card</button>
            </div>

            {paymentMethod === 'cash' && total > 0 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold w-28">Amount Tendered</span>
                            <input
                                type="number"
                                value={tenderedAmount}
                                onChange={e => setTenderedAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                placeholder="0.000"
                                className="flex-grow p-2 text-right text-lg font-mono rounded-md border bg-white dark:bg-brand-gray-700 border-brand-gray-300 dark:border-brand-gray-600"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            {quickCashOptions.map(amount => (
                                <button key={amount} onClick={() => setTenderedAmount(amount)} className="text-xs py-1 px-3 rounded-md bg-brand-gray-200 dark:bg-brand-gray-600 hover:bg-brand-gray-300">
                                    OMR {amount.toFixed(3)}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div className="flex justify-between font-bold text-xl text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 p-3 rounded-lg">
                        <span>Change Due</span>
                        <span>OMR {changeDue > 0 ? changeDue.toFixed(3) : '0.000'}</span>
                    </div>
                </div>
            )}
            
            <div className="mt-auto">
                <button 
                    onClick={handleSubmitOrder} 
                    disabled={loading || (paymentMethod === 'cash' && (tenderedAmount === '' || tenderedAmount < total))}
                    className="w-full bg-green-500 text-white font-bold py-4 rounded-lg hover:bg-green-600 transition-colors text-lg disabled:bg-green-300"
                >
                    {loading ? t('common_saving') : "Complete Order"}
                </button>
            </div>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-brand-gray-900 w-full h-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-brand-gray-200 dark:border-brand-gray-800">
                    <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white">
                        {type === 'dine-in' ? t('rapid_order_dine_in_title', identifier) : t('rapid_order_takeaway_title')}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">
                        <XIcon className="w-6 h-6 text-brand-gray-500"/>
                    </button>
                </header>

                <div className="flex-grow flex overflow-hidden">
                    {/* Left Panel: Menu */}
                    <div className="w-3/5 flex flex-col border-e border-brand-gray-200 dark:border-brand-gray-800">
                        <div className="p-4 flex-shrink-0">
                            <input
                                type="text"
                                placeholder={t('rapid_order_search_items')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                            />
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {categories.map(category => {
                                const itemsInCategory = getItemsForCategory(category.id);
                                if (itemsInCategory.length === 0) return null;
                                return (
                                <section key={category.id} className="p-4 pt-0 mb-4">
                                    <h3 className="text-sm font-bold text-brand-gray-500 dark:text-brand-gray-400 uppercase tracking-wider mb-2">{category.name}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {itemsInCategory.map(item => (
                                            <button 
                                                key={item.id}
                                                onClick={() => handleSelectItem(item)}
                                                className="w-full text-left p-2 rounded-lg hover:bg-brand-gray-100 dark:hover:bg-brand-gray-800/50 transition-all border border-transparent hover:border-brand-gray-200 dark:hover:border-brand-gray-700 hover:shadow-md group"
                                            >
                                                <div className="w-full h-24 rounded-md mb-2 overflow-hidden bg-brand-gray-200 dark:bg-brand-gray-700">
                                                    <img 
                                                        src={item.imageUrl || `https://placehold.co/200x150/1f2937/e5e7eb?text=${encodeURIComponent(item.name)}`} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                                    />
                                                </div>
                                                <div className="flex justify-between items-start">
                                                    <span className="font-semibold text-sm text-brand-gray-800 dark:text-brand-gray-200">{item.name}</span>
                                                    <span className="text-xs font-mono text-brand-gray-600 dark:text-brand-gray-400">OMR {item.price.toFixed(3)}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )})}
                        </div>
                    </div>

                    {/* Right Panel: Ticket / Payment */}
                    {modalView === 'order' ? renderOrderView() : renderPaymentView()}
                </div>
            </div>
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    promotion={null}
                    onClose={() => setSelectedItem(null)}
                    onAddToCart={handleAddToCart}
                />
            )}
        </div>
    );
};

export default RapidOrderModal;