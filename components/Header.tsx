import React from 'react';
import { MenuBurgerIcon, SunIcon, MoonIcon, EyeIcon, PrintIcon } from './icons';
import { RestaurantProfile, Role } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { Page } from '../App';

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  pageTitle: Page;
  userId: string;
  profile: RestaurantProfile | null;
  role: Role | null;
  onNewPOSOrder: () => void;
}

const Header: React.FC<HeaderProps> = ({ setIsSidebarOpen, isDarkMode, toggleDarkMode, pageTitle, userId, profile, role, onNewPOSOrder }) => {
  const { t } = useTranslation();
  
  const welcomeMessage: { [key in Page]?: string } = {
    Dashboard: t('header_welcome_dashboard'),
    Menus: t('header_welcome_menus'),
    Orders: t('header_welcome_orders'),
    Stores: t('header_welcome_stores'),
    Settings: t('header_welcome_settings'),
    Reports: t('header_welcome_reports'),
    Promotions: t('header_welcome_promotions'),
    'Floor Plan': t('header_welcome_floor_plan'),
    Inventory: t('header_welcome_inventory'),
  }

  const pageTitleTranslations: { [key in Page]?: string } = {
    Dashboard: t('header_title_dashboard'),
    Menus: t('header_title_menus'),
    Orders: t('header_title_orders'),
    Stores: t('header_title_stores'),
    Settings: t('header_title_settings'),
    'Floor Plan': t('header_title_floor_plan'),
    Reports: t('header_title_reports'),
    Promotions: t('header_title_promotions'),
    Inventory: t('header_title_inventory'),
  }
  
  const handlePreviewClick = () => {
    window.open(`/?view=customer&restaurantId=${userId}`, '_blank');
  }

  const defaultAvatar = 'https://placehold.co/100x100/1f2937/374151?text=AV';
  
  const roleDisplay: Record<string, string> = {
      admin: t('role_admin'),
      manager: t('role_manager'),
      front_of_house: t('role_front_of_house'),
      kitchen_staff: t('role_kitchen_staff'),
  }
  
  const canPlaceOrders = role === 'admin' || role === 'manager' || role === 'front_of_house';

  return (
    <header className="h-16 bg-white dark:bg-brand-gray-900 border-b border-brand-gray-200 dark:border-brand-gray-700 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0">
      <div className="flex items-center">
        <button onClick={() => setIsSidebarOpen(open => !open)} className="text-brand-gray-500 dark:text-brand-gray-400 me-2 sm:me-4">
            <MenuBurgerIcon className="w-5 h-5 sm:w-6 sm:h-6"/>
        </button>
        <div>
            <h2 className="text-lg font-bold text-brand-gray-800 dark:text-white">{pageTitleTranslations[pageTitle] || pageTitle}</h2>
            <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 hidden lg:block">{welcomeMessage[pageTitle] || ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <LanguageSwitcher />
        <div className="bg-brand-gray-100 dark:bg-brand-gray-800 p-1 rounded-full flex items-center">
            <button onClick={toggleDarkMode} className={`p-1 rounded-full transition-colors ${!isDarkMode ? 'bg-white shadow' : 'text-brand-gray-400'}`}>
                <SunIcon className="w-5 h-5"/>
            </button>
            <button onClick={toggleDarkMode} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'bg-brand-gray-700 text-white shadow' : 'text-brand-gray-400'}`}>
                <MoonIcon className="w-5 h-5"/>
            </button>
        </div>
        
        {canPlaceOrders && (
             <button
                onClick={onNewPOSOrder}
                title={t('header_pos_button')}
                className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg text-sm"
            >
                {t('header_pos_button')}
            </button>
        )}

        <a 
          href={`/?view=customer&restaurantId=${userId}`} 
          target="_blank" 
          rel="noopener noreferrer"
          data-tour-id="header-open-app-btn"
          className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg text-sm"
        >
            {t('header_open_app')}
        </a>
        <div className="text-end hidden sm:block">
            <p className="font-semibold text-sm text-brand-gray-800 dark:text-brand-gray-200">{profile?.name}</p>
            <p className="text-xs text-brand-teal font-bold uppercase tracking-wider">{role && roleDisplay[role]}</p>
        </div>
        <img src={profile?.avatarUrl || defaultAvatar} alt="User Avatar" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
      </div>
    </header>
  );
};

export default Header;