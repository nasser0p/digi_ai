import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, Timestamp, query, where, doc, getDoc, getDocs, addDoc, orderBy, setDoc, writeBatch, increment, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { MenuItem, CartItem, Store, RestaurantProfile, OrderItem, Category, MenuAppearance, Promotion, AppliedDiscount, SpecialOffer, MultiBuyOffer, CustomerLoyaltyProgress, LoyaltyProgram, AppliedTax, Tax } from '../../types';
import CustomerItemCard from './CustomerItemCard';
import CustomerItemRow from './CustomerItemRow';
import Cart from './Cart';
import ItemDetailModal from './ItemDetailModal';
import CheckoutView from './CheckoutView';
import CustomerOrderTracker from './CustomerOrderTracker';
import ActiveOrdersButton from './ActiveOrdersButton';
import SlideInPanel from '../ui/SlideInPanel';
import { useTranslation } from '../../contexts/LanguageContext';
import MyRewardsButton from './promotions/MyRewardsButton';
import MyRewardsPanel from './promotions/MyRewardsPanel';

const darkenColor = (hex: string, percent: number): string => {
    if (!hex || hex.length < 7) return '#000000';
    try {
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);

        r = Math.floor(r * (100 - percent) / 100);
        g = Math.floor(g * (100 - percent) / 100);
        b = Math.floor(b * (100 - percent) / 100);

        return `#${('00' + r.toString(16)).slice(-2)}${('00' + g.toString(16)).slice(-2)}${('00' + b.toString(16)).slice(-2)}`;
    } catch (e) {
        return '#000000';
    }
};

const defaultAppearance: MenuAppearance = {
    layout: 'grid',
    fontTheme: 'modern',
    brandColor: '#28a7a1',
    backgroundColor: '#f9fafb',
    textColor: '#1f2937',
    headerBannerUrl: '',
    backgroundStyle: 'solid',
    enableParallax: true,
    enableItemAnimations: true,
};

interface CustomerMenuPageProps {
    storeId?: string;
    restaurantId: string;
    tableNumber?: string;
}

type View = 'menu' | 'checkout';

