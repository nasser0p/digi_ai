import React, { useState, useRef, useEffect } from 'react';
import { User } from '@firebase/auth';
import { doc, setDoc, writeBatch, collection, Timestamp } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { RestaurantProfile, Category, MenuItem } from '../types';
import { getSampleCategories, getSampleMenuItems } from './FirebaseSeed';
import { CheckCircleIcon, ChevronRightIcon, XIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';

interface OnboardingWizardProps {
    user: User;
    onComplete: (profile: RestaurantProfile) => void;
}

const RESTAURANT_TYPES = ['Restaurant', 'Cafe', 'Hotel', 'Bakery', 'Bar', 'Fast Food'];
const CURRENCIES = {
    'OMR': 'Omani Rial (OMR)',
    'USD': 'United States Dollar ($)',
    'EUR': 'Euro (€)',
    'GBP': 'British Pound (£)',
};
const LANGUAGES = ['English', 'Arabic', 'Spanish', 'French', 'German', 'Italian'];

const Stepper = ({ currentStep }: { currentStep: number }) => {
    const { t } = useTranslation();
    const steps = [t('onboarding_step_profile'), t('onboarding_step_business'), t('onboarding_step_menu')];
    
    return (
        <div className="flex items-center justify-center w-full max-w-md mx-auto mb-12">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep === stepNumber;
                const isComplete = currentStep > stepNumber;

                return (
                    <React.Fragment key={step}>
                        <div className="flex flex-col items-center text-center">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${isComplete ? 'bg-brand-teal text-white' : isActive ? 'bg-brand-teal text-white ring-4 ring-brand-teal/30' : 'bg-gray-200 text-gray-400'}`}>
                                {isComplete ? <CheckCircleIcon className="w-6 h-6" /> : stepNumber}
                            </div>
                            <p className={`mt-2 text-sm font-semibold transition-colors ${isActive || isComplete ? 'text-brand-teal' : 'text-gray-400'}`}>{step}</p>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-1 mx-4 transition-colors duration-300 ${isComplete ? 'bg-brand-teal' : 'bg-gray-200'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const LanguageSelect = ({ selected, onToggle }: { selected: string[], onToggle: (lang: string) => void}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);

    return (
        <div className="relative" ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm min-h-[42px] p-2 flex items-center flex-wrap gap-2 cursor-pointer"
            >
                {selected.length === 0 && <span className="text-gray-400">{t('onboarding_business_languages_placeholder')}</span>}
                {selected.map(lang => (
                    <span key={lang} className="bg-brand-teal/20 text-brand-teal font-semibold text-sm px-2 py-1 rounded-md flex items-center gap-2">
                        {lang}
                        <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(lang); }} className="text-brand-teal hover:bg-brand-teal/20 rounded-full">
                            <XIcon className="w-3 h-3"/>
                        </button>
                    </span>
                ))}
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 z-10 max-h-60 overflow-y-auto">
                    {LANGUAGES.map(lang => (
                        <div 
                            key={lang}
                            onClick={() => { onToggle(lang); }}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${selected.includes(lang) ? 'font-bold bg-brand-teal/10' : ''}`}
                        >
                            {lang}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, onComplete }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        restaurantName: '',
        phoneNumber: '',
        restaurantType: '',
        currency: 'OMR',
        languages: ['English'],
        address: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    }
    
    const handleLanguageToggle = (lang: string) => {
        setFormData(prev => {
            const newLangs = prev.languages.includes(lang) 
                ? prev.languages.filter(l => l !== lang)
                : [...prev.languages, lang];
            return { ...prev, languages: newLangs };
        });
    }

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);
    
    const handleFinish = async (seedData: boolean) => {
        setLoading(true);
        const profileData: Omit<RestaurantProfile, 'id'> = {
            name: formData.restaurantName,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            restaurantType: formData.restaurantType,
            currency: formData.currency,
            languages: formData.languages,
            email: user.email || '',
            logoUrl: '', // Default empty, can be set in settings
            avatarUrl: user.photoURL || '',
            onboardingCompleted: true,
            hasCompletedTour: false,
            isLiveTrackingEnabled: true,
            isLocked: false,
            createdAt: Timestamp.now(),
            menuAppearance: {
                layout: 'grid',
                fontTheme: 'modern',
                brandColor: '#28a7a1',
                backgroundColor: '#f9fafb',
                textColor: '#1f2937',
                headerBannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop',
                backgroundStyle: 'solid',
                enableParallax: true,
                enableItemAnimations: true,
            }
        };

        try {
            const profileRef = doc(db, 'restaurantProfiles', user.uid);
            await setDoc(profileRef, profileData);

            if (seedData) {
                const batch = writeBatch(db);
                const categoriesCollection = collection(db, "categories");
                getSampleCategories(user.uid).forEach((category) => {
                    const docRef = doc(categoriesCollection);
                    batch.set(docRef, { ...category, id: docRef.id });
                });

                const menuItemsCollection = collection(db, "menuItems");
                getSampleMenuItems(user.uid).forEach((item) => {
                    const docRef = doc(menuItemsCollection); 
                    batch.set(docRef, { ...item, id: docRef.id });
                });
                await batch.commit();
            }

            onComplete({ ...profileData, id: user.uid });
        } catch (error) {
            console.error("Failed to complete onboarding:", error);
            alert(t('onboarding_error_alert'));
            setLoading(false);
        }
    };
    
    const renderStep = () => {
        switch(step) {
            case 1:
                return (
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('onboarding_welcome_title', user.displayName || 'Entrepreneur')}</h1>
                        <p className="text-lg text-gray-500 mb-8">{t('onboarding_welcome_desc')}</p>
                        <button onClick={handleNext} className="bg-brand-teal text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-brand-teal-dark transition-colors">
                            {t('onboarding_welcome_button')}
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div>
                        <div className="text-center mb-8">
                             <h2 className="text-2xl font-bold text-gray-800">{t('onboarding_business_title')}</h2>
                             <p className="text-md text-gray-500">{t('onboarding_business_desc')}</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700">{t('onboarding_business_name_label')}</label>
                                <input type="text" name="restaurantName" id="restaurantName" value={formData.restaurantName} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                            </div>
                            <div>
                                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">{t('onboarding_business_phone_label')}</label>
                                <input type="tel" name="phoneNumber" id="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="restaurantType" className="block text-sm font-medium text-gray-700">{t('onboarding_business_type_label')}</label>
                                    <select name="restaurantType" id="restaurantType" value={formData.restaurantType} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal">
                                        <option value="" disabled>{t('onboarding_business_type_placeholder')}</option>
                                        {RESTAURANT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                                 <div>
                                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700">{t('onboarding_business_currency_label')}</label>
                                    <select name="currency" id="currency" value={formData.currency} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal">
                                         {Object.entries(CURRENCIES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="languages" className="block text-sm font-medium text-gray-700">{t('onboarding_business_languages_label')}</label>
                                <LanguageSelect selected={formData.languages} onToggle={handleLanguageToggle} />
                            </div>
                        </div>
                         <div className="flex justify-between mt-8">
                            <button type="button" onClick={handleBack} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">{t('common_back')}</button>
                            <button type="button" onClick={handleNext} disabled={!formData.restaurantName || !formData.phoneNumber || !formData.restaurantType || formData.languages.length === 0} className="bg-brand-teal text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-teal-dark disabled:bg-teal-300">{t('common_next')}</button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('onboarding_menu_title')}</h1>
                        <p className="text-lg text-gray-500 mb-8 max-w-lg mx-auto">{t('onboarding_menu_desc')}</p>
                        <div className="flex flex-col md:flex-row justify-center gap-4">
                            <button onClick={() => handleFinish(true)} disabled={loading} className="bg-brand-teal text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-brand-teal-dark transition-colors disabled:bg-teal-300">
                                {loading ? t('onboarding_menu_generating_button') : t('onboarding_menu_generate_button')}
                            </button>
                            <button onClick={() => handleFinish(false)} disabled={loading} className="bg-gray-200 text-gray-700 font-bold py-3 px-8 rounded-lg text-lg hover:bg-gray-300 transition-colors disabled:bg-gray-400">
                                {loading ? t('onboarding_menu_saving_button') : t('onboarding_menu_scratch_button')}
                            </button>
                        </div>
                        <div className="mt-8">
                             <button type="button" onClick={handleBack} className="text-gray-500 hover:text-gray-800 font-semibold">{t('common_back')}</button>
                        </div>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-3xl mx-auto mb-8">
                <Stepper currentStep={step} />
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl">
               {renderStep()}
            </div>
        </div>
    );
};

export default OnboardingWizard;