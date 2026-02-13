import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Check localStorage or default to 'light'
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const storedPrefs = window.localStorage.getItem('theme');
            if (typeof storedPrefs === 'string') {
                return storedPrefs;
            }
        }
        return 'theme-nature'; // Default to nature for the USER
    });

    const [displaySize, setDisplaySize] = useState(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem('displaySize') || 'auto';
        }
        return 'auto';
    });

    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
    };

    const updateDisplaySize = (size) => {
        setDisplaySize(size);
    };

    useEffect(() => {
        const root = window.document.documentElement;
        // Remove existing theme classes
        root.classList.remove('light', 'dark', 'theme-ocean', 'theme-nature', 'theme-sunset', 'theme-midnight');

        // Add the current theme class
        root.classList.add(theme);

        // Save to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;

        const handleAutoScaling = () => {
            if (displaySize === 'auto') {
                const width = window.innerWidth;
                const screenWidth = window.screen.width;

                // Detection logic for "System Display Size"
                let scaleFactor = 16;

                if (screenWidth >= 3840 || width >= 2560) {
                    // TV or 4K Monitor - Maximize for distance viewing
                    scaleFactor = 22;
                } else if (screenWidth >= 1920 || width >= 1600) {
                    // Large Desktop / PC - Full screen readability
                    scaleFactor = 18;
                } else if (screenWidth >= 1366 || width >= 1024) {
                    // Laptop / Small Desktop
                    scaleFactor = 15;
                } else if (screenWidth >= 768 || width >= 640) {
                    // iPads / Tablets
                    scaleFactor = 15;
                } else {
                    // Mobile
                    scaleFactor = 14;
                }

                root.style.fontSize = `${scaleFactor}px`;
            } else {
                // Apply manual overrides
                const sizes = {
                    mobile: '14px',
                    tablet: '15px',
                    laptop: '15.5px',
                    desktop: '16px',
                    tv: '22px'
                };
                root.style.fontSize = sizes[displaySize] || '16px';
            }
        };

        // Initialize classes
        const sizeClasses = ['size-auto', 'size-mobile', 'size-tablet', 'size-desktop', 'size-laptop', 'size-tv'];
        root.classList.remove(...sizeClasses);
        root.classList.add(`size-${displaySize}`);

        // Save to localStorage
        localStorage.setItem('displaySize', displaySize);

        handleAutoScaling();

        if (displaySize === 'auto') {
            window.addEventListener('resize', handleAutoScaling);
            return () => window.removeEventListener('resize', handleAutoScaling);
        }
    }, [displaySize]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, displaySize, updateDisplaySize }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
