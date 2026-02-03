import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    HomeIcon,
    BookOpenIcon,
    ChatBubbleLeftRightIcon,
    MagnifyingGlassIcon,
    UserGroupIcon,
    LifebuoyIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import AIChatbot from './AIChatbot';

const PortalLayout = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [access, setAccess] = React.useState({ loading: true, allowed: true, message: '' });

    React.useEffect(() => {
        const checkAccess = async () => {
            try {
                const res = await api.get(`/api/portal/settings`);
                const { active, allowed_roles } = res.data;

                if (!active) {
                    setAccess({ loading: false, allowed: false, message: 'The Self-Service Portal is currently disabled by administrators.' });
                    return;
                }

                const userRole = user?.role || 'public';
                if (!allowed_roles.includes(userRole)) {
                    setAccess({ loading: false, allowed: false, message: 'You do not have permission to access the portal. Please contact support.' });
                    return;
                }

                setAccess({ loading: false, allowed: true, message: '' });
            } catch (error) {
                console.error("Failed to check portal access", error);
                setAccess({ loading: false, allowed: true, message: '' }); // Fallback to allowed on error
            }
        };
        checkAccess();
    }, [user]);

    const navItems = [
        { name: 'Home', path: '/portal', icon: HomeIcon },
        { name: 'Track Ticket', path: '/portal/track', icon: MagnifyingGlassIcon },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Premium Gradient Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/portal" className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <LifebuoyIcon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                                Proserve Support
                            </span>
                        </Link>

                        <nav className="hidden md:flex space-x-8">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center space-x-1 text-sm font-medium transition-colors ${location.pathname === item.path
                                        ? 'text-indigo-600'
                                        : 'text-slate-600 hover:text-indigo-600'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.name}</span>
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center space-x-4">
                            <Link
                                to="/login"
                                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/login?register=true"
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                            >
                                Get Support
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {access.loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-slate-500 font-medium">Checking access...</p>
                    </div>
                ) : !access.allowed ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
                            <LifebuoyIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                        <p className="text-slate-500 max-w-md mx-auto">{access.message}</p>
                        <Link to="/" className="mt-8 text-indigo-600 font-bold hover:underline">Return to Home</Link>
                    </div>
                ) : (
                    <Outlet />
                )}
            </main>

            <AIChatbot />

            {/* Footer */}

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                    <LifebuoyIcon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-lg font-bold">Proserve Support</span>
                            </div>
                            <p className="text-slate-500 max-w-sm">
                                Empowering our customers with instant help and detailed resolution guides.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Portal</h3>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><Link to="/portal/track" className="hover:text-indigo-600 transition-colors">Track Ticket</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Support</h3>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Contact Us</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-slate-100 text-center text-sm text-slate-400">
                        © {new Date().getFullYear()} Proserve IT Solutions. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PortalLayout;
