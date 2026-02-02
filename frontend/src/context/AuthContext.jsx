import { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiClock, FiRefreshCw, FiLogOut, FiLock } from 'react-icons/fi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token) {
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }

                try {
                    // Always verify/update with fresh data
                    const response = await api.get('/api/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const userData = response.data;
                    try {
                        if (userData.permissions && typeof userData.permissions === 'string') {
                            userData.permissions = JSON.parse(userData.permissions);
                        }
                    } catch (e) {
                        console.error("Failed to parse permissions", e);
                        userData.permissions = {};
                    }
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                } catch (error) {
                    console.error("Auth check failed:", error);
                    // Optionally logout if token is invalid
                    if (error.response?.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const [showSessionWarning, setShowSessionWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const timerRef = useRef({ logout: null, warning: null, countdown: null });

    // 1. Activity Monitor & Initial Warning Timer
    useEffect(() => {
        if (!user || showSessionWarning) return;

        const WARNING_TIME = 9 * 60 * 1000; // 9 minutes

        const startWarningTimer = () => {
            if (timerRef.current.warning) clearTimeout(timerRef.current.warning);
            timerRef.current.warning = setTimeout(() => {
                setShowSessionWarning(true);
            }, WARNING_TIME);
        };

        const handleActivity = () => {
            // Throttle could be added here, but for now just reset
            startWarningTimer();
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => window.addEventListener(event, handleActivity));

        startWarningTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (timerRef.current.warning) clearTimeout(timerRef.current.warning);
        };
    }, [user, showSessionWarning]);

    // 2. Countdown Timer (Only runs when warning is shown)
    useEffect(() => {
        if (!showSessionWarning) return;

        setTimeLeft(60);

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    logout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [showSessionWarning]);

    const extendSession = async () => {
        try {
            await refreshUser(); // Ping backend
            setShowSessionWarning(false);
            // This state change will trigger the useEffect cleanup and restart timers
        } catch (error) {
            console.error("Failed to extend session", error);
            logout();
        }
    };

    const login = async (username, password) => {
        try {
            const response = await api.post('/api/auth/login', { username, password });

            if (response.data.status === '2fa_required' || response.data.status === '2fa_setup_required') {
                return {
                    success: false,
                    type: response.data.status,
                    username: response.data.username,
                    pre_auth_token: response.data.pre_auth_token
                };
            }

            const { access_token, session_id } = response.data;

            localStorage.setItem('token', access_token);
            if (session_id) {
                localStorage.setItem('session_id', session_id);
            }

            // Get user profile
            const userResponse = await api.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            const userData = userResponse.data;
            try {
                if (userData.permissions && typeof userData.permissions === 'string') {
                    userData.permissions = JSON.parse(userData.permissions);
                }
            } catch (e) {
                console.error("Failed to parse permissions", e);
                userData.permissions = {};
            }

            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return { success: true, user: userData };
        } catch (error) {
            return {
                success: false,
                status: error.response?.status,
                data: error.response?.data,
                error: error.response?.data?.detail || 'Login failed'
            };
        }
    };

    const register = async (userData) => {
        try {
            await api.post('/api/auth/register', userData);
            // Registration successful, but no auto-login (requires approval)
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || 'Registration failed'
            };
        }
    };

    const logout = async () => {
        const sessionId = localStorage.getItem('session_id');
        if (sessionId) {
            try {
                // Deactivate session on backend
                await api.delete(`/api/auth/sessions/${sessionId}`);
            } catch (error) {
                console.error("Failed to deactivate session on backend", error);
            }
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('session_id');
        setUser(null);
    };

    const updateUser = async (updates) => {
        try {
            // Optimistic update
            const updatedUser = { ...user, ...updates };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Backend update
            await api.put('/api/auth/me', updates);
            return true;
        } catch (error) {
            console.error("Failed to update user profile", error);
            // Revert on failure could be added here
            return false;
        }
    };

    const checkPermission = (module, action) => {
        if (!user) return false;
        if (user.role === 'admin') return true; // Admins have all access

        // Staff roles (Manager/Technician) have default permissions if not explicitly restricted
        if (user.role === 'manager' || user.role === 'technician') {
            const staffModules = ['Dashboard', 'Tickets', 'Attendance', 'Reports'];
            if (staffModules.includes(module) && action === 'view') {
                return true;
            }
            // Managers see user management by default
            if (user.role === 'manager' && module === 'Users' && action === 'view') {
                return true;
            }
        }

        // Regular User Default Permissions
        if (user.role === 'user') {
            const userModules = ['Dashboard', 'Tickets', 'Attendance'];
            if (userModules.includes(module) && action === 'view') {
                return true;
            }
        }

        if (!user.permissions) return false;

        // Handle Array format (Module-based)
        if (Array.isArray(user.permissions)) {
            const modulePerms = user.permissions.find(p => p.module === module);
            if (!modulePerms) return false;
            return modulePerms[action] === true;
        }

        // Handle Object format (Key-based fallback)
        if (typeof user.permissions === 'object') {
            // Try to construct a key, e.g., 'ticket_edit' from 'Tickets', 'edit'
            // This is a heuristic fallback
            const map = {
                'Tickets': { 'edit': 'ticket_edit', 'export': 'ticket_export' },
                'Users': { 'edit': 'user_management', 'export': 'export_data' }
            };
            const mappedKey = map[module]?.[action];
            if (mappedKey && user.permissions[mappedKey]) return true;
        }

        return false;
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/api/auth/me');
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            console.error("Failed to refresh user:", error);
            if (error.response?.status === 401) {
                logout();
            }
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, checkPermission, refreshUser }}>
            {children}

            <AnimatePresence>
                {showSessionWarning && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />

                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <FiLock className="text-amber-500 text-4xl" />
                                </div>

                                <h2 className="text-2xl font-black text-gray-900 mb-2">Session Expiring</h2>
                                <p className="text-gray-500 mb-8 leading-relaxed">
                                    Your session will automatically expire in <span className="font-black text-amber-600 font-mono text-xl">{timeLeft}s</span> due to inactivity.
                                </p>

                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={extendSession}
                                        className="group relative flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        <FiRefreshCw className="relative group-hover:rotate-180 transition-transform duration-500" />
                                        <span className="relative">Continue Working</span>
                                    </button>

                                    <button
                                        onClick={logout}
                                        className="flex items-center justify-center gap-2 text-gray-400 font-bold py-3 hover:text-red-500 transition-colors"
                                    >
                                        <FiLogOut />
                                        <span>Logout Now</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