const CustomerMenuPage: React.FC<CustomerMenuPageProps> = ({ storeId, restaurantId, tableNumber }) => {
    const { t } = useTranslation();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [profile, setProfile] = useState<RestaurantProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>('menu');
    const [tipAmount, setTipAmount] = useState(0);
    const [plateNumber, setPlateNumber] = useState(tableNumber || '');
    const [storeName, setStoreName] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [showOnlyPromotions, setShowOnlyPromotions] = useState(false);
    const [activeOrderIds, setActiveOrderIds] = useState<string[]>([]);
    const [isTrackingPanelOpen, setIsTrackingPanelOpen] = useState(false);
    const [justOrdered, setJustOrdered] = useState(false);
    const [orderNotes, setOrderNotes] = useState('');
    const [customerPhoneNumber, setCustomerPhoneNumber] = useState('');
    const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedDiscount[]>([]);
    
    // Loyalty State
    const [isRewardsPanelOpen, setIsRewardsPanelOpen] = useState(false);
    const [customerLoyaltyProgress, setCustomerLoyaltyProgress] = useState<CustomerLoyaltyProgress | null>(null);


    const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
    const bannerRef = useRef<HTMLDivElement>(null);
    const appearance = profile?.menuAppearance || defaultAppearance;

    useEffect(() => {
        const brandColor = appearance.brandColor;
        document.documentElement.style.setProperty('--brand-color-customer', brandColor);
        document.documentElement.style.setProperty('--brand-color-customer-dark', darkenColor(brandColor, 10));
        document.documentElement.style.setProperty('--customer-bg-color', appearance.backgroundColor);
        document.documentElement.style.setProperty('--customer-text-color', appearance.textColor);
        
        return () => {
            document.documentElement.style.removeProperty('--brand-color-customer');
            document.documentElement.style.removeProperty('--brand-color-customer-dark');
            document.documentElement.style.removeProperty('--customer-bg-color');
            document.documentElement.style.removeProperty('--customer-text-color');
        }
    }, [appearance]);

     useEffect(() => {
        if (!appearance.enableParallax) return;

        const handleScroll = () => {
            if (bannerRef.current) {
                const offset = window.pageYOffset;
                bannerRef.current.style.transform = `translateY(${offset * 0.4}px)`;
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [appearance.enableParallax]);

    useEffect(() => {
        if (!restaurantId) {
            setError(t('customer_menu_error_no_restaurant'));
            setLoading(false);
            return;
        }
        setLoading(true);
        
        const fetchData = async () => {
            try {
                const profileRef = doc(db, "restaurantProfiles", restaurantId);
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) {
                    setProfile(profileSnap.data() as RestaurantProfile);
                }

                if (storeId) {
                    const storeRef = doc(db, "stores", storeId);
                    const storeSnap = await getDoc(storeRef);
                    if (storeSnap.exists()) {
                        setStoreName((storeSnap.data() as Store).name);
                    }
                }
                
                const taxQuery = query(collection(db, "taxes"), where("userId", "==", restaurantId));
                const taxSnap = await getDocs(taxQuery);
                setTaxes(taxSnap.docs.map(d => d.data() as Tax));

                const categoriesQuery = query(collection(db, "categories"), where("userId", "==", restaurantId), orderBy("order", "asc"));
                const categoriesSnapshot = await getDocs(categoriesQuery);
                const fetchedCategories = categoriesSnapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as Category);
                setCategories(fetchedCategories);

                const menuItemsQuery = query(collection(db, "menuItems"), where("userId", "==", restaurantId));
                const menuItemsSnapshot = await getDocs(menuItemsQuery);
                const fetchedItems = menuItemsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as MenuItem);
                setMenuItems(fetchedItems);
                
                const promotionsQuery = query(collection(db, "promotions"), where("userId", "==", restaurantId), where("isActive", "==", true));
                const promotionsSnapshot = await getDocs(promotionsQuery);
                const fetchedPromotions = promotionsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id}) as Promotion);
                setPromotions(fetchedPromotions);

                if (fetchedItems.length === 0) {
                     setError(t('customer_menu_error_no_items'));
                }
                
                const savedPhone = localStorage.getItem(`digiplate_customer_${restaurantId}`);
                if (savedPhone) {
                    setCustomerPhoneNumber(savedPhone);
                }

            } catch (err: any) {
                console.error("Firebase menu snapshot error:", err);
                setError(t('customer_menu_error_could_not_load'));
            } finally {
                setLoading(false);
            }
        }
        
        fetchData();
    }, [restaurantId, storeId, t]);

    useEffect(() => {
        if (!customerPhoneNumber || !restaurantId) {
            setCustomerLoyaltyProgress(null);
            return;
        }

        const loyaltyRef = doc(db, 'customerLoyalty', customerPhoneNumber);
        const unsubscribe = onSnapshot(loyaltyRef, (docSnap) => {
            if (docSnap.exists()) {
                setCustomerLoyaltyProgress(docSnap.data() as CustomerLoyaltyProgress);
            } else {
                setCustomerLoyaltyProgress(null);
            }
        });

        return () => unsubscribe();
    }, [customerPhoneNumber, restaurantId]);

    useEffect(() => {
        if (categories.length > 0 && !activeCategory && !showOnlyPromotions) {
            setActiveCategory(categories[0].id);
        }
    }, [categories, activeCategory, showOnlyPromotions]);

    useEffect(() => {
        if (showOnlyPromotions) return;
        const observerOptions = { rootMargin: '-30% 0px -70% 0px', threshold: 0 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) setActiveCategory(entry.target.id);
            });
        }, observerOptions);

        const refs = categoryRefs.current;
        Object.values(refs).forEach(ref => { if (ref) observer.observe(ref); });
        return () => { Object.values(refs).forEach(ref => { if (ref) observer.unobserve(ref); }); };
    }, [categories, menuItems, showOnlyPromotions]);

    const itemPromotions = useMemo(() => {
        const promoMap = new Map<string, Promotion>();
        
        const activePromotions = promotions.filter(p => p.isActive);

        for (const promo of activePromotions) {
            let applicableIds: string[] = [];
            if (promo.type === 'special_offer') {
                applicableIds = (promo.details as SpecialOffer).applicableItemIds || [];
            } else if (promo.type === 'multi_buy') {
                applicableIds = (promo.details as MultiBuyOffer).buyItemIds || [];
            }
            
            for (const itemId of applicableIds) {
                if (!promoMap.has(itemId)) { // First promo found for an item wins
                    promoMap.set(itemId, promo);
                }
            }
        }
        return promoMap;
    }, [promotions]);

    useEffect(() => {
        const activeOffers = promotions.filter(p => p.type === 'special_offer' && p.isActive) as (Promotion & { details: SpecialOffer })[];
        if (activeOffers.length === 0 || cart.length === 0) {
            setAppliedDiscounts([]);
            return;
        }

        // Simple logic: find the best single special offer and apply it.
        let bestDiscount: AppliedDiscount = { promotionName: '', amount: 0 };

        for (const promo of activeOffers) {
            const applicableItemsInCart = promo.details.applicableItemIds && promo.details.applicableItemIds.length > 0
                ? cart.filter(cartItem => promo.details.applicableItemIds!.includes(cartItem.id))
                : cart;

            const subtotalOfApplicableItems = applicableItemsInCart.reduce((sum, item) => sum + (item.basePrice + item.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0)) * item.quantity, 0);
            
            const discountAmount = promo.details.discountType === 'percentage'
                ? subtotalOfApplicableItems * (promo.details.discountValue / 100)
                : Math.min(promo.details.discountValue, subtotalOfApplicableItems);

            if (discountAmount > bestDiscount.amount) {
                bestDiscount = { promotionName: promo.name, amount: discountAmount };
            }
        }
        setAppliedDiscounts(bestDiscount.amount > 0 ? [bestDiscount] : []);
    }, [cart, promotions]);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.basePrice + item.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0)) * item.quantity, 0), [cart]);
    const totalDiscount = useMemo(() => appliedDiscounts.reduce((sum, d) => sum + d.amount, 0), [appliedDiscounts]);
    const taxableAmount = subtotal - totalDiscount;

    const appliedTaxes = useMemo<AppliedTax[]>(() => {
        if (!profile || !profile.appliedTaxIds) return [];
        return taxes
            .filter(t => profile.appliedTaxIds!.includes(t.id))
            .map(t => ({
                name: t.name,
                rate: t.rate,
                amount: taxableAmount * (t.rate / 100)
            }));
    }, [profile, taxes, taxableAmount]);

    const taxAmount = useMemo(() => appliedTaxes.reduce((sum, t) => sum + t.amount, 0), [appliedTaxes]);

    const platformFee = useMemo(() => (taxableAmount + taxAmount) * 0.03, [taxableAmount, taxAmount]);
    const total = useMemo(() => taxableAmount + taxAmount + tipAmount + platformFee, [taxableAmount, taxAmount, tipAmount, platformFee]);
    
    const loyaltyPromotions = useMemo(() => promotions.filter(p => p.type === 'loyalty' && p.isActive), [promotions]);


    const handleAddToCart = (item: CartItem) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(cartItem => cartItem.cartItemId === item.cartItemId);
            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex].quantity += item.quantity;
                return newCart;
            } else {
                 return [...prevCart, item];
            }
        });
        setSelectedItem(null);
        setSelectedPromotion(null);
        setToastMessage(t('customer_menu_toast_added', item.quantity, item.name));
        setTimeout(() => setToastMessage(null), 2500);
    };

    const handleUpdateQuantity = (cartItemId: string, quantity: number) => {
        setCart(prevCart => {
            if (quantity <= 0) return prevCart.filter(item => item.cartItemId !== cartItemId);
            return prevCart.map(item => item.cartItemId === cartItemId ? { ...item, quantity } : item);
        });
    };

    const handleProceedToCheckout = () => { if (cart.length > 0) setView('checkout'); }

    const handlePlaceOrder = async () => {
        if (cart.length === 0 || !plateNumber.trim()) return;
        const orderItems: OrderItem[] = cart.map(cartItem => ({
            name: cartItem.name, menuItemId: cartItem.id, price: cartItem.basePrice + cartItem.selectedModifiers.reduce((p, c) => p + c.optionPrice, 0), quantity: cartItem.quantity, selectedModifiers: cartItem.selectedModifiers, isCompleted: false, notes: cartItem.notes || ''
        }));
        try {
            const newOrderData: any = { items: orderItems, plateNumber: plateNumber.trim(), subtotal, appliedDiscounts, tip: tipAmount, platformFee, total, taxes: appliedTaxes, taxAmount, status: tableNumber ? 'Pending' : 'New', createdAt: Timestamp.now(), userId: restaurantId, notes: orderNotes.trim(), customerPhoneNumber: customerPhoneNumber.trim() || null };
            if (storeId) { newOrderData.storeId = storeId; newOrderData.storeName = storeName || "Store"; }
            const docRef = await addDoc(collection(db, "orders"), newOrderData);

            const phone = customerPhoneNumber.trim();
            if (phone) {
                localStorage.setItem(`digiplate_customer_${restaurantId}`, phone);
                const loyaltyRef = doc(db, 'customerLoyalty', phone);
                const loyaltySnap = await getDoc(loyaltyRef);
                const batch = writeBatch(db);

                // Find active loyalty promotions
                const spendPromo = loyaltyPromotions.find(p => (p.details as LoyaltyProgram).type === 'spend_based');
                const visitPromos = loyaltyPromotions.filter(p => (p.details as LoyaltyProgram).type === 'visit_based');
                
                const loyaltyUpdates: Record<string, any> = {};

                if (spendPromo) {
                    const earnRate = (spendPromo.details as LoyaltyProgram).earnRate || 1;
                    loyaltyUpdates.points = increment(Math.floor(subtotal * earnRate));
                }

                visitPromos.forEach(p => {
                    const details = p.details as LoyaltyProgram;
                    const hasApplicableItem = cart.some(cartItem => details.applicableItemIds?.includes(cartItem.id));
                    if(hasApplicableItem) {
                        loyaltyUpdates[`visitCounts.${p.id}`] = increment(1);
                    }
                });
                
                if (Object.keys(loyaltyUpdates).length > 0) {
                     if (!loyaltySnap.exists()) {
                        batch.set(loyaltyRef, {
                            id: phone, userId: restaurantId, points: 0, visitCounts: {}, createdAt: Timestamp.now(), ...loyaltyUpdates
                        });
                    } else {
                        batch.update(loyaltyRef, loyaltyUpdates);
                    }
                    await batch.commit();
                }
            }


            if (profile?.isLiveTrackingEnabled ?? true) {
                setActiveOrderIds(prev => [...prev, docRef.id]);
                setIsTrackingPanelOpen(true);
                setJustOrdered(true);
                setTimeout(() => setJustOrdered(false), 500);
            }
            setCart([]); setTipAmount(0); setOrderNotes('');
            if (!tableNumber) setPlateNumber('');
            setView('menu'); setToastMessage(t('customer_menu_toast_order_placed'));
            setTimeout(() => setToastMessage(null), 2500);
        } catch (error) { console.error("Error placing or updating order: ", error); alert(t('customer_menu_alert_order_failed')); }
    };
    
    const handleDismissOrder = (orderIdToRemove: string) => { setActiveOrderIds(prev => prev.filter(id => id !== orderIdToRemove)); };

    const handleSelectItem = (item: MenuItem) => {
        if (!item.isAvailable) return;
        
        const promotion = itemPromotions.get(item.id) || null;

        if (!item.modifierGroups || item.modifierGroups.length === 0) {
            const cartItem: CartItem = { cartItemId: item.id, id: item.id, name: item.name, basePrice: item.price, quantity: 1, imageUrl: item.imageUrl, selectedModifiers: [], };
            handleAddToCart(cartItem);
        } else {
            setSelectedItem(item);
            setSelectedPromotion(promotion);
        }
    }
    
    const handleFilterClick = (filterId: string) => {
        if (filterId === 'special_offers') {
            setShowOnlyPromotions(true);
            setActiveCategory(''); 
        } else {
            setShowOnlyPromotions(false);
            setActiveCategory(filterId);
            scrollToCategory(filterId);
        }
    }
    
    const handleRedeemPunch = async (promotionId: string, rewardItemId: string) => {
        const rewardItem = menuItems.find(mi => mi.id === rewardItemId);
        if (!rewardItem || !customerPhoneNumber) return;

        const freeCartItem: CartItem = {
            cartItemId: `${rewardItem.id}-free-${Date.now()}`,
            id: rewardItem.id,
            name: `${rewardItem.name} (Free Reward)`,
            basePrice: 0,
            quantity: 1,
            selectedModifiers: [],
        };
        handleAddToCart(freeCartItem);

        const loyaltyRef = doc(db, 'customerLoyalty', customerPhoneNumber);
        const goal = (promotions.find(p => p.id === promotionId)?.details as LoyaltyProgram).visitGoal || 1;
        
        await updateDoc(loyaltyRef, {
            [`visitCounts.${promotionId}`]: increment(-goal),
        });

        setIsRewardsPanelOpen(false);
    };

    const handleSetCustomerPhone = (phone: string) => {
        const trimmedPhone = phone.trim();
        if (trimmedPhone) {
            localStorage.setItem(`digiplate_customer_${restaurantId}`, trimmedPhone);
            setCustomerPhoneNumber(trimmedPhone);
            setIsRewardsPanelOpen(true); // Keep it open to show rewards
        }
    };

    const scrollToCategory = (categoryId: string) => { categoryRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start', }); };
    const getItemsForCategory = (categoryName: string) => menuItems.filter(item => item.category === categoryName).sort((a,b) => a.order - b.order);

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50">{t('customer_menu_loading')}</div>;
    if (error) return <div className="flex justify-center items-center h-screen bg-gray-50 text-red-500">{error}</div>;

    if (view === 'checkout') {
        return <CheckoutView 
            cart={cart}
            subtotal={subtotal}
            tipAmount={tipAmount}
            platformFee={platformFee}
            total={total}
            plateNumber={plateNumber}
            onPlateNumberChange={setPlateNumber}
            onTipChange={setTipAmount}
            onPlaceOrder={handlePlaceOrder}
            onBack={() => setView('menu')}
            restaurantName={profile?.name}
            isTableOrder={!!tableNumber}
            notes={orderNotes} onNotesChange={setOrderNotes} 
            appliedDiscounts={appliedDiscounts}
            appliedTaxes={appliedTaxes}
            customerPhoneNumber={customerPhoneNumber} onCustomerPhoneNumberChange={handleSetCustomerPhone}
        />
    }
    
    const fontClass = `font-${appearance.fontTheme}`;
    const backgroundClass = appearance.backgroundStyle === 'solid' ? 'customer-bg' : `bg-${appearance.backgroundStyle}`;
    const mainClasses = `${backgroundClass} customer-text`;
    const layoutWrapperClasses = appearance.layout === 'elegant' ? 'max-w-3xl mx-auto' : 'max-w-5xl mx-auto';
    
    const promotedItems = Array.from(itemPromotions.keys()).map(id => menuItems.find(item => item.id === id)).filter(Boolean) as MenuItem[];


    return (
        <div className={`${mainClasses} min-h-screen ${fontClass}`}>
             <header className="relative">
                {appearance.headerBannerUrl ? (
                    <div className="parallax-container">
                        <div ref={bannerRef} className="parallax-bg" style={{ backgroundImage: `url(${appearance.headerBannerUrl})` }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    </div>
                ) : (
                    <div className="h-24"></div> // Spacer if no banner
                )}
                <div className={`p-4 absolute bottom-0 left-0 w-full`}>
                    <div className={`${layoutWrapperClasses} flex items-center justify-between space-x-4 rtl:space-x-reverse`}>
                        <div className="flex items-center space-x-4">
                            {profile?.logoUrl && <img src={profile.logoUrl} alt="Restaurant Logo" className="h-16 w-16 object-cover rounded-full shadow-md border-2 border-white" />}
                            <div>
                                <h1 className="text-3xl font-bold text-white drop-shadow-md">{profile?.name || t('customer_menu_welcome')}</h1>
                                <p className="text-sm font-medium text-gray-200 drop-shadow">{profile?.address}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="sticky top-0 bg-white/80 dark:bg-brand-gray-900/80 backdrop-blur-md z-10 shadow-sm overflow-hidden">
                <div className={`${layoutWrapperClasses} px-4`}>
                    <div className="flex space-x-4 rtl:space-x-reverse overflow-x-auto py-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {itemPromotions.size > 0 && (
                             <button onClick={() => handleFilterClick('special_offers')} className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${showOnlyPromotions ? 'bg-red-500 text-white' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
                                {t('customer_menu_special_offers')}
                            </button>
                        )}
                        {categories.map(category => (
                            <button key={category.id} onClick={() => handleFilterClick(category.id)} className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 ${!showOnlyPromotions && activeCategory === category.id ? 'bg-brand-customer text-white' : 'bg-brand-gray-200 dark:bg-brand-gray-800 text-brand-gray-700 dark:text-brand-gray-300 hover:bg-brand-gray-300 dark:hover:bg-brand-gray-700'}`}>
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className={`${layoutWrapperClasses} p-4 pb-40`}>
                {categories.length === 0 && !loading && ( <div className="text-center py-10"><p className="text-gray-500">{t('customer_menu_no_items_placeholder')}</p></div> )}
                
                {showOnlyPromotions ? (
                     <section className="mb-8 pt-4">
                        <h2 className={`text-2xl font-bold customer-text mb-4 ${appearance.layout === 'elegant' ? 'text-center' : ''}`}>{t('customer_menu_special_offers')}</h2>
                        {appearance.layout === 'grid' ? (
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {promotedItems.map(item => <CustomerItemCard key={item.id} item={item} onSelectItem={handleSelectItem} promotion={itemPromotions.get(item.id) || null} enableItemAnimations={appearance.enableItemAnimations} />)}
                            </div>
                        ) : (
                            <div className="space-y-4">
                               {promotedItems.map(item => <CustomerItemRow key={item.id} item={item} onSelectItem={handleSelectItem} promotion={itemPromotions.get(item.id) || null} enableItemAnimations={appearance.enableItemAnimations} />)}
                            </div>
                        )}
                    </section>
                ) : (
                    categories.map(category => (
                        <section key={category.id} id={category.id} ref={el => { categoryRefs.current[category.id] = el; }} className="mb-8 pt-4 scroll-mt-32">
                            <h2 className={`text-2xl font-bold customer-text mb-4 ${appearance.layout === 'elegant' ? 'text-center' : ''}`}>{category.name}</h2>
                            {appearance.layout === 'grid' ? (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {getItemsForCategory(category.name).map(item => <CustomerItemCard key={item.id} item={item} onSelectItem={handleSelectItem} promotion={itemPromotions.get(item.id) || null} enableItemAnimations={appearance.enableItemAnimations} />)}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                   {getItemsForCategory(category.name).map(item => <CustomerItemRow key={item.id} item={item} onSelectItem={handleSelectItem} promotion={itemPromotions.get(item.id) || null} enableItemAnimations={appearance.enableItemAnimations} />)}
                                </div>
                            )}
                        </section>
                    ))
                )}
            </main>

            <Cart cart={cart} onUpdateQuantity={handleUpdateQuantity} onProceedToCheckout={handleProceedToCheckout} appliedDiscounts={appliedDiscounts} />

            {selectedItem && (
                <ItemDetailModal item={selectedItem} promotion={selectedPromotion} onClose={() => { setSelectedItem(null); setSelectedPromotion(null); }} onAddToCart={handleAddToCart} />
            )}

            {toastMessage && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-brand-gray-900 text-white px-4 py-2 rounded-full text-sm shadow-lg z-30">
                    {toastMessage}
                </div>
            )}
            
            {activeOrderIds.length > 0 && (
                <ActiveOrdersButton orderCount={activeOrderIds.length} onClick={() => setIsTrackingPanelOpen(true)} animate={justOrdered} />
            )}
            
            {loyaltyPromotions.length > 0 && (
                <MyRewardsButton onClick={() => setIsRewardsPanelOpen(true)} />
            )}

            <SlideInPanel isOpen={isTrackingPanelOpen} onClose={() => setIsTrackingPanelOpen(false)}>
                <div className="h-full flex flex-col bg-brand-gray-50 dark:bg-brand-gray-900">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-brand-gray-800 dark:text-white">{t('customer_menu_active_orders_title')}</h2>
                    </div>
                    <div className="flex-grow overflow-y-auto p-6 pt-0 space-y-4">
                        {activeOrderIds.length > 0 ? activeOrderIds.map(id => (
                            <CustomerOrderTracker key={id} orderId={id} onDismiss={handleDismissOrder} />
                        )) : <p className="text-center text-sm text-brand-gray-500">{t('customer_menu_no_active_orders')}</p>}
                    </div>
                </div>
            </SlideInPanel>
            
            <SlideInPanel isOpen={isRewardsPanelOpen} onClose={() => setIsRewardsPanelOpen(false)}>
                <MyRewardsPanel 
                    promotions={loyaltyPromotions}
                    loyaltyProgress={customerLoyaltyProgress}
                    menuItems={menuItems}
                    onRedeemPunch={handleRedeemPunch}
                    customerPhoneNumber={customerPhoneNumber}
                    onSetCustomerPhone={handleSetCustomerPhone}
                />
            </SlideInPanel>
        </div>
    );
};

export default CustomerMenuPage;
