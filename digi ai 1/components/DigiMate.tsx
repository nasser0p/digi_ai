import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Timestamp, doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { RestaurantProfile, ChatMessage, MenuItem, Category, Ingredient, Order } from '../types';
import { ChatBubbleIcon, PaperAirplaneIcon, XIcon, SparklesIcon, LightBulbIcon, PencilSquareIcon } from './icons';

interface DigiMateProps {
    userId: string;
    profile: RestaurantProfile;
    menuItems: MenuItem[];
    categories: Category[];
    ingredients: Ingredient[];
    completedOrders: Order[];
}

const createAssistantContext = (profile: RestaurantProfile, menuItems: MenuItem[], categories: Category[], ingredients: Ingredient[], completedOrders: Order[]): string => {
    const context = {
        restaurantInfo: {
            name: profile.name,
            currency: profile.currency || 'OMR',
        },
        menu: {
            categories: categories.map(c => c.name),
            items: menuItems.map(item => ({
                name: item.name,
                category: item.category,
                price: item.price,
                isAvailable: item.isAvailable,
                hasDescription: !!item.description?.trim(),
                recipe: item.recipe?.map(r => ({ ingredientName: r.name, quantity: r.quantity, unit: r.unit })) || []
            })),
        },
        inventory: ingredients.map(i => ({
            name: i.name,
            unit: i.unit,
            cost: i.cost || 0,
        })),
        salesHistory: completedOrders.slice(0, 50).map(o => ({ // last 50 orders
            date: new Date(o.createdAt.seconds * 1000).toISOString().split('T')[0],
            total: o.total,
            items: o.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
        }))
    };
    return JSON.stringify(context, null, 2);
};

const getSystemInstruction = (assistantContext: string) => ({
    role: 'model',
    parts: [{
        text: `You are DigiMate, a friendly and expert AI assistant for DigiPlate, a restaurant management dashboard. Your goal is to be a strategic business partner. You have three main personas: Business Analyst, Expert Accountant, and Marketing Genius.

        **Core Instructions:**
        1.  **Be Friendly & Proactive:** Always be encouraging and use emojis. ✨
        2.  **Analyze & Answer:** Use the provided JSON data to answer questions with specific, actionable advice about THEIR restaurant.
        3.  **Concise & Clear:** Keep responses brief and use formatting like lists and bolding.
        4.  **No Hallucinations:** If the data isn't present, say you don't have that information. Do not make things up.
        5.  **Identify Persona from Prompt:** Infer the user's need (analysis, finance, marketing) from their question and respond in that persona.
        6.  **Do not mention you are a Google model.** You are DigiMate. Start the first message with a friendly welcome.

        ---

        **PROVIDED LIVE DATA:**
        Use this JSON data which represents the user's current restaurant information. This is your ONLY source of truth.
        \`\`\`json
        ${assistantContext}
        \`\`\`
        
        ---
        
        **PERSONA GUIDELINES:**

        **As an Expert Accountant:**
        -   When asked about **profitability** or **food cost**, you MUST use the \`inventory\` data to find ingredient \`cost\` and the \`recipe\` within each menu \`item\` to calculate the total cost of goods sold (COGS).
        -   **Profit Margin Formula:** ( (Menu Price - COGS) / Menu Price ) * 100
        -   Analyze the \`salesHistory\` for financial trends, revenue per day, etc.
        -   *Example Questions:* "What is my most profitable item?", "Calculate the food cost for my 'Gourmet Burger'."

        **As a Marketing Genius:**
        -   Analyze \`salesHistory\` to identify **popular items** (high quantity sold) and items **frequently bought together**.
        -   Use these insights to suggest **promotions, combo deals, or upsells**.
        -   Write creative copy for social media posts, menu descriptions, or marketing campaigns based on their actual menu items.
        -   *Example Questions:* "Suggest a combo deal.", "Write an Instagram post about my most popular dish."

        **As a Business Analyst:**
        -   Answer general questions about the menu, like price comparisons, item availability, or category contents, using the \`menu\` data.
        -   This is your default persona for general queries.
        -   *Example Questions:* "Which of my items is the most expensive?", "List all my drinks."`
    }]
});

