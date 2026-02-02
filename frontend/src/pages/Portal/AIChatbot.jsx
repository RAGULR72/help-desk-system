import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChatBubbleLeftRightIcon,
    XMarkIcon,
    PaperAirplaneIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = 'http://localhost:8000';

const AIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hi! I'm your Proserve AI assistant. How can I help you today?", isBot: true }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || isLoading) return;

        const userMsg = { text: inputText, isBot: false };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            const res = await axios.post(`${API_BASE_URL}/api/portal/chat`, {
                message: inputText
            });
            setMessages(prev => [...prev, { text: res.data.reply, isBot: true }]);
        } catch (err) {
            setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting. Please try again later.", isBot: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[100] hover:bg-indigo-700 transition-colors"
            >
                {isOpen ? <XMarkIcon className="w-8 h-8" /> : <ChatBubbleLeftRightIcon className="w-8 h-8" />}
                {!isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute right-20 bg-white text-slate-800 px-4 py-2 rounded-xl shadow-xl text-sm font-bold border border-slate-100 whitespace-nowrap hidden md:block"
                    >
                        Need help? Ask AI
                    </motion.div>
                )}
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9, originY: 1 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-28 right-8 w-[90vw] md:w-96 h-[600px] bg-white rounded-3xl shadow-2xl z-[100] border border-slate-200 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    <SparklesIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold">Proserve AI</h3>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-100">Online</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="hover:bg-white/10 p-2 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: msg.isBot ? -10 : 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={idx}
                                    className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.isBot
                                            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                                            : 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none flex space-x-1">
                                        <div className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce delay-75" />
                                        <div className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce delay-150" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-slate-100">
                            <form onSubmit={handleSend} className="relative">
                                <input
                                    type="text"
                                    placeholder="Ask a question..."
                                    className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-50 border-slate-100 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                            </form>
                            <p className="text-[10px] text-slate-400 text-center mt-3 font-medium uppercase tracking-widest">
                                Powered by Proserve Intelligence
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AIChatbot;
