
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { ChartBarIcon, CheckCircleIcon, ChevronRightIcon, QrCodeIcon, SmartphoneIcon, ZapIcon, PencilSquareIcon, SparklesIcon } from './components/icons';

// Custom hook for intersection observer
const useIntersectionObserver = (options: IntersectionObserverInit) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsIntersecting(true);
                observer.unobserve(entry.target);
            }
        }, options);

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [ref, options]);

    return [ref, isIntersecting] as const;
};


const LandingHeader = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-brand-gray-900/80 backdrop-blur-md shadow-md' : 'bg-transparent'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <a href="#" className="text-xl font-bold tracking-wider text-brand-teal">
                            DIGI<span className="text-brand-gray-800 dark:text-white">PLATE</span>
                        </a>
                    </div>
                    <div className="hidden md:flex items-center space-x-8">
                        <a href="#features" className="text-sm font-medium text-brand-gray-500 dark:text-brand-gray-300 hover:text-brand-teal">Features</a>
                        <a href="#how-it-works" className="text-sm font-medium text-brand-gray-500 dark:text-brand-gray-300 hover:text-brand-teal">How It Works</a>
                        <a href="#showcase" className="text-sm font-medium text-brand-gray-500 dark:text-brand-gray-300 hover:text-brand-teal">Platform</a>
                        <a href="#pricing" className="text-sm font-medium text-brand-gray-500 dark:text-brand-gray-300 hover:text-brand-teal">Pricing</a>
                        <a href="#faq" className="text-sm font-medium text-brand-gray-500 dark:text-brand-gray-300 hover:text-brand-teal">FAQ</a>
                    </div>
                    <div className="flex items-center space-x-2">
                        <a href="/index.html" className="text-sm font-medium text-brand-gray-500 dark:text-brand-gray-300 hover:text-brand-teal">Login</a>
                        <a href="/index.html" className="ml-4 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-brand-teal border border-transparent rounded-md shadow-sm hover:bg-brand-teal-dark">
                            Get Started
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
};

const AnimatedSection: React.FC<{children: React.ReactNode; className?: string, id?: string}> = ({ children, className, id }) => {
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 });
    return (
        <section ref={ref} id={id} className={`${className || ''} fade-in-up ${isVisible ? 'is-visible' : ''}`}>
            {children}
        </section>
    );
}