const DigiMate: React.FC<DigiMateProps> = ({ userId, profile, menuItems, categories, ingredients, completedOrders }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [proactivePrompts, setProactivePrompts] = useState<{ text: string; icon: React.FC<any>; }[]>([]);

    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (profile && menuItems.length > 0 && categories.length > 0) {
            try {
                const assistantContext = createAssistantContext(profile, menuItems, categories, ingredients, completedOrders);
                const instruction = getSystemInstruction(assistantContext);
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    history: [instruction]
                });
                setMessages([]);
                setConversationId(null);
                setInputValue('');
            } catch (error) {
                console.error("Failed to initialize or reset Gemini chat session:", error);
            }
        }
    }, [userId, profile, menuItems, categories, ingredients, completedOrders]);

     useEffect(() => {
        const generatePrompts = () => {
            if (!menuItems || menuItems.length === 0) {
                return [{ text: "How do I add my first menu item?", icon: ChatBubbleIcon }];
            }
            
            const potentialPrompts = [];
            const usedItemNames = new Set<string>();

            const unavailableItem = menuItems.find(item => !item.isAvailable);
            if (unavailableItem) {
                potentialPrompts.push({ text: `Help me with my unavailable item: "${unavailableItem.name}".`, icon: LightBulbIcon });
                usedItemNames.add(unavailableItem.name);
            }

            const itemWithoutDesc = menuItems.find(item => !item.description?.trim() && !usedItemNames.has(item.name));
            if (itemWithoutDesc) {
                potentialPrompts.push({ text: `Write an enticing description for "${itemWithoutDesc.name}".`, icon: PencilSquareIcon });
                usedItemNames.add(itemWithoutDesc.name);
            }

            const staticPrompts = [
                { text: `What's my most profitable menu item?`, icon: LightBulbIcon },
                { text: `Write an Instagram post for my most popular dish.`, icon: PencilSquareIcon },
                { text: `Suggest a combo deal for items that are frequently bought together.`, icon: LightBulbIcon },
                { text: `Which category generated the most revenue in the last 90 days?`, icon: ChatBubbleIcon },
                { text: `Which of my items is the most expensive?`, icon: ChatBubbleIcon },
            ];

            while (potentialPrompts.length < 3 && staticPrompts.length > 0) {
                potentialPrompts.push(staticPrompts.shift()!);
            }
            return potentialPrompts.slice(0, 3);
        };
        setProactivePrompts(generatePrompts());
    }, [menuItems, categories]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            parts: [{ text }],
            timestamp: Timestamp.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        let currentConvId = conversationId;

        try {
            if (!currentConvId) {
                const newConvRef = doc(collection(db, 'digimate_conversations'));
                currentConvId = newConvRef.id;
                setConversationId(currentConvId);
                await setDoc(newConvRef, {
                    id: newConvRef.id,
                    userId,
                    restaurantName: profile.name,
                    createdAt: Timestamp.now(),
                    messages: [userMessage],
                });
            }

            if (!chatRef.current) throw new Error("Chat not initialized");
            const response = await chatRef.current.sendMessage({ message: text });
            const modelMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: response.text ?? '' }],
                timestamp: Timestamp.now(),
            };

            setMessages(prev => [...prev, modelMessage]);

            if (currentConvId) {
                const convRef = doc(db, 'digimate_conversations', currentConvId);
                await updateDoc(convRef, { messages: [...messages, userMessage, modelMessage] });
            }

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: "Sorry, I'm having trouble connecting right now. Please try again later." }],
                timestamp: Timestamp.now(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitialButtonClick = (text: string) => {
        handleSendMessage(text);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(inputValue);
        setInputValue('');
    };
    
    const renderMessage = (msg: ChatMessage, index: number) => {
        const isUser = msg.role === 'user';
        return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isUser ? 'bg-brand-teal text-white rounded-br-lg' : 'bg-brand-gray-200 dark:bg-brand-gray-700 text-brand-gray-800 dark:text-brand-gray-200 rounded-bl-lg'}`}>
                    <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.parts[0].text}</p>
                </div>
            </div>
        );
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-brand-teal text-white rounded-full shadow-lg hover:bg-brand-teal-dark transition-transform hover:scale-110 flex items-center justify-center"
                aria-label="Open DigiMate Assistant"
            >
                <SparklesIcon className="w-8 h-8" />
            </button>

            {isOpen && (
                 <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/30" onClick={() => setIsOpen(false)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        className="flex flex-col w-full h-full sm:w-[440px] sm:h-[700px] bg-white dark:bg-brand-gray-900 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-brand-gray-50 dark:bg-brand-gray-800 border-b border-brand-gray-200 dark:border-brand-gray-700">
                           <div className="flex items-center gap-2">
                                <SparklesIcon className="w-6 h-6 text-brand-teal"/>
                                <h2 className="font-bold text-lg text-brand-gray-800 dark:text-white">DigiMate Assistant</h2>
                           </div>
                           <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-brand-gray-400 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-600">
                                <XIcon className="w-5 h-5"/>
                           </button>
                        </header>
                        
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 && (
                                <div className="p-4 space-y-4">
                                     <p className="text-sm text-center text-brand-gray-500">Hi! I'm DigiMate. Here are some things I can help with:</p>
                                     <div className="space-y-2">
                                        {proactivePrompts.map((prompt, i) => (
                                            <button key={i} onClick={() => handleInitialButtonClick(prompt.text)} className="w-full text-left p-3 rounded-lg bg-brand-gray-100 dark:bg-brand-gray-800 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700 text-sm font-semibold flex items-center gap-3">
                                                <prompt.icon className="w-5 h-5 text-brand-gray-500 flex-shrink-0" />
                                                <span>{prompt.text}</span>
                                            </button>
                                        ))}
                                     </div>
                                </div>
                            )}
                            {messages.map(renderMessage)}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="p-3 rounded-2xl rounded-bl-lg bg-brand-gray-200 dark:bg-brand-gray-700">
                                       <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-brand-gray-400 rounded-full animate-pulse"></div>
                                            <div className="w-2 h-2 bg-brand-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                            <div className="w-2 h-2 bg-brand-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                       </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-brand-gray-200 dark:border-brand-gray-700">
                             <div className="flex items-center gap-2">
                                 <input
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-grow p-2 text-sm bg-white dark:bg-brand-gray-800 border border-brand-gray-300 dark:border-brand-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal"
                                    disabled={isLoading}
                                />
                                <button type="submit" disabled={isLoading || !inputValue.trim()} className="p-2 bg-brand-teal text-white rounded-lg disabled:bg-teal-300 dark:disabled:bg-brand-gray-600">
                                    <PaperAirplaneIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default DigiMate;