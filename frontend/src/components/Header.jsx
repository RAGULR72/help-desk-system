import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiUser, FiLogOut, FiChevronDown, FiSettings, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { baseURL } from '../api/axios';
import NotificationCenter from '../notification_system/NotificationCenter';
import { useTheme } from '../context/ThemeContext';
import { FiSun, FiMoon, FiDroplet, FiStar } from 'react-icons/fi';

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [themeMenuOpen, setThemeMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const themes = [
        { id: 'light', name: 'Light', icon: <FiSun />, color: '#6366f1' },
        { id: 'dark', name: 'Dark', icon: <FiMoon />, color: '#1e293b' },
        { id: 'theme-ocean', name: 'Ocean', icon: <FiDroplet />, color: '#0284c7' },
        { id: 'theme-forest', name: 'Forest', icon: <FiStar />, color: '#16a34a' }
    ];

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: t('header.help_desk'), path: '/' },
        { name: t('nav.knowledge_base'), path: '/knowledge-base' },
        ...(user ? [
            // Dashboard is for everyone (user/admin/tech)
            { name: t('header.dashboard'), path: `/dashboard/${user.role || 'user'}` },
            // Travel Allowance is only for Technicians, Managers, and Admins
            ...(user.role !== 'user' ? [
                { name: 'Travel Allowance', path: '/travel-allowance' }
            ] : [])
        ] : []),
    ];

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-300 ${isScrolled ? 'glass-card shadow-2xl' : 'bg-transparent'}`}
        >
            {/* Self-Hosted Warning Banner */}
            <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2.5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%]" />
                <FiAlertTriangle className="text-white shrink-0 animate-pulse" size={14} />
                <p className="text-[10px] sm:text-xs font-bold tracking-wide text-center relative z-10">
                    ⚠️ This site is <span className="underline underline-offset-2">self-hosted for testing purposes only</span>.
                    <span className="hidden sm:inline"> &nbsp;•&nbsp; </span>
                    <br className="sm:hidden" />
                    <span className="font-black">Hosted by Ragul — Proserve IT Support</span>
                </p>
            </div>

            <nav className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <Link to="/">
                        <motion.div
                            className="text-2xl font-bold text-proserve cursor-pointer"
                            whileHover={{ scale: 1.05 }}
                        >
                            Proserve
                        </motion.div>
                    </Link>

                    <div className="hidden lg:flex items-center gap-8">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={`text-sm font-bold transition-all relative group ${isActive ? 'text-primary' : 'text-main/70 hover:text-primary'}`}
                                >
                                    {link.name}
                                    <span className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="hidden lg:flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            {/* Theme Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                                    className="p-2.5 rounded-full glass-card hover:bg-white/10 transition-all text-main"
                                    title="Switch Theme"
                                >
                                    {themes.find(t => t.id === theme)?.icon || <FiSun />}
                                </button>
                                <AnimatePresence>
                                    {themeMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute right-0 mt-2 w-48 glass-card overflow-hidden shadow-2xl border border-white/20 z-50"
                                        >
                                            <div className="p-2 space-y-1">
                                                {themes.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => {
                                                            toggleTheme(t.id);
                                                            setThemeMenuOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${theme === t.id ? 'bg-primary text-white shadow-lg' : 'hover:bg-white/10 text-main'}`}
                                                    >
                                                        <span className={theme === t.id ? 'text-white' : ''} style={{ color: theme === t.id ? 'white' : t.color }}>
                                                            {t.icon}
                                                        </span>
                                                        <span className="text-sm font-bold">{t.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {user && localStorage.getItem('token') && (
                                <>
                                    <NotificationCenter />
                                    <div className="relative">
                                        <button
                                            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                            className="flex items-center gap-2 glass-card p-1.5 hover:bg-white/10 transition-all rounded-full"
                                        >
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url.startsWith('http') ? user.avatar_url : `${baseURL}${user.avatar_url.startsWith('/') ? '' : '/'}${user.avatar_url}`}
                                                    alt={user.username}
                                                    className="w-9 h-9 rounded-full object-cover border-2 border-primary"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-9 h-9 bg-primary rounded-full items-center justify-center border-2 border-white/20 shadow-lg ${user.avatar_url ? 'hidden' : 'flex'}`}>
                                                <span className="text-white font-black text-sm">{(user.full_name || user.username).charAt(0).toUpperCase()}</span>
                                            </div>
                                            <FiChevronDown size={14} className={`mr-1 text-main opacity-50 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {profileDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute right-0 top-full mt-2 w-64 glass-card shadow-2xl border border-white/20 rounded-2xl overflow-hidden z-50"
                                                >
                                                    <div className="p-4 border-b border-white/10">
                                                        <p className="text-sm font-black text-main">{user.full_name || user.username}</p>
                                                        <p className="text-xs text-muted truncate">{user.email}</p>
                                                    </div>
                                                    <div className="p-2">
                                                        <button
                                                            onClick={() => {
                                                                navigate(`/dashboard/${user.role}`);
                                                                setProfileDropdownOpen(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-main hover:bg-white/10 rounded-xl transition-all"
                                                        >
                                                            <FiUser size={16} className="text-primary" />
                                                            <span className="text-sm font-bold">{t('nav.profile')}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setProfileDropdownOpen(false);
                                                                navigate('/settings');
                                                            }}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-main hover:bg-white/10 rounded-xl transition-all"
                                                        >
                                                            <FiSettings size={16} className="text-primary" />
                                                            <span className="text-sm font-bold">{t('nav.settings')}</span>
                                                        </button>
                                                        <hr className="my-2 border-white/10" />
                                                        <button
                                                            onClick={() => {
                                                                logout();
                                                                setProfileDropdownOpen(false);
                                                            }}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                        >
                                                            <FiLogOut size={16} />
                                                            <span className="text-sm font-bold">{t('nav.logout')}</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </>
                            )}
                            {!user && (
                                <Link
                                    to="/login"
                                    className="btn-primary"
                                >
                                    {t('header.login_register')}
                                </Link>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden text-main p-2"
                    >
                        {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="lg:hidden mt-4 glass-card p-4 max-h-[80vh] overflow-y-auto"
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block py-3.5 text-main font-bold hover:text-primary transition-colors flex items-center justify-between group"
                            >
                                {link.name}
                                <FiChevronDown className="rotate-[-90deg] opacity-0 group-hover:opacity-100 transition-all" size={14} />
                            </Link>
                        ))}

                        <div className="mt-4 pt-6 border-t border-white/10 space-y-6">
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] px-1">Appearance</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {themes.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => toggleTheme(t.id)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border ${theme === t.id ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-white/5 border-white/10 text-muted hover:bg-white/10'}`}
                                        >
                                            <span style={{ color: theme === t.id ? 'inherit' : t.color }}>{t.icon}</span>
                                            <span className="text-[8px] font-black mt-1.5 uppercase tracking-tighter">{t.name.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            {user && localStorage.getItem('token') ? (
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <FiUser className="text-primary-400" />
                                        <span className="text-sm">{user.username}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            logout();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full btn-secondary py-2"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <Link
                                    to="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full btn-primary py-3 block text-center"
                                >
                                    Login / Register
                                </Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </nav>
        </motion.header>
    );
};

export default Header;
