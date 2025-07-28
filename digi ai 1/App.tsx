import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User, signOut, sendEmailVerification } from '@firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, getDocs, deleteDoc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { auth, db, SUPER_ADMIN_UID } from './firebase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MenuPage from './components/menu/MenuPage';
import OrdersPage from './components/OrdersPage';
import StoresPage from './components/StoresPage';
import SettingsPage from './components/SettingsPage';
import CustomerMenuPage from './components/customer/CustomerMenuPage';
import AuthPage from './components/AuthPage';
import Tour from './components/Tour';
import { RestaurantProfile, Store, Role, StaffMember, Order, MenuItem, Category, Ingredient } from './types';
import OnboardingWizard from './components/OnboardingWizard';
import { useTranslation } from './contexts/LanguageContext';
import InventoryPage from './components/inventory/InventoryPage';
import EmailVerificationPage from './components/EmailVerificationPage';
import SuperAdminPage from './components/SuperAdminPage';
import AccountLockedPage from './components/AccountLockedPage';
import LoadingSpinner from './components/ui/LoadingSpinner';
import FloorPlanPage from './components/floorplan/FloorPlanPage';
import ToastContainer from './components/ui/ToastContainer';
import ReportsPage from './components/reports/ReportsPage';
import PromotionsPage from './components/promotions/PromotionsPage';
import RapidOrderModal from './components/floorplan/RapidOrderModal';
import DigiMate from './components/DigiMate';

export type Page = 'Dashboard' | 'Menus' | 'Orders' | 'Floor Plan' | 'Inventory' | 'Stores' | 'Settings' | 'Reports' | 'Promotions';

interface CustomerViewParams {
    storeId?: string;
    restaurantId: string;
    tableNumber?: string;
}

interface RapidOrderContext {
    type: 'dine-in' | 'takeaway';
    tableNumber?: string;
    orderIdToAppend?: string;
}