const HeroSection = () => (
    <section className="py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="text-center lg:text-left">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-brand-gray-900 dark:text-white tracking-tight">
                        Streamline Operations. Delight Customers.
                    </h1>
                    <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-lg text-brand-gray-500 dark:text-brand-gray-400">
                        DigiPlate is the all-in-one toolkit for modern restaurants. Manage your menu, track live orders, and gain valuable insights—all from a single, easy-to-use dashboard.
                    </p>
                    <div className="mt-8 flex justify-center lg:justify-start">
                        <a href="/index.html" className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-brand-teal border border-transparent rounded-md shadow-sm hover:bg-brand-teal-dark">
                            Get Started for Free
                        </a>
                    </div>
                </div>
                <div className="mt-12 lg:mt-0">
                    <div className="relative mx-auto max-w-full">
                        <div className="absolute -inset-8 bg-brand-teal/20 rounded-full blur-3xl opacity-60"></div>
                         <img
                            className="relative rounded-2xl shadow-2xl ring-1 ring-black/10"
                            src="https://placehold.co/1200x900/1f2937/374151?text=DigiPlate+Dashboard"
                            alt="DigiPlate App Dashboard"
                        />
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const features = [
    {
        name: 'Dynamic QR Codes',
        description: 'Generate and print beautiful, branded QR codes for each table or location.',
        icon: QrCodeIcon,
    },
    {
        name: 'Live Order Management',
        description: 'Manage incoming orders on a real-time, drag-and-drop Kanban board.',
        icon: ZapIcon,
    },
    {
        name: 'Customizable Digital Menus',
        description: 'Easily create and organize your menu with items, categories, and special modifiers.',
        icon: SmartphoneIcon,
    },
    {
        name: 'Insightful Dashboard',
        description: 'Track your revenue, top-selling items, and store performance at a glance.',
        icon: ChartBarIcon,
    },
];

const FeaturesSection = () => (
    <AnimatedSection id="features" className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-brand-gray-900 dark:text-white">Everything you need to succeed</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-gray-500 dark:text-brand-gray-400">
                    DigiPlate is packed with features to streamline your operations and boost your sales.
                </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                {features.map((feature) => (
                    <div key={feature.name} className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-brand-gray-50 dark:hover:bg-brand-gray-800/50 transition-colors">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-brand-teal text-white">
                            <feature.icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <h3 className="mt-5 text-lg font-medium text-brand-gray-900 dark:text-white">{feature.name}</h3>
                        <p className="mt-2 text-base text-brand-gray-500 dark:text-brand-gray-400">{feature.description}</p>
                    </div>
                ))}
            </div>
        </div>
    </AnimatedSection>
);

const howItWorksSteps = [
    {
      title: 'Create Your Menu',
      description: 'Use our simple editor to add categories and items. Upload photos and configure custom options to make your menu shine.',
      icon: PencilSquareIcon,
    },
    {
      title: 'Generate Your QR Code',
      description: 'Instantly create a unique, printable QR code for your restaurant. Customize it with your brand colors and logo for a professional touch.',
      icon: QrCodeIcon,
    },
    {
      title: 'Delight Your Customers',
      description: 'Place the QR code on your tables. Customers can scan, browse, and order seamlessly while you manage everything from your live dashboard.',
      icon: SparklesIcon,
    },
];

const HowItWorksSection = () => (
    <AnimatedSection id="how-it-works" className="py-20 sm:py-28 bg-brand-gray-50 dark:bg-brand-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-brand-gray-900 dark:text-white">
                    Go Live in Under 3 Minutes
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-gray-500 dark:text-brand-gray-400">
                    Our intuitive platform makes setup a breeze. Here’s how simple it is:
                </p>
            </div>
            <div className="mt-16">
                <div className="flex flex-col md:flex-row items-start justify-center gap-8 md:gap-4">
                    {howItWorksSteps.map((step, index) => (
                        <React.Fragment key={step.title}>
                            <div className="flex-1 flex flex-col items-center text-center">
                                <div className="flex items-center justify-center h-20 w-20 rounded-full bg-brand-teal text-white ring-8 ring-brand-gray-50 dark:ring-brand-gray-800 z-10">
                                    <step.icon className="h-10 w-10" aria-hidden="true" />
                                </div>
                                <h3 className="mt-6 text-xl font-bold text-brand-gray-900 dark:text-white">{step.title}</h3>
                                <p className="mt-2 text-sm text-brand-gray-400 font-bold uppercase tracking-wider">{`Step ${index + 1}`}</p>
                                <p className="mt-4 text-base text-brand-gray-500 dark:text-brand-gray-400">{step.description}</p>
                            </div>
                            {index < howItWorksSteps.length - 1 && (
                                <div className="flex-grow border-t-2 border-dashed border-brand-gray-300 dark:border-brand-gray-600 mt-10 w-3/4 md:w-auto md:flex-1 hidden md:block"></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    </AnimatedSection>
);

const PlatformShowcaseSection = () => (
    <AnimatedSection id="showcase" className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-brand-gray-900 dark:text-white">A Glimpse of the Platform</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-gray-500 dark:text-brand-gray-400">
                    Powerful features, beautifully designed. See how DigiPlate works.
                </p>
            </div>
            <div className="mt-16 space-y-16">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                    <div className="lg:w-1/2">
                         <img className="rounded-xl shadow-xl ring-1 ring-black/10" src="https://placehold.co/1024x768/111827/374151?text=Live+Order+Board" alt="Live Order Board" />
                    </div>
                    <div className="lg:w-1/2">
                        <h3 className="text-2xl font-bold text-brand-gray-900 dark:text-white">Real-time Order Board</h3>
                        <p className="mt-4 text-lg text-brand-gray-500 dark:text-brand-gray-400">
                            Watch new orders appear instantly. Drag and drop cards to update statuses from "New" to "In Progress" to "Ready," keeping your entire team in sync.
                        </p>
                    </div>
                </div>
                 <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16">
                    <div className="lg:w-1/2">
                         <img className="rounded-xl shadow-xl ring-1 ring-black/10" src="https://placehold.co/1024x768/111827/374151?text=Menu+Editor" alt="Menu Editor" />
                    </div>
                    <div className="lg:w-1/2">
                        <h3 className="text-2xl font-bold text-brand-gray-900 dark:text-white">Intuitive Menu Editor</h3>
                        <p className="mt-4 text-lg text-brand-gray-500 dark:text-brand-gray-400">
                            Build and manage your menu with ease. Add items, create categories, and configure complex modifiers with single or multiple selections.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </AnimatedSection>
);


const PricingSection = () => (
    <AnimatedSection id="pricing" className="py-20 sm:py-28 bg-brand-gray-50 dark:bg-brand-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-brand-gray-900 dark:text-white">Flexible pricing for any size</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-brand-gray-500 dark:text-brand-gray-400">
                    Fair, transparent pricing that scales with your business. No hidden fees.
                </p>
            </div>
            <div className="mt-16 max-w-lg mx-auto grid gap-8 lg:grid-cols-3 lg:max-w-5xl">
                {/* Solo Plan */}
                <div className="bg-white dark:bg-brand-gray-900 rounded-lg shadow-lg p-8 flex flex-col ring-1 ring-brand-gray-200 dark:ring-brand-gray-700">
                    <h3 className="text-2xl font-semibold text-brand-gray-900 dark:text-white">Solo</h3>
                    <p className="mt-4 text-brand-gray-500 dark:text-brand-gray-400">For single-location restaurants, cafes, and food trucks.</p>
                    <div className="mt-8">
                        <span className="text-4xl font-extrabold text-brand-gray-900 dark:text-white">25 OMR</span>
                        <span className="text-base font-medium text-brand-gray-500 dark:text-brand-gray-400">/mo</span>
                    </div>
                    <ul className="mt-8 space-y-4 flex-grow">
                        <li className="flex items-start">
                            <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400"><strong>1</strong> Store/Location</span>
                        </li>
                        <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Unlimited Menu Items & QR Codes</span>
                        </li>
                         <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Live Order Management</span>
                        </li>
                         <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Dashboard Analytics</span>
                        </li>
                         <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Standard Email Support</span>
                        </li>
                    </ul>
                     <a href="/index.html" className="mt-10 block w-full text-center px-6 py-3 text-base font-medium text-brand-teal border border-brand-teal rounded-md hover:bg-teal-50 dark:hover:bg-brand-teal/10">
                        Get Started with Solo
                    </a>
                </div>

                {/* Growth Plan (Highlighted) */}
                <div className="bg-white dark:bg-brand-gray-900 rounded-lg shadow-lg p-8 ring-2 ring-brand-teal relative flex flex-col">
                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold tracking-wider text-white bg-brand-teal">
                            MOST POPULAR
                        </span>
                    </div>
                    <h3 className="text-2xl font-semibold text-brand-gray-900 dark:text-white">Growth</h3>
                    <p className="mt-4 text-brand-gray-500 dark:text-brand-gray-400">For growing restaurants and small to medium chains.</p>
                     <div className="mt-8">
                        <span className="text-4xl font-extrabold text-brand-gray-900 dark:text-white">25 OMR</span>
                        <span className="text-base font-medium text-brand-gray-500 dark:text-brand-gray-400">/mo for first store</span>
                    </div>
                    <p className="mt-2 text-sm text-brand-gray-500 dark:text-brand-gray-400">then <strong className="text-brand-teal">10 OMR/mo</strong> for each additional store.</p>
                     <ul className="mt-8 space-y-4 flex-grow">
                        <li className="flex items-start">
                            <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Everything in <strong>Solo</strong>, plus:</span>
                        </li>
                        <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Multi-Store Management</span>
                        </li>
                         <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Per-Location Analytics</span>
                        </li>
                         <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Priority Support</span>
                        </li>
                    </ul>
                    <a href="/index.html" className="mt-10 block w-full text-center px-6 py-3 text-base font-medium text-white bg-brand-teal border border-transparent rounded-md shadow-sm hover:bg-brand-teal-dark">
                        Start Growing
                    </a>
                </div>

                {/* Enterprise Plan */}
                <div className="bg-white dark:bg-brand-gray-900 rounded-lg shadow-lg p-8 flex flex-col ring-1 ring-brand-gray-200 dark:ring-brand-gray-700">
                    <h3 className="text-2xl font-semibold text-brand-gray-900 dark:text-white">Enterprise</h3>
                    <p className="mt-4 text-brand-gray-500 dark:text-brand-gray-400">For large chains or franchises with specific needs.</p>
                    <div className="mt-8">
                        <span className="text-4xl font-extrabold text-brand-gray-900 dark:text-white">Custom</span>
                    </div>
                    <ul className="mt-8 space-y-4 flex-grow">
                        <li className="flex items-start">
                            <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Everything in <strong>Growth</strong>, plus:</span>
                        </li>
                        <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Dedicated Account Manager</span>
                        </li>
                         <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Custom Integrations</span>
                        </li>
                         <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Staff Training & Onboarding</span>
                        </li>
                         <li className="flex items-start">
                             <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
                            <span className="ml-3 text-brand-gray-500 dark:text-brand-gray-400">Service Level Agreements (SLAs)</span>
                        </li>
                    </ul>
                    <a href="/index.html" className="mt-10 block w-full text-center px-6 py-3 text-base font-medium text-brand-teal border border-brand-teal rounded-md hover:bg-teal-50 dark:hover:bg-brand-teal/10">
                        Contact Sales
                    </a>
                </div>
            </div>
        </div>
    </AnimatedSection>
);

const faqs = [
    {
        question: 'Is it hard to set up?',
        answer: "No! You can sign up and build your first menu in minutes. Our interface is designed to be intuitive and user-friendly, with no technical skills required.",
    },
    {
        question: 'Can I use my own logo and colors?',
        answer: 'Absolutely! DigiPlate allows you to upload your own logo and select a brand color to make your digital menu a perfect extension of your restaurant\'s brand.',
    },
    {
        question: 'What do my customers see?',
        answer: 'Your customers see a clean, mobile-friendly menu that is easy to navigate. They can browse items, customize their orders with modifiers, and add items to a cart for a seamless experience.',
    },
];

const FaqItem = ({ faq }: { faq: { question: string, answer: string } }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-t border-brand-gray-200 dark:border-brand-gray-700 pt-6">
            <dt>
                <button onClick={() => setIsOpen(!isOpen)} className="text-left w-full flex justify-between items-start text-brand-gray-400">
                    <span className="font-medium text-brand-gray-900 dark:text-white">{faq.question}</span>
                    <span className="ml-6 h-7 flex items-center">
                        <ChevronRightIcon className={`h-6 w-6 transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </span>
                </button>
            </dt>
            {isOpen && (
                <dd className="mt-2 pr-12">
                    <p className="text-base text-brand-gray-500 dark:text-brand-gray-400">{faq.answer}</p>
                </dd>
            )}
        </div>
    )
}

const FaqSection = () => (
    <AnimatedSection id="faq" className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-extrabold text-brand-gray-900 dark:text-white">Frequently asked questions</h2>
            </div>
            <dl className="mt-12 max-w-3xl mx-auto space-y-6">
                {faqs.map((faq) => <FaqItem key={faq.question} faq={faq} />)}
            </dl>
        </div>
    </AnimatedSection>
);


const Footer = () => (
    <footer className="bg-brand-gray-50 dark:bg-brand-gray-800">
        <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-base text-brand-gray-400">&copy; 2024 DigiPlate. All rights reserved.</p>
        </div>
    </footer>
);


const LandingPage = () => {
    return (
        <div className="bg-white dark:bg-brand-gray-900 text-brand-gray-800 dark:text-brand-gray-200">
            <LandingHeader />
            <main>
                <HeroSection />
                <FeaturesSection />
                <HowItWorksSection />
                <PlatformShowcaseSection />
                <PricingSection />
                <FaqSection />
            </main>
            <Footer />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>
);
