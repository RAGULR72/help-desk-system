import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100000] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.95, filter: 'blur(5px)', transition: { duration: 0.2 } }}
                            className="group px-5 py-3.5 rounded-2xl bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex items-center gap-4 backdrop-blur-2xl pointer-events-auto min-w-[320px] max-w-md relative overflow-hidden"
                        >
                            {/* Decorative edge glow */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />

                            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${toast.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                <div className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`} />
                            </div>

                            <div className="flex-1">
                                <p className="text-[13px] font-semibold text-white tracking-wide">
                                    {toast.message}
                                </p>
                            </div>

                            {/* Toast progress bar */}
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 3, ease: "linear" }}
                                className={`absolute bottom-0 left-0 h-0.5 ${toast.type === 'error' ? 'bg-red-500/30' : 'bg-emerald-500/30'}`}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
