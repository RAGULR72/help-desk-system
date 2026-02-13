import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useTranslation } from '../context/TranslationContext';

const ResultModal = ({ isOpen, type, title, message, onClose }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const isSuccess = type === 'success';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl overflow-hidden border border-white/20"
                >
                    {/* Background blob for flair */}
                    <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl ${isSuccess ? 'bg-emerald-500/20' : 'bg-red-500/20'}`} />
                    <div className={`absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl ${isSuccess ? 'bg-emerald-500/20' : 'bg-red-500/20'}`} />

                    <div className="relative flex flex-col items-center text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg ${isSuccess ? 'bg-emerald-50 text-emerald-500 shadow-emerald-500/20' : 'bg-red-50 text-red-500 shadow-red-500/20'}`}>
                            {isSuccess ? <FiCheckCircle size={40} /> : <FiXCircle size={40} />}
                        </div>

                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                            {title}
                        </h3>

                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                            {message}
                        </p>

                        <button
                            onClick={onClose}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 ${isSuccess
                                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                                : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                }`}
                        >
                            {isSuccess ? t('result_modal.continue') : t('result_modal.try_again')}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ResultModal;
