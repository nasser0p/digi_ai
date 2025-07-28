import React, { useState, useMemo } from 'react';
import { NavItemType, Role } from '../types';
import { Page } from '../App';
import {
  DashboardIcon,
  MenuIcon,
  OrdersIcon,
  StoreIcon,
  SettingsIcon,
  ChevronDownIcon,
  LogoutIcon,
  BoxIcon,
  LayoutIcon,
  ReceiptIcon,
  MegaphoneIcon,
} from './icons';
import { useTranslation } from '../contexts/LanguageContext';


interface SidebarProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activePage: Page;
  setActivePage: (page: Page) => void;
  onLogout: () => void;
  hasUnseenOrder: boolean;
  role: Role | null;
}

const NavItem: React.FC<{ item: NavItemType, isActive: boolean, onClick: () => void, showNotification: boolean }> = ({ item, isActive, onClick, showNotification }) => {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const hasSubItems = item.subItems && item.subItems.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasSubItems) {
      setIsSubMenuOpen(!isSubMenuOpen);
    } else {
      onClick();
    }
  }

  return (
    <li>
      <a
        href={item.path}
        onClick={handleClick}
        className={`relative flex items-center justify-between py-2 px-4 rounded-md text-sm font-medium transition-colors duration-150 ${
          isActive
            ? 'bg-brand-teal text-white shadow-md'
            : 'text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700'
        }`}
      >
        <div className="flex items-center">
          <item.icon className="w-5 h-5 me-3" />
          <span>{item.name}</span>
          {showNotification && (
            <span className="absolute start-1 top-1/2 -translate-y-1/2 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </div>
        {hasSubItems && (
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform duration-200 ${
              isSubMenuOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </a>
      {hasSubItems && isSubMenuOpen && (
        <ul className="ps-8 mt-2 space-y-2">
          {item.subItems?.map((subItem) => (
            <li key={subItem.name}>
              <a href={subItem.path} className="flex items-center text-sm text-brand-gray-500 dark:text-brand-gray-400 hover:text-brand-teal">
                {subItem.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activePage, setActivePage, onLogout, hasUnseenOrder, role }) => {
  const { t } = useTranslation();

  const allNavItems: NavItemType[] = useMemo(() => [
    { name: t('sidebar_dashboard'), icon: DashboardIcon, path: '#', pageName: 'Dashboard' },
    { name: t('sidebar_menus'), icon: MenuIcon, path: '#', pageName: 'Menus' },
    { name: t('sidebar_orders'), icon: OrdersIcon, path: '#', pageName: 'Orders' },
    { name: t('sidebar_floor_plan'), icon: LayoutIcon, path: '#', pageName: 'Floor Plan' },
    { name: t('sidebar_inventory'), icon: BoxIcon, path: '#', pageName: 'Inventory' },
    { name: t('sidebar_stores'), icon: StoreIcon, path: '#', pageName: 'Stores' },
    { name: t('sidebar_promotions'), icon: MegaphoneIcon, path: '#', pageName: 'Promotions' },
    { name: t('sidebar_reports'), icon: ReceiptIcon, path: '#', pageName: 'Reports' },
    { name: t('sidebar_settings'), icon: SettingsIcon, path: '#', pageName: 'Settings' },
  ], [t]);

  const navItems = useMemo(() => {
    if (!role) return [];
    
    // Define permissions for each role
    const permissions: Record<Role, Page[]> = {
      admin: ['Dashboard', 'Menus', 'Orders', 'Floor Plan', 'Inventory', 'Stores', 'Promotions', 'Reports', 'Settings'],
      manager: ['Dashboard', 'Menus', 'Orders', 'Floor Plan', 'Inventory', 'Stores', 'Promotions', 'Reports'],
      kitchen_staff: ['Orders', 'Inventory'],
      front_of_house: ['Orders', 'Floor Plan'],
    }

    const allowedPages = permissions[role] || [];
    return allNavItems.filter(item => item.pageName && allowedPages.includes(item.pageName));

  }, [role, allNavItems]);

  return (
    <aside className={`flex-shrink-0 bg-white dark:bg-brand-gray-900 border-e border-brand-gray-200 dark:border-brand-gray-700 flex flex-col transition-all duration-300 ${isOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="h-16 flex items-center justify-center border-b border-brand-gray-200 dark:border-brand-gray-700 flex-shrink-0 px-4">
            <h1 className="text-xl font-bold tracking-wider text-brand-teal">
              DIGI<span className="text-brand-gray-800 dark:text-white">PLATE</span>
            </h1>
        </div>
        <nav data-tour-id="sidebar-nav" className="flex-1 overflow-y-auto p-4 space-y-2">
            <ul>
                {navItems.map((item) => (
                  <NavItem 
                    key={item.name} 
                    item={item} 
                    isActive={activePage === item.pageName}
                    onClick={() => item.pageName && setActivePage(item.pageName)}
                    showNotification={hasUnseenOrder && item.pageName === 'Orders' && activePage !== 'Orders'}
                  />
                ))}
            </ul>
        </nav>
        <div className="p-4 border-t border-brand-gray-200 dark:border-brand-gray-700">
             <button
                onClick={onLogout}
                className="w-full flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors duration-150 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700"
            >
                <LogoutIcon className="w-5 h-5 me-3" />
                <span>{t('sidebar_logout')}</span>
            </button>
        </div>
    </aside>
  );
};

export default Sidebar;