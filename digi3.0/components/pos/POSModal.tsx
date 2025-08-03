import React, { useState, useMemo, useEffect, useRef } from 'react';
import { collection, Timestamp, query, where, doc, getDoc, setDoc, addDoc, updateDoc, onSnapshot, writeBatch, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { MenuItem, Category, CartItem, Order, OrderItem, Tax, RestaurantProfile, PaymentMethod, FloorPlan } from '../../types';
import { useTranslation } from '../../contexts/LanguageContext';
import { XIcon, NotePencilIcon } from '../icons';
import ItemDetailModal from '../customer/ItemDetailModal';
import { POSContext } from '../../App';
import Numpad from './Numpad';

interface POSModalProps {
    userId: string;
    context: POSContext;
    onClose: () => void;
    menuItems: MenuItem[];
    categories: Category[];
    profile: RestaurantProfile | null;
}

interface NotePopoverState {
    cartItemId: string | null;
    top: number;
    left: number;
    ref: React.RefObject<HTMLButtonElement>;
}

const POSModal: React.FC<POSModalProps> = ({ userId, context, onClose, menuItems: allItems, categories, profile }) => {
    const { t } = useTranslation();
    const { type, tableNumber, orderIds } = context;

    const [modalView, setModalView] = useState<'order' | 'payment'>('order');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [identifier, setIdentifier] = useState(tableNumber || '');
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [tenderedAmount, setTenderedAmount] = useState<number | ''>('');
    const [orderNotes, setOrderNotes] = useState('');

    const [notePopover, setNotePopover] = useState<NotePopoverState | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && notePopover?.ref.current && !notePopover.ref.current.contains(event.target as Node)) {
                setNotePopover(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [notePopover]);

    useEffect(() => {
        const unsubTaxes = onSnapshot(query(collection(db, 'taxes'), where('userId', '==', userId)), (snap) => {
            setTaxes(snap.docs.map(d => ({ ...d.data(), id: d.id } as Tax)));
        });

        if (orderIds && orderIds.length > 0) {
            const ordersQuery = query(collection(db, 'orders'), where('__name__', 'in', orderIds));
            const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
                const fetchedOrders = snapshot.docs.map(d => d.data() as Order);
                const combinedCart: CartItem[] = [];
                let combinedNotes = new Set<string>();
                fetchedOrders.forEach(order => {
                    if(order.notes) combinedNotes.add(order.notes);
                    order.items.forEach(item => {
                        const modifiersString = (item.selectedModifiers || []).map(m => m.optionName.replace(/\s/g, '')).sort().join('-');
                        const cartItemId = `${item.menuItemId}-${modifiersString}`;
                        
                        const existingItemIndex = combinedCart.findIndex(ci => ci.cartItemId === cartItemId && ci.notes === item.notes);
                        
                        if(existingItemIndex > -1) {
                            combinedCart[existingItemIndex].quantity += item.quantity;
                        } else {
                            combinedCart.push({
                                cartItemId: `${cartItemId}-${Date.now()}`, // Ensure unique key for new entries
                                id: item.menuItemId,
                                name: item.name,
                                basePrice: allItems.find(mi => mi.id === item.menuItemId)?.price || item.price,
                                quantity: item.quantity,
                                selectedModifiers: item.selectedModifiers || [],
                                notes: item.notes,
                            });
                        }
                    });
                });
                setCart(combinedCart);
                setOrderNotes(Array.from(combinedNotes).join('; '));
            });
            return () => { unsubTaxes(); unsubOrders(); };
        }

        return () => { unsubTaxes(); };
    }, [userId, orderIds, allItems]);
    
    useEffect(() => {
        if (modalView === 'order') setTenderedAmount('');
    }, [modalView]);

    const filteredMenuItems = useMemo(() => {
        if (!searchTerm) return allItems.filter(item => item.isAvailable);
        return allItems.filter(item => item.isAvailable && item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allItems, searchTerm]);

    const getItemsForCategory = (categoryName: string) => {
        return filteredMenuItems.filter(item => item.category === categoryName).sort((a,b) => a.order - b.order);
    }

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.basePrice + item.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0)) * item.quantity, 0), [cart]);
    const appliedTaxes = useMemo(() => (profile?.appliedTaxIds || []).map(taxId => taxes.find(t => t.id === taxId)).filter(Boolean).map(t => ({ name: t!.name, rate: t!.rate, amount: subtotal * (t!.rate / 100) })), [profile, taxes, subtotal]);
    const taxAmount = useMemo(() => appliedTaxes.reduce((sum, t) => sum + t.amount, 0), [appliedTaxes]);
    const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);
    const changeDue = useMemo(() => (typeof tenderedAmount === 'number' ? tenderedAmount - total : 0), [tenderedAmount, total]);

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
            
            if (newQuantity <= 0) newCart.splice(itemIndex, 1);
            else newCart[itemIndex] = { ...newCart[itemIndex], quantity: newQuantity };
            
            return newCart;
        });
    };
    
    const handleNoteChange = (cartItemId: string, note: string) => {
        setCart(prevCart => prevCart.map(item => item.cartItemId === cartItemId ? { ...item, notes: note } : item));
    };

    const handleSelectItem = (item: MenuItem) => {
        const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;
        if (hasModifiers) {
            setSelectedItem(item);
        } else {
             const cartItemId = `${item.id}-${Date.now()}`;
            const cartItem: CartItem = {
                cartItemId,
                id: item.id,
                name: item.name,
                basePrice: item.price,
                quantity: 1,
                selectedModifiers: [],
            };
            handleAddToCart(cartItem);
        }
    }
    
    const handleSendToKitchen = async () => {
        if (cart.length === 0 || (type === 'takeaway' && !identifier)) return;
        setLoading(true);

        const orderItems: OrderItem[] = cart.map(cartItem => ({
            name: cartItem.name,
            menuItemId: cartItem.id,
            price: cartItem.basePrice + cartItem.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0),
            quantity: cartItem.quantity,
            selectedModifiers: cartItem.selectedModifiers,
            isCompleted: false,
            notes: cartItem.notes || '',
        }));
        
        try {
            const batch = writeBatch(db);

            if (orderIds && orderIds.length > 0) {
                // Appending to existing order(s) - for simplicity, we assume one order per table for appending
                const orderRef = doc(db, 'orders', orderIds[0]);
                const orderSnap = await getDoc(orderRef);
                if (orderSnap.exists()) {
                    const existingOrder = orderSnap.data() as Order;
                    const combinedItems = [...existingOrder.items, ...orderItems];
                    const newSubtotal = combinedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                    const newAppliedTaxes = (profile?.appliedTaxIds || []).map(taxId => taxes.find(t => t.id === taxId)).filter(Boolean).map(t => ({ name: t!.name, rate: t!.rate, amount: newSubtotal * (t!.rate / 100) }));
                    const newTaxAmount = newAppliedTaxes.reduce((sum, t) => sum + t.amount, 0);
                    const newTotal = newSubtotal + newTaxAmount + existingOrder.tip;

                    batch.update(orderRef, { items: combinedItems, subtotal: newSubtotal, taxes: newAppliedTaxes, taxAmount: newTaxAmount, total: newTotal, status: 'In Progress' });
                }
            } else {
                // Creating a new order
                const newOrderData: Omit<Order, 'id'> = {
                    items: orderItems, plateNumber: identifier, subtotal, taxes: appliedTaxes, taxAmount, tip: 0, platformFee: 0, total, status: 'New', createdAt: Timestamp.now(), userId, notes: orderNotes.trim(), orderType: type, appliedDiscounts: [] };
                const newOrderRef = doc(collection(db, 'orders'));
                batch.set(newOrderRef, newOrderData);
            }

            // Update table status if it's a new dine-in order
            if (type === 'dine-in' && (!orderIds || orderIds.length === 0) && tableNumber) {
                const floorPlanRef = doc(db, 'floorPlans', userId);
                const floorPlanSnap = await getDoc(floorPlanRef);
                if (floorPlanSnap.exists()) {
                    const floorPlan = floorPlanSnap.data() as FloorPlan;
                    const newTables = floorPlan.tables.map(table => table.label === tableNumber ? { ...table, status: 'ordered' } : table);
                    batch.update(floorPlanRef, { tables: newTables });
                }
            }
            await batch.commit();
            onClose();
        } catch (error) {
            console.error("Error creating/updating order:", error);
            alert("Failed to send order.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleFinalizeOrder = async () => {
        if (cart.length === 0 || (type === 'takeaway' && !identifier)) return;
        setLoading(true);

        const orderItems: OrderItem[] = cart.map(cartItem => ({
            name: cartItem.name, menuItemId: cartItem.id, price: cartItem.basePrice + cartItem.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0), quantity: cartItem.quantity, selectedModifiers: cartItem.selectedModifiers, isCompleted: true, notes: cartItem.notes || '', inventoryDeducted: false,
        }));
        
        try {
            const batch = writeBatch(db);

            // Inventory Deduction Logic
            const deductions = new Map<string, number>();
            orderItems.forEach(orderItem => {
                const menuItem = allItems.find(mi => mi.id === orderItem.menuItemId);
                menuItem?.recipe?.forEach(recipeItem => {
                    const totalDeduction = recipeItem.quantity * orderItem.quantity;
                    deductions.set(recipeItem.ingredientId, (deductions.get(recipeItem.ingredientId) || 0) + totalDeduction);
                });
                orderItem.inventoryDeducted = true;
            });
            deductions.forEach((quantity, ingredientId) => {
                const ingredientRef = doc(db, 'ingredients', ingredientId);
                batch.update(ingredientRef, { stock: increment(-quantity) });
            });

            if (orderIds && orderIds.length > 0) {
                // Finalizing existing dine-in order
                 for (const orderId of orderIds) {
                    const orderRef = doc(db, 'orders', orderId);
                    batch.update(orderRef, { status: 'Completed', paymentMethod });
                }
                if (tableNumber) {
                    const floorPlanRef = doc(db, 'floorPlans', userId);
                    const floorPlanSnap = await getDoc(floorPlanRef);
                    if (floorPlanSnap.exists()) {
                        const floorPlan = floorPlanSnap.data() as FloorPlan;
                        const newTables = floorPlan.tables.map(table => table.label === tableNumber ? { ...table, status: 'needs_cleaning' } : table);
                        batch.update(floorPlanRef, { tables: newTables });
                    }
                }
            } else {
                // Creating a new, immediately completed order (e.g., takeaway)
                const newOrderData: Omit<Order, 'id'> = {
                    items: orderItems, plateNumber: identifier, subtotal, taxes: appliedTaxes, taxAmount, tip: 0, platformFee: 0, total, status: 'Completed', createdAt: Timestamp.now(), userId, notes: orderNotes.trim(), orderType: type, paymentMethod, appliedDiscounts: [] };
                const newOrderRef = doc(collection(db, 'orders'));
                batch.set(newOrderRef, newOrderData);
            }
            await batch.commit();
            onClose();
        } catch (error) {
            console.error("Error finalizing order:", error);
            alert("Failed to finalize order.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleNoteIconClick = (e: React.MouseEvent<HTMLButtonElement>, cartItemId: string) => {
        const buttonRef = e.currentTarget;
        const rect = buttonRef.getBoundingClientRect();
        setNotePopover({ cartItemId, top: rect.bottom + 8, left: rect.left, ref: { current: buttonRef } });
    };

    const handleQuickNote = (cartItemId: string, noteText: string) => {
        setCart(prevCart => prevCart.map(item =>
            item.cartItemId === cartItemId
                ? { ...item, notes: (item.notes ? `${item.notes}, ` : '') + noteText }
                : item
        ));
    };

    const NotePopover = () => {
        if (!notePopover || !notePopover.cartItemId) return null;
        
        const item = cart.find(i => i.cartItemId === notePopover.cartItemId);
        if(!item) return null;

        const quickNotes = [t('pos_quick_note_no_onions'), t('pos_quick_note_sauce_on_side'), t('pos_quick_note_well_done'), t('pos_quick_note_allergy')];

        return (
            <div
                ref={popoverRef}
                style={{ top: notePopover.top, left: notePopover.left }}
                className="absolute z-10 w-64 bg-white dark:bg-brand-gray-800 rounded-lg shadow-xl border dark:border-brand-gray-700 p-3"
            >
                <h4 className="text-sm font-bold mb-2">{t('pos_quick_notes_title')}</h4>
                <div className="flex flex-wrap gap-1 mb-2">
                    {quickNotes.map(note => (
                        <button key={note} onClick={() => handleQuickNote(item.cartItemId, note)} className="text-xs bg-brand-gray-200 dark:bg-brand-gray-700 hover:bg-brand-gray-300 px-2 py-1 rounded-md">{note}</button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder={t('pos_item_note_placeholder')}
                    value={item.notes || ''}
                    onChange={(e) => handleNoteChange(item.cartItemId, e.target.value)}
                    className="w-full text-xs p-2 rounded border bg-brand-gray-50 dark:bg-brand-gray-600 border-brand-gray-200 dark:border-brand-gray-500"
                />
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-brand-gray-900 w-full h-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-brand-gray-200 dark:border-brand-gray-800">
                    <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white">
                        {type === 'dine-in' ? (orderIds && orderIds.length > 0 ? t('pos_existing_order_title', identifier) : t('pos_dine_in_title', identifier)) : t('pos_takeaway_title')}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700">
                        <XIcon className="w-6 h-6 text-brand-gray-500"/>
                    </button>
                </header>
                <div className="flex-grow flex overflow-hidden">
                    <div className="w-3/5 flex flex-col border-e border-brand-gray-200 dark:border-brand-gray-800">
                        <div className="p-4 flex-shrink-0">
                            <input type="text" placeholder={t('pos_search_items')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {categories.map(category => {
                                const itemsInCategory = getItemsForCategory(category.name);
                                if (itemsInCategory.length === 0) return null;
                                return (
                                <section key={category.id} className="p-4 pt-0 mb-4">
                                    <h3 className="text-sm font-bold text-brand-gray-500 dark:text-brand-gray-400 uppercase tracking-wider mb-2">{category.name}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {itemsInCategory.map(item => (
                                            <button key={item.id} onClick={() => handleSelectItem(item)} className="w-full text-left p-2 rounded-lg hover:bg-brand-gray-100 dark:hover:bg-brand-gray-800/50 transition-all border border-transparent hover:border-brand-gray-200 dark:hover:border-brand-gray-700 hover:shadow-md group">
                                                <div className="w-full h-24 rounded-md mb-2 overflow-hidden bg-brand-gray-200 dark:bg-brand-gray-700">
                                                    <img src={item.imageUrl || `https://placehold.co/200x150/1f2937/e5e7eb?text=${encodeURIComponent(item.name)}`} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
                    
                    <div className="w-2/5 flex flex-col bg-brand-gray-50 dark:bg-brand-gray-800/50">
                       {modalView === 'order' ? (
                            <>
                                <div className="p-4 flex-shrink-0">
                                    <h3 className="text-lg font-bold text-brand-gray-800 dark:text-white">{t('pos_order_ticket_title')}</h3>
                                    {type === 'takeaway' && <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={t('pos_customer_id_placeholder')} className="w-full mt-2 p-2 text-sm bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md" />}
                                </div>
                                <div className="flex-grow overflow-y-auto px-4 space-y-2">
                                    {cart.length === 0 ? <p className="text-center text-brand-gray-500 p-8">{t('pos_no_items_in_order')}</p> : cart.map(item => (
                                        <div key={item.cartItemId} className="bg-white dark:bg-brand-gray-700 p-2 rounded-lg shadow-sm text-sm">
                                            <div className="flex justify-between items-start">
                                                <button onClick={() => setSelectedItem(allItems.find(mi => mi.id === item.id) || null)} className="font-semibold flex-grow truncate pr-2 text-left hover:text-brand-teal">{item.quantity}x {item.name}</button>
                                                <span className="font-mono flex-shrink-0">OMR {(item.basePrice * item.quantity).toFixed(3)}</span>
                                            </div>
                                            <div className="text-xs text-brand-gray-500 dark:text-brand-gray-400 pl-1 pt-1">
                                               {item.selectedModifiers.length > 0 && (<p>{item.selectedModifiers.map(m => `+ ${m.optionName}`).join(', ')}</p>)}
                                               {item.notes && <p className="italic text-amber-600 dark:text-amber-400">Note: {item.notes}</p>}
                                            </div>
                                            <div className="flex items-center justify-end gap-2 mt-1">
                                                <button onClick={(e) => handleNoteIconClick(e, item.cartItemId)} className="p-1 rounded hover:bg-brand-gray-100 dark:hover:bg-brand-gray-600"><NotePencilIcon className="w-4 h-4 text-brand-gray-500" /></button>
                                                <button onClick={() => handleUpdateQuantity(item.cartItemId, -1)} className="w-5 h-5 rounded-full border text-base font-bold flex items-center justify-center">-</button>
                                                <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => handleUpdateQuantity(item.cartItemId, 1)} className="w-5 h-5 rounded-full border text-base font-bold flex items-center justify-center">+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <footer className="flex-shrink-0 p-4 border-t border-brand-gray-200 dark:border-brand-gray-700 space-y-3">
                                    <div>
                                        <label htmlFor="orderNotes" className="text-xs font-semibold text-brand-gray-600 dark:text-brand-gray-300">{t('pos_notes_label')}</label>
                                        <textarea id="orderNotes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder={t('pos_notes_placeholder')} rows={2} className="mt-1 block w-full px-2 py-1 text-sm bg-white dark:bg-brand-gray-700 border border-brand-gray-300 dark:border-brand-gray-600 rounded-md shadow-sm" />
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <div className="flex justify-between"><span>{t('pos_subtotal')}</span><span className="font-mono">OMR {subtotal.toFixed(3)}</span></div>
                                        {appliedTaxes.map(tax => <div key={tax.name} className="flex justify-between"><span>{tax.name} ({tax.rate}%)</span><span className="font-mono">OMR {tax.amount.toFixed(3)}</span></div>)}
                                    </div>
                                    <div className="flex justify-between font-bold text-xl border-t border-brand-gray-200 dark:border-brand-gray-700 pt-2 mt-2"><span>{t('pos_total')}</span><span className="font-mono">OMR {total.toFixed(3)}</span></div>
                                    <button onClick={() => setModalView('payment')} disabled={cart.length === 0} className="w-full bg-brand-teal text-white font-bold py-3 rounded-lg hover:bg-brand-teal-dark transition-colors disabled:bg-teal-300">{t('pos_payment_button')}</button>
                                    <button onClick={handleSendToKitchen} disabled={loading || cart.length === 0} className="w-full bg-yellow-500 text-white font-bold py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm disabled:bg-yellow-300">
                                        {orderIds && orderIds.length > 0 ? t('pos_add_to_order') : t('rapid_order_send_to_kitchen')}
                                    </button>
                                </footer>
                            </>
                       ) : (
                            <div className="p-6 flex flex-col h-full">
                                <div className="flex-shrink-0 flex items-center gap-4 mb-6">
                                    <button onClick={() => setModalView('order')} className="p-2 rounded-full hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
                                    <h3 className="text-xl font-bold text-brand-gray-800 dark:text-white">{t('pos_payment_title')}</h3>
                                </div>
                                <div className="text-center"><p className="text-sm text-brand-gray-500 dark:text-brand-gray-400">{t('pos_total_due')}</p><p className="text-5xl font-extrabold text-brand-gray-800 dark:text-white my-2">OMR {total.toFixed(3)}</p></div>
                                <div className="grid grid-cols-2 gap-4 my-6">
                                    <button onClick={() => setPaymentMethod('cash')} className={`py-4 rounded-lg font-semibold text-lg transition-all ${paymentMethod === 'cash' ? 'bg-brand-teal text-white shadow-lg' : 'bg-white dark:bg-brand-gray-700 hover:bg-brand-gray-100'}`}>{t('pos_payment_method_cash')}</button>
                                    <button onClick={() => setPaymentMethod('card')} className={`py-4 rounded-lg font-semibold text-lg transition-all ${paymentMethod === 'card' ? 'bg-brand-teal text-white shadow-lg' : 'bg-white dark:bg-brand-gray-700 hover:bg-brand-gray-100'}`}>{t('pos_payment_method_card')}</button>
                                </div>
                                {paymentMethod === 'cash' && total > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold w-28">{t('pos_amount_tendered_label')}</span>
                                            <input type="text" value={tenderedAmount === '' ? '' : `OMR ${Number(tenderedAmount).toFixed(3)}`} readOnly className="flex-grow p-2 text-right text-lg font-mono rounded-md border bg-white dark:bg-brand-gray-700 border-brand-gray-300 dark:border-brand-gray-600" />
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            {quickCashOptions.map(amount => <button key={amount} onClick={() => setTenderedAmount(amount)} className="text-xs py-1 px-3 rounded-md bg-brand-gray-200 dark:bg-brand-gray-600 hover:bg-brand-gray-300">OMR {amount.toFixed(3)}</button>)}
                                        </div>
                                        <Numpad onInput={(v) => setTenderedAmount(prev => parseFloat(String(prev) + v))} onClear={() => setTenderedAmount('')} onBackspace={() => setTenderedAmount(prev => String(prev).slice(0, -1) === '' ? '' : parseFloat(String(prev).slice(0,-1)))} />
                                         <div className="flex justify-between font-bold text-xl text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 p-3 rounded-lg"><span>{t('pos_change_due_label')}</span><span>OMR {changeDue > 0 ? changeDue.toFixed(3) : '0.000'}</span></div>
                                    </div>
                                )}
                                <div className="mt-auto">
                                    <button onClick={handleFinalizeOrder} disabled={loading || (paymentMethod === 'cash' && (tenderedAmount === '' || tenderedAmount < total))} className="w-full bg-green-500 text-white font-bold py-4 rounded-lg hover:bg-green-600 transition-colors text-lg disabled:bg-green-300">{t('pos_complete_order_button')}</button>
                                </div>
                            </div>
                       )}
                    </div>
                </div>
            </div>
            {selectedItem && <ItemDetailModal item={selectedItem} promotion={null} onClose={() => setSelectedItem(null)} onAddToCart={handleAddToCart} />}
            {notePopover && <NotePopover />}
        </div>
    );
};

export default POSModal;