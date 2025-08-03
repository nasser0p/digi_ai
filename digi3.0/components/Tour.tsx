import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Page } from '../App';
import { useTranslation } from '../contexts/LanguageContext';

interface TourStepData {
  selector?: string;
  titleKey: 'tour_step1_title' | 'tour_step2_title' | 'tour_step3_title' | 'tour_step4_title' | 'tour_step5_title' | 'tour_step6_title' | 'tour_step7_title' | 'tour_step8_title' | 'tour_step9_title' | 'tour_step10_title';
  contentKey: 'tour_step1_content' | 'tour_step2_content' | 'tour_step3_content' | 'tour_step4_content' | 'tour_step5_content' | 'tour_step6_content' | 'tour_step7_content' | 'tour_step8_content' | 'tour_step9_content' | 'tour_step10_content';
  page?: Page;
}

const tourSteps: TourStepData[] = [
    {
        titleKey: 'tour_step1_title',
        contentKey: 'tour_step1_content',
    },
    {
        selector: '[data-tour-id="sidebar-nav"]',
        titleKey: 'tour_step2_title',
        contentKey: 'tour_step2_content',
    },
    {
        page: 'Menus',
        selector: '[data-tour-id="menu-page-tabs"]',
        titleKey: 'tour_step3_title',
        contentKey: 'tour_step3_content',
    },
    {
        page: 'Menus',
        selector: '[data-tour-id="menus-add-item-btn"]',
        titleKey: 'tour_step4_title',
        contentKey: 'tour_step4_content',
    },
    {
        page: 'Stores',
        selector: '[data-tour-id="stores-add-form"]',
        titleKey: 'tour_step5_title',
        contentKey: 'tour_step5_content',
    },
    {
        page: 'Stores',
        selector: '[data-tour-id="stores-list"]',
        titleKey: 'tour_step6_title',
        contentKey: 'tour_step6_content',
    },
    {
        page: 'Orders',
        selector: '[data-tour-id="orders-kanban"]',
        titleKey: 'tour_step7_title',
        contentKey: 'tour_step7_content',
    },
    {
        page: 'Settings',
        selector: '[data-tour-id="settings-branding"]',
        titleKey: 'tour_step8_title',
        contentKey: 'tour_step8_content',
    },
    {
        page: 'Settings',
        selector: '[data-tour-id="header-open-app-btn"]',
        titleKey: 'tour_step9_title',
        contentKey: 'tour_step9_content',
    },
    {
        titleKey: "tour_step10_title",
        contentKey: "tour_step10_content",
        page: 'Dashboard',
    },
];


const Tour: React.FC<{ onComplete: () => void, onNavigate: (page: Page) => void }> = ({ onComplete, onNavigate }) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const stepData = useMemo(() => tourSteps[currentStep], [currentStep]);

    const updateTarget = useCallback(() => {
        if (stepData?.selector) {
            const element = document.querySelector(stepData.selector);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Use timeout to wait for scroll to finish
                setTimeout(() => {
                    setTargetRect(element.getBoundingClientRect());
                }, 300);
            } else {
                setTargetRect(null); // No element to highlight
            }
        } else {
            setTargetRect(null); // It's a modal step
        }
    }, [stepData]);

    useEffect(() => {
        if (stepData?.page) {
            onNavigate(stepData.page);
        }
        // Give the page time to switch before finding the element
        const timer = setTimeout(updateTarget, 100);
        
        window.addEventListener('resize', updateTarget);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateTarget);
        };
    }, [currentStep, stepData, onNavigate, updateTarget]);

    const handleNext = () => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };
    
    const Tooltip = () => {
        const tooltipStyle: React.CSSProperties = {};
        if (targetRect) {
            tooltipStyle.position = 'absolute';
            tooltipStyle.left = targetRect.left + targetRect.width / 2;
            tooltipStyle.transform = 'translateX(-50%)';
            if (window.innerHeight - targetRect.bottom > 250) { // space below
                tooltipStyle.top = targetRect.bottom + 15;
            } else { // space above
                tooltipStyle.bottom = window.innerHeight - targetRect.top + 15;
            }
        } else { // Centered modal
            tooltipStyle.position = 'fixed';
            tooltipStyle.top = '50%';
            tooltipStyle.left = '50%';
            tooltipStyle.transform = 'translate(-50%, -50%)';
        }

        return (
            <div style={tooltipStyle} className="z-[1001] w-80 bg-brand-gray-800 text-white rounded-lg shadow-2xl p-6 transition-all duration-300 animate-fade-in">
                <h3 className="text-xl font-bold text-brand-teal mb-2">{t(stepData.titleKey)}</h3>
                <p className="text-brand-gray-300 mb-6">{t(stepData.contentKey)}</p>
                <div className="flex justify-between items-center">
                    <button onClick={onComplete} className="text-sm text-brand-gray-400 hover:text-white">{t('tour_skip_button')}</button>
                    <div className="flex items-center gap-3">
                         <span className="text-sm font-mono text-brand-gray-500">{currentStep + 1} / {tourSteps.length}</span>
                        {currentStep > 0 && <button onClick={handlePrev} className="font-semibold text-sm bg-brand-gray-600 hover:bg-brand-gray-500 px-4 py-2 rounded-md">{t('tour_prev_button')}</button>}
                        <button onClick={handleNext} className="font-semibold text-sm bg-brand-teal hover:bg-brand-teal-dark px-4 py-2 rounded-md">
                            {currentStep === tourSteps.length - 1 ? t('common_finish') : t('common_next')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const Highlight = () => {
        if (!targetRect) return null;
        return (
            <div
                className="fixed bg-transparent rounded-md transition-all duration-300"
                style={{
                    top: targetRect.top - 5,
                    left: targetRect.left - 5,
                    width: targetRect.width + 10,
                    height: targetRect.height + 10,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                    pointerEvents: 'none',
                }}
            />
        )
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000]">
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${!targetRect ? 'opacity-100' : 'opacity-0'}`}
                style={{ pointerEvents: !targetRect ? 'auto' : 'none' }}
            />
            <Highlight />
            <Tooltip />
        </div>,
        document.body
    );
};

export default Tour;
