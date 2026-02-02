import React, { useState, useEffect } from 'react';
import { FiZap, FiRefreshCw, FiCheck, FiX, FiMic } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';

const AIAssistantButton = ({
    text,
    onPolished,
    contextType = "general",
    additionalContext = "",
    className = ""
}) => {
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [polishedText, setPolishedText] = useState('');
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        // Initialize Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recog = new SpeechRecognition();
            recog.continuous = false;
            recog.interimResults = false;
            // Support multiple languages if possible, though Gemini handles the translation
            recog.lang = 'en-US';

            recog.onstart = () => setIsListening(true);
            recog.onend = () => setIsListening(false);

            recog.onresult = async (event) => {
                const transcript = event.results[0][0].transcript;
                console.log("Voice Captured:", transcript);
                await handlePolish(transcript);
            };

            recog.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                setIsListening(false);
            };

            setRecognition(recog);
        }
    }, [contextType, additionalContext]);

    const handlePolish = async (inputOverride = null) => {
        const textToPolish = inputOverride || text;
        if (!textToPolish?.trim()) return;

        setLoading(true);
        try {
            const response = await api.post('/api/ai/polish', {
                text: textToPolish,
                context_type: contextType,
                additional_context: additionalContext
            });
            setPolishedText(response.data.polished_text);
            setShowPreview(true);
        } catch (error) {
            console.error("AI Polish failed", error);
            alert("AI Assistant is currently unavailable.");
        } finally {
            setLoading(false);
        }
    };

    const toggleListening = () => {
        if (!recognition) {
            alert("Speech recognition is not supported in your browser. Please try Chrome or Edge.");
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

    const handleAccept = () => {
        onPolished(polishedText);
        setShowPreview(false);
    };

    return (
        <div className={`relative flex items-center gap-2 ${className}`}>
            <AnimatePresence>
                {isListening && (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-500/20"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                        Listening...
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100 dark:border-indigo-500/20 overflow-hidden shadow-sm">
                <button
                    type="button"
                    onClick={() => handlePolish()}
                    disabled={loading || !text?.trim() || isListening}
                    className="flex items-center gap-2 px-3 py-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 transition-all disabled:opacity-50 border-r border-indigo-100 dark:border-indigo-500/20 group"
                    title="AI Polish (Existing Text)"
                >
                    {loading ? (
                        <FiRefreshCw className="animate-spin" />
                    ) : (
                        <FiZap className="group-hover:scale-125 transition-transform" />
                    )}
                    AI Polish
                </button>

                <button
                    type="button"
                    onClick={toggleListening}
                    disabled={loading}
                    className={`px-3 py-1.5 transition-all group flex items-center gap-2 ${isListening ? 'bg-red-500 text-white' : 'text-indigo-600 dark:text-indigo-400 hover:bg-sky-100'}`}
                    title="Voice-to-Professional Note"
                >
                    <FiMic className={`${isListening ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Voice</span>
                </button>
            </div>

            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 bottom-full mb-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-indigo-100 dark:border-slate-800 p-4 z-[100]"
                    >
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-50 dark:border-slate-800">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI Professional Result</span>
                            <div className="flex gap-2">
                                <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600"><FiX size={14} /></button>
                            </div>
                        </div>

                        <div className="max-h-40 overflow-y-auto mb-4 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                            <p className="text-sm text-gray-700 dark:text-slate-300 font-medium leading-relaxed italic">
                                {polishedText}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleAccept}
                                className="flex-2 py-2 px-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                            >
                                <FiCheck /> Accept
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AIAssistantButton;
