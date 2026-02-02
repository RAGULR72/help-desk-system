import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSend, FiZap, FiCheckCircle, FiPlus, FiMic, FiImage, FiCamera, FiTrash2, FiVolume2 } from 'react-icons/fi';
import api from '../../../api/axios';

const AiConciergeModal = ({ onClose, onProceedToTicket }) => {
    const [config, setConfig] = useState({ name: 'Proserve AI', enabled: true });
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [ticketData, setTicketData] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Multilingual Voice Support
    const recognitionRef = useRef(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get('/api/ai/concierge/config');
                setConfig(res.data);
                setMessages([
                    { role: 'assistant', content: `Hello! I'm <b>${res.data.name}</b>. I speak English, Tamil, Telugu, and Hindi. How can I help you today? You can also upload a photo of your issue!` }
                ]);
            } catch (err) {
                console.error("Failed to fetch concierge config", err);
                setMessages([
                    { role: 'assistant', content: "Hello! I'm your AI Support Assistant. I understand English, Tamil, Tanglish, and more. Describe your issue or upload a photo!" }
                ]);
            }
        };
        fetchConfig();

        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            // Trying to support multiple Indian languages
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(prev => prev + ' ' + transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            // Can try to auto-detect or default to user's locale
            setIsListening(true);
            recognitionRef.current?.start();
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if ((!input.trim() && !imagePreview) || isTyping) return;

        const userMsg = {
            role: 'user',
            content: input,
            image: imagePreview
        };
        setMessages(prev => [...prev, userMsg]);

        const currentInput = input;
        const currentImage = imagePreview;

        setInput('');
        setSelectedImage(null);
        setImagePreview(null);
        setIsTyping(true);

        try {
            const res = await api.post('/api/ai/concierge/chat', {
                message: currentInput,
                history: messages.map(m => ({ role: m.role, content: m.content })),
                image_data: currentImage
            });

            const assistantMsg = { role: 'assistant', content: res.data.message };
            setMessages(prev => [...prev, assistantMsg]);

            if (res.data.ticket_ready && res.data.ticket_data) {
                setTicketData(res.data.ticket_data);
            }
        } catch (err) {
            console.error("Concierge failed", err);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having a bit of trouble thinking right now. Should we just open a ticket?" }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[85vh]"
            >
                {/* Header */}
                <div className="p-8 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                            <FiZap size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">{config.name}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Multilingual & Visual Support Active</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-slate-50/30 dark:bg-slate-950/30">
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] flex flex-col gap-3`}>
                                {msg.image && (
                                    <div className="rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                                        <img src={msg.image} alt="User upload" className="max-w-full h-auto max-h-48 object-cover" />
                                    </div>
                                )}
                                <div className={`p-5 rounded-[2rem] text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10'
                                        : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 shadow-sm border border-gray-100 dark:border-slate-700'
                                    }`}>
                                    <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 flex gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Footer / Input */}
                <div className="p-8 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {imagePreview && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mb-4 relative inline-block"
                        >
                            <img src={imagePreview} className="w-24 h-24 object-cover rounded-2xl border-2 border-indigo-500 shadow-md" alt="Preview" />
                            <button
                                onClick={() => { setImagePreview(null); setSelectedImage(null); }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg"
                            >
                                <FiX size={14} />
                            </button>
                        </motion.div>
                    )}

                    {ticketData ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-indigo-50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6"
                        >
                            <div className="space-y-1 flex-1">
                                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                    <FiCheckCircle /> Ticket Pre-drafted
                                </h3>
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {ticketData.subject}
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium italic">
                                    {ticketData.category} • {ticketData.priority} Priority
                                </p>
                            </div>
                            <button
                                onClick={() => onProceedToTicket(ticketData)}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                <FiPlus /> Finish Ticket Creation
                            </button>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSend} className="space-y-4">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={isListening ? "Listening..." : "Type in English, Tamil, Telugu, Hindi..."}
                                    className={`w-full pl-8 pr-32 py-5 bg-gray-50 dark:bg-slate-800 border-none rounded-[2rem] text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white ${isListening ? 'animate-pulse ring-2 ring-rose-500/20' : ''}`}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-10 h-10 text-gray-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all"
                                    >
                                        <FiImage size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700'}`}
                                    >
                                        <FiMic size={18} className={isListening ? 'animate-bounce' : ''} />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={(!input.trim() && !imagePreview) || isTyping}
                                        className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <FiSend size={18} />
                                    </button>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                />
                            </div>
                        </form>
                    )}
                    <div className="mt-4 flex items-center justify-center gap-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            Visual AI & Voice Engine Ready
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AiConciergeModal;
