import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FiGrid, FiUser, FiFileText, FiSettings, FiActivity, FiCalendar, FiMoon, FiSun } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const SettingsPage = () => {
    const { theme, toggleTheme, displaySize, updateDisplaySize } = useTheme();

    // Reusing the sidebar menu items logic
    const menuItems = [
        { icon: FiGrid, label: 'Dashboard', path: '/dashboard/admin' }, // Corrected path
        { icon: FiUser, label: 'User Profile', path: '/profile' },
        { icon: FiFileText, label: 'Documents', path: '#' },
        { icon: FiSettings, label: 'Setting', path: '/settings', active: true, badge: '1' },
        { icon: FiCalendar, label: 'Schedule', path: '#' },
        { icon: FiActivity, label: 'Activity', path: '/activity' },
    ];

    return (
        <div className={`min-h-screen flex transition-colors duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-[#0B1437] via-[#1a1f4f] to-[#0f1729]' : 'bg-gray-50'}`}>

            {/* Sidebar */}
            <div className={`w-64 fixed top-0 left-0 h-full flex flex-col z-20 border-r backdrop-blur-xl transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900/95 border-white/10' : 'bg-white border-gray-200'}`}>
                <div className={`h-20 flex items-center px-8 border-b transition-colors duration-300 ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                    <h1 className={`text-xl font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>PROSERVE</h1>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-4">
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            to={item.path}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${item.active
                                ? 'bg-blue-600/20 text-blue-400 font-medium border border-blue-500/30'
                                : theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={20} className={item.active ? 'text-blue-400' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                                <span>{item.label}</span>
                            </div>
                            {item.badge && (
                                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-8">
                <div className="max-w-4xl mx-auto">
                    <header className="mb-8">
                        <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Manage your application preferences and configuration.</p>
                    </header>

                    {/* Appearance Section */}
                    <div className={`backdrop-blur-xl border rounded-2xl p-8 mb-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Appearance
                        </h2>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Interface Theme</h3>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Select your preferred interface appearance.
                                </p>
                            </div>

                            <div className={`p-1 rounded-lg flex border ${theme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                                <button
                                    onClick={() => toggleTheme('light')}
                                    className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${theme === 'light'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    <FiSun size={16} />
                                    Light
                                </button>
                                <button
                                    onClick={() => toggleTheme('dark')}
                                    className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${theme === 'dark'
                                        ? 'bg-gray-700 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    <FiMoon size={16} />
                                    Dark
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Display Scaling Section */}
                    <div className={`backdrop-blur-xl border rounded-2xl p-8 mb-8 transition-colors duration-300 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Display Scaling
                        </h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="max-w-md">
                                    <h3 className={`font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>System Auto-Detection</h3>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Automatically detects your hardware (TV, PC, Mobile) to optimize the scaling for a native full-screen experience.
                                    </p>
                                </div>

                                <button
                                    onClick={() => updateDisplaySize('auto')}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${displaySize === 'auto'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : theme === 'dark' ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {displaySize === 'auto' ? 'Auto Enabled' : 'Enable Auto-Size'}
                                </button>
                            </div>

                            <div className={`p-1.5 rounded-xl flex border transition-all ${theme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                                {[
                                    { id: 'mobile', label: 'Mobile' },
                                    { id: 'tablet', label: 'iPad/Tablet' },
                                    { id: 'laptop', label: 'Laptop' },
                                    { id: 'desktop', label: 'Desktop/PC' },
                                    { id: 'tv', label: 'TV/4K' }
                                ].map((size) => (
                                    <button
                                        key={size.id}
                                        onClick={() => updateDisplaySize(size.id)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${displaySize === size.id
                                            ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                            : theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                    >
                                        {size.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
