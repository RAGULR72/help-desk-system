import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { translations } from '../translations';

const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
    const { user } = useAuth();
    const [language, setLanguage] = useState(user?.language || 'English (US)');

    useEffect(() => {
        if (user?.language) {
            setLanguage(user.language);
        }
    }, [user?.language]);

    const t = (path) => {
        const parts = path.split('.');
        let current = translations[language] || translations['English (US)'];
        for (const part of parts) {
            if (current && current[part]) {
                current = current[part];
            } else {
                // Fallback to English
                let english = translations['English (US)'];
                for (const p of parts) {
                    if (english[p]) {
                        english = english[p];
                    } else {
                        return p; // Return key if not found
                    }
                }
                return english;
            }
        }
        return current;
    };

    return (
        <TranslationContext.Provider value={{ t, language, setLanguage }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error('useTranslation must be used within a TranslationProvider');
    }
    return context;
};