const EmailVerificationBanner: React.FC<{ user: User }> = ({ user }) => {
    const { t } = useTranslation();
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');

    const handleResend = async () => {
        setSending(true);
        setMessage('');
        try {
            await sendEmailVerification(user);
            setMessage(t('auth_verification_resent'));
            setTimeout(() => setMessage(''), 5000);
        } catch (error) {
            console.error(error);
            setMessage(t('auth_verification_resend_error'));
        } finally {
            setSending(false);
        }
    };
    
    return (
        <div className="bg-yellow-100 dark:bg-yellow-900/40 border-b-2 border-yellow-200 dark:border-yellow-800/50 text-yellow-800 dark:text-yellow-200 p-3 text-center text-sm w-full">
            {t('auth_verify_email_prompt')}
            <button onClick={handleResend} disabled={sending} className="font-bold underline mx-2 hover:text-yellow-900 dark:hover:text-yellow-100 disabled:opacity-50">
                {sending ? t('auth_sending') : t('auth_resend_email')}
            </button>
            {message && <span className="font-semibold">{message}</span>}
        </div>
    );
};


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [restaurantOwnerId, setRestaurantOwnerId] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showVerificationPage, setShowVerificationPage] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  
  const [view, setView] = useState<'admin' | 'customer'>('admin');
  const [customerParams, setCustomerParams] = useState<CustomerViewParams | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  
  // Notification State
  const [hasUnseenOrder, setHasUnseenOrder] = useState(false);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const titleIntervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef(document.title);
  const [pendingOrderToasts, setPendingOrderToasts] = useState<Order[]>([]);
  const toastAudioRef = useRef<HTMLAudioElement | null>(null);

  // Tour state
  const [isTourActive, setIsTourActive] = useState(false);
  const { t } = useTranslation();

  // POS Modal State & Centralized Data
  const [rapidOrderContext, setRapidOrderContext] = useState<RapidOrderContext | null>(null);
  const [posMenuItems, setPosMenuItems] = useState<MenuItem[]>([]);
  const [posCategories, setPosCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);


  useEffect(() => {
    notificationAudioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3');
    toastAudioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
  }, []);

  const handleNewOrder = useCallback(() => {
    if (activePage !== 'Orders') {
        setHasUnseenOrder(true);
        notificationAudioRef.current?.play().catch(e => console.error("Error playing sound:", e));
    }
  }, [activePage]);

  // Toast listener for pending orders
  useEffect(() => {
    if (!restaurantOwnerId || (role !== 'admin' && role !== 'manager')) {
        return;
    }

    const q = query(collection(db, "orders"), where("userId", "==", restaurantOwnerId), where("status", "==", "Pending"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const orderData = { ...change.doc.data(), id: change.doc.id } as Order;
            if (change.type === 'added') {
                setPendingOrderToasts(prev => {
                    if (prev.some(t => t.id === orderData.id)) return prev;
                    toastAudioRef.current?.play().catch(e => console.error("Error playing toast sound:", e));
                    return [...prev, orderData];
                });
            }
            if (change.type === 'removed') {
                setPendingOrderToasts(prev => prev.filter(t => t.id !== orderData.id));
            }
        });
    });

    return () => unsubscribe();
  }, [restaurantOwnerId, role]);


  useEffect(() => {
    if (hasUnseenOrder) {
        if (!titleIntervalRef.current) {
            titleIntervalRef.current = window.setInterval(() => {
                document.title = document.title === originalTitleRef.current ? t('app_new_order_notification') : originalTitleRef.current;
            }, 1000);
        }
    } else {
        if (titleIntervalRef.current) {
            clearInterval(titleIntervalRef.current);
            titleIntervalRef.current = null;
        }
        document.title = originalTitleRef.current;
    }

    return () => {
        if (titleIntervalRef.current) {
            clearInterval(titleIntervalRef.current);
        }
    }
  }, [hasUnseenOrder, t]);
  
  const handleSetActivePage = (page: Page) => {
    setActivePage(page);
    if (page === 'Orders') {
        setHasUnseenOrder(false);
    }
  }

  const handleCompleteTour = async () => {
    setIsTourActive(false);
    if (user && role === 'admin') {
        try {
            const profileRef = doc(db, 'restaurantProfiles', user.uid);
            await setDoc(profileRef, { hasCompletedTour: true }, { merge: true });
            setProfile(p => p ? { ...p, hasCompletedTour: true } : null);
        } catch (error) {
            console.error("Failed to update tour status:", error);
        }
    }
  };

  const loadUserProfile = async (user: User) => {
    // 1. Check if user is an owner/admin
    const profileRef = doc(db, 'restaurantProfiles', user.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const profileData = { id: profileSnap.id, ...profileSnap.data() } as RestaurantProfile;
      if (profileData.isLocked) {
        setIsAccountLocked(true);
        return { isUser: true };
      }
      setProfile(profileData);
      setRole('admin');
      setRestaurantOwnerId(user.uid);
      if (profileData.onboardingCompleted && !profileData.hasCompletedTour) {
        setTimeout(() => setIsTourActive(true), 1000);
      }
      return { isUser: true };
    }

    // 2. Check if user is a staff member
    const staffRef = doc(db, 'staff', user.uid);
    const staffSnap = await getDoc(staffRef);

    if (staffSnap.exists()) {
      const staffData = staffSnap.data() as Omit<StaffMember, 'id'>;
      const ownerProfileRef = doc(db, 'restaurantProfiles', staffData.restaurantId);
      const ownerProfileSnap = await getDoc(ownerProfileRef);
      if (ownerProfileSnap.exists()) {
        const ownerProfileData = {id: ownerProfileSnap.id, ...ownerProfileSnap.data()} as RestaurantProfile;
        if (ownerProfileData.isLocked) {
            setIsAccountLocked(true);
            return { isUser: true };
        }
        setProfile(ownerProfileData);
        setRole(staffData.role);
        setRestaurantOwnerId(staffData.restaurantId);
      } else {
        console.error("Staff member for a restaurant that doesn't exist.");
        setProfile(null); setRole(null); setRestaurantOwnerId(null);
      }
      return { isUser: true };
    }

    return { isUser: false };
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const restaurantIdParam = urlParams.get('restaurantId');
    const storeIdParam = urlParams.get('storeId');
    const tableParam = urlParams.get('table');

    if (viewParam === 'customer' && restaurantIdParam) {
      setView('customer');
      setCustomerParams({
        storeId: storeIdParam || undefined,
        restaurantId: restaurantIdParam,
        tableNumber: tableParam || undefined,
      });
      setIsAuthLoading(false);
      return;
    }
    
    setView('admin');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setIsAuthLoading(true);

        // Reset state for any user change
        setUser(null);
        setProfile(null);
        setRole(null);
        setRestaurantOwnerId(null);
        setIsSuperAdmin(false);
        setIsAccountLocked(false);
        setShowVerificationPage(false);
        setPendingOrderToasts([]); // Clear toasts on user change

        if (user) {
            setUser(user);

            // Super Admin Check
            if (user.uid === SUPER_ADMIN_UID) {
                setIsSuperAdmin(true);
                setIsAuthLoading(false);
                return;
            }

            // Email Verification Check
            await user.reload();
            const freshUser = auth.currentUser;
            if (freshUser) {
                const staffSnap = await getDoc(doc(db, 'staff', freshUser.uid));
                const inviteSnap = freshUser.email ? await getDoc(doc(db, 'invites', freshUser.email)) : null;
                const isExemptFromVerification = staffSnap.exists() || (inviteSnap && inviteSnap.exists());
                
                if (!freshUser.emailVerified && !isExemptFromVerification) {
                    setShowVerificationPage(true);
                    setIsAuthLoading(false);
                    return;
                }
            }
            
            // Regular User Profile Loading
            const { isUser } = await loadUserProfile(user);

            // Handle new staff member creation from invite
            if (!isUser && user.email) {
                const inviteRef = doc(db, 'invites', user.email);
                const inviteSnap = await getDoc(inviteRef);

                if (inviteSnap.exists()) {
                    const invite = inviteSnap.data();
                    const staffDocRef = doc(db, 'staff', user.uid);
                    const staffData = {
                        restaurantId: invite.restaurantId,
                        role: invite.role,
                        email: user.email,
                        name: invite.name || user.displayName || user.email,
                    };
                    await setDoc(staffDocRef, staffData);
                    await deleteDoc(inviteRef);
                    await loadUserProfile(user); // Reload profile as they are now a user
                }
            }
        }
        setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (restaurantOwnerId) {
        const storesQuery = query(collection(db, "stores"), where("userId", "==", restaurantOwnerId));
        const unsubscribeStores = onSnapshot(storesQuery, (snapshot) => {
            setStores(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Store[]);
        });
        
        const menuItemsQuery = query(collection(db, 'menuItems'), where('userId', '==', restaurantOwnerId));
        const unsubMenuItems = onSnapshot(menuItemsQuery, (snapshot) => {
            setPosMenuItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem)));
        });

        const categoriesQuery = query(collection(db, 'categories'), where('userId', '==', restaurantOwnerId));
        const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
            const cats = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
            setPosCategories(cats.sort((a,b) => a.order - b.order));
        });
        
        const ingredientsQuery = query(collection(db, 'ingredients'), where('userId', '==', restaurantOwnerId));
        const unsubIngredients = onSnapshot(ingredientsQuery, (snapshot) => {
            setIngredients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ingredient)));
        });

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const ninetyDaysAgoTimestamp = Timestamp.fromDate(ninetyDaysAgo);
        const completedOrdersQuery = query(
            collection(db, "orders"),
            where("userId", "==", restaurantOwnerId),
            where("status", "==", "Completed"),
            where("createdAt", ">=", ninetyDaysAgoTimestamp),
            orderBy("createdAt", "desc")
        );
        const unsubOrders = onSnapshot(completedOrdersQuery, (snapshot) => {
            setCompletedOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
        });

        return () => {
            unsubscribeStores();
            unsubMenuItems();
            unsubCategories();
            unsubIngredients();
            unsubOrders();
        };
    } else {
        setStores([]);
        setPosMenuItems([]);
        setPosCategories([]);
        setIngredients([]);
        setCompletedOrders([]);
    }
  }, [restaurantOwnerId]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };
  
  const handleApproveToast = async (orderId: string) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status: 'New' });
    handleNewOrder();
  };

  const handleRejectToast = async (orderId: string) => {
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
  };

  const handleDismissToast = (orderId: string) => {
    setPendingOrderToasts(prev => prev.filter(t => t.id !== orderId));
  };

  const handleNavigateToOrders = () => {
    handleSetActivePage('Orders');
    setPendingOrderToasts([]); // Clear all toasts when navigating
  }


  const renderAdminPage = () => {
    if (!user || !restaurantOwnerId) return null;
    
    const pageProps = {
        userId: restaurantOwnerId,
        role: role
    };

    switch(activePage) {
      case 'Dashboard':
        return <Dashboard {...pageProps} stores={stores} />;
      case 'Menus':
        return <MenuPage {...pageProps} menuItems={posMenuItems} categories={posCategories} />;
      case 'Orders':
        return <OrdersPage {...pageProps} onNewOrder={handleNewOrder} profile={profile} stores={stores} />;
      case 'Floor Plan':
        return <FloorPlanPage {...pageProps} profile={profile} onTableOrder={(context) => setRapidOrderContext({ type: 'dine-in', ...context })} onTakeawayOrder={() => setRapidOrderContext({ type: 'takeaway' })} />;
      case 'Inventory':
        return <InventoryPage {...pageProps} ingredients={ingredients} />;
      case 'Stores':
        return <StoresPage {...pageProps} profile={profile} stores={stores} />;
      case 'Promotions':
        return <PromotionsPage {...pageProps} />;
      case 'Reports':
        return <ReportsPage {...pageProps} stores={stores} />;
      case 'Settings':
        return <SettingsPage userId={restaurantOwnerId} onProfileUpdate={setProfile} role={role} />;
      default:
        return <Dashboard {...pageProps} stores={stores} />;
    }
  }
  
  // Master Render Logic
  if (isAuthLoading) {
      return <div className="flex justify-center items-center h-screen bg-brand-gray-50 dark:bg-brand-gray-900"><LoadingSpinner /></div>;
  }
  
  if (view === 'customer' && customerParams) {
      return <CustomerMenuPage 
        restaurantId={customerParams.restaurantId} 
        storeId={customerParams.storeId}
        tableNumber={customerParams.tableNumber}
      />;
  }

  if (!user) {
    return <AuthPage />;
  }
  
  if (isSuperAdmin) {
    return <SuperAdminPage onLogout={handleLogout} />;
  }
  
  if (showVerificationPage) {
    return <EmailVerificationPage user={user} onLogout={handleLogout} />;
  }

  if (isAccountLocked) {
    return <AccountLockedPage onLogout={handleLogout} />;
  }

  if (profile?.onboardingCompleted) {
    return (
      <div className={`flex h-screen bg-brand-gray-50 dark:bg-brand-gray-900 text-brand-gray-800 dark:text-brand-gray-200`}>
        <Sidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          activePage={activePage}
          setActivePage={handleSetActivePage}
          onLogout={handleLogout}
          hasUnseenOrder={hasUnseenOrder}
          role={role}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {user && !user.emailVerified && profile?.onboardingCompleted && <EmailVerificationBanner user={user} />}
          <Header 
            isSidebarOpen={isSidebarOpen} 
            setIsSidebarOpen={setIsSidebarOpen} 
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            pageTitle={activePage}
            userId={restaurantOwnerId || ''}
            profile={profile}
            role={role}
            onNewPOSOrder={() => setRapidOrderContext({ type: 'takeaway' })}
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-gray-100 dark:bg-brand-gray-800 p-4 sm:p-6 lg:p-8">
            {renderAdminPage()}
          </main>
        </div>
        {isTourActive && role === 'admin' && (
          <Tour
            onComplete={handleCompleteTour}
            onNavigate={handleSetActivePage}
          />
        )}
        <ToastContainer 
            toasts={pendingOrderToasts}
            onDismiss={handleDismissToast}
            onApprove={handleApproveToast}
            onReject={handleRejectToast}
            onNavigateToOrders={handleNavigateToOrders}
        />
        {rapidOrderContext && restaurantOwnerId && (
            <RapidOrderModal
                restaurantId={restaurantOwnerId}
                context={rapidOrderContext}
                onClose={() => setRapidOrderContext(null)}
                menuItems={posMenuItems}
                categories={posCategories}
            />
        )}
        {restaurantOwnerId && profile && (
            <DigiMate
                userId={restaurantOwnerId}
                profile={profile}
                menuItems={posMenuItems}
                categories={posCategories}
                ingredients={ingredients}
                completedOrders={completedOrders}
            />
        )}
      </div>
    );
  }

  // If user is logged in, not locked, verified, but has no completed profile, show onboarding.
  return <OnboardingWizard user={user} onComplete={(newProfile) => {
      setProfile(newProfile);
      setRole('admin');
      setRestaurantOwnerId(user.uid);
      if (!newProfile.hasCompletedTour) {
          setTimeout(() => setIsTourActive(true), 500);
      }
  }} />;
};

export default App;