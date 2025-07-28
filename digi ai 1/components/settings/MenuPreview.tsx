import React from 'react';
import { RestaurantProfile, MenuAppearance, MenuItem } from '../../types';
import CustomerItemCard from '../customer/CustomerItemCard';
import CustomerItemRow from '../customer/CustomerItemRow';
import { useTranslation } from '../../contexts/LanguageContext';

interface MenuPreviewProps {
    profile: RestaurantProfile;
    appearance: MenuAppearance;
}

const sampleItems: MenuItem[] = [
    { id: '1', name: 'Gourmet Burger', category: 'Main Courses', price: 9.500, description: 'A juicy beef patty with fresh lettuce, tomato, and our secret sauce.', userId: '', isAvailable: true, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=300', order: 0 },
    { id: '2', name: 'Caesar Salad', category: 'Salads', price: 7.250, description: 'Crisp romaine lettuce, parmesan cheese, croutons, and Caesar dressing.', userId: '', isAvailable: true, imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=300', order: 0 },
    { id: '3', name: 'Iced Coffee', category: 'Drinks', price: 3.500, description: 'Chilled coffee served over ice, perfect for a warm day.', userId: '', isAvailable: false, imageUrl: 'https://images.unsplash.com/photo-1563805352521-d7c713331564?q=80&w=300', order: 0 },
];
const sampleCategories = [{id: 'c1', name: 'Main Courses'}, {id: 'c2', name: 'Salads'}, {id: 'c3', name: 'Drinks'}];

const MenuPreview: React.FC<MenuPreviewProps> = ({ profile, appearance }) => {
    const { t } = useTranslation();

    const fontClass = `font-${appearance.fontTheme}`;
    const backgroundClass = appearance.backgroundStyle === 'solid' ? 'customer-bg' : `bg-${appearance.backgroundStyle}`;
    const mainClasses = `${backgroundClass} customer-text`;

    const style = {
        '--customer-bg-color': appearance.backgroundColor,
        '--customer-text-color': appearance.textColor,
        '--brand-color-customer': appearance.brandColor,
    } as React.CSSProperties;

    const renderItems = (items: MenuItem[]) => {
        switch (appearance.layout) {
            case 'grid':
                return (
                    <div className="grid grid-cols-1 gap-4 p-4">
                        {items.map(item => <CustomerItemCard key={item.id} item={item} onSelectItem={() => {}} promotion={null} enableItemAnimations={appearance.enableItemAnimations} />)}
                    </div>
                );
            case 'list':
            case 'elegant':
                const layoutClasses = appearance.layout === 'elegant' ? 'max-w-md mx-auto' : '';
                return (
                    <div className={`space-y-3 p-4 ${layoutClasses}`}>
                        {items.map(item => <CustomerItemRow key={item.id} item={item} onSelectItem={() => {}} promotion={null} enableItemAnimations={appearance.enableItemAnimations} />)}
                    </div>
                );
        }
    }

    return (
        <div className={`w-full h-full overflow-y-auto ${fontClass} ${mainClasses}`} style={style}>
            <header className="relative">
                {appearance.headerBannerUrl ? (
                    <div className="parallax-container">
                        <div className="parallax-bg" style={{ backgroundImage: `url(${appearance.headerBannerUrl})` }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    </div>
                ) : (
                    <div className="h-24"></div> // Spacer if no banner
                )}
                <div className="p-4 absolute bottom-0 left-0 w-full">
                     <div className="flex items-center space-x-3">
                        {profile?.logoUrl && <img src={profile.logoUrl} alt="Logo" className="h-16 w-16 object-cover rounded-full shadow-md border-2 border-white" />}
                        <div>
                            <h1 className="text-3xl font-bold text-white drop-shadow-md">{profile?.name}</h1>
                        </div>
                    </div>
                </div>
            </header>
            
            <div className="sticky top-0 bg-white/80 dark:bg-brand-gray-900/80 backdrop-blur-sm z-10 shadow-sm overflow-hidden">
                <div className="px-4">
                    <div className="flex space-x-2 overflow-x-auto py-2">
                        {sampleCategories.map(category => (
                            <button key={category.id} className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-700 dark:text-brand-gray-200 first:bg-brand-customer first:text-white">
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main>
                {sampleCategories.map(cat => (
                    <section key={cat.id} className="mb-6">
                        <h2 className={`text-xl font-bold p-4 pb-2 ${appearance.layout === 'elegant' ? 'text-center' : ''}`}>{cat.name}</h2>
                        {renderItems(sampleItems.filter(i => i.category === cat.name))}
                    </section>
                ))}
            </main>
        </div>
    );
};

export default MenuPreview;