import React, { useState, useEffect } from 'react';
import { FiBell, FiX, FiCheckCircle, FiAlertTriangle, FiInfo, FiTrash2, FiClock } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api, { wsURL } from '../api/axios';
import { useNavigate } from 'react-router-dom';

const NotificationCenter = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const toggleOpen = () => setIsOpen(!isOpen);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/api/notifications/');
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.is_read).length); // Backend uses is_read
        } catch (err) { console.error("Notif fetch error:", err); }
    };

    useEffect(() => {
        if (!user) return;
        fetchNotifications();

        let ws = null;
        let reconnectTimer = null;
        let isMounted = true;

        const connectWS = () => {
            const token = localStorage.getItem('token');
            if (!token || !isMounted) return;

            // Use the updated wsURL from axios which handles local/remote logic
            // Note: wsURL passed from axios.js imports
            // But we can check if it looks right
            const url = `${wsURL}/api/notifications/ws?token=${token}`;

            try {
                ws = new WebSocket(url);

                ws.onopen = () => {
                    if (isMounted) console.log('Connected to Notification WS');
                };

                ws.onmessage = (event) => {
                    if (!isMounted) return;
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'new_notification') {
                            setNotifications(prev => [data.notification, ...prev]);
                            setUnreadCount(prev => prev + 1);

                            if (window.navigator.vibrate) window.navigator.vibrate(100);

                            // Optional: Play sound
                            // const audio = new Audio('/notification.mp3');
                            // audio.play().catch(e => {});
                        }
                    } catch (e) {
                        console.error("WS Parse Error", e);
                    }
                };

                ws.onerror = (err) => {
                    // Just log, onclose will handle reconnect
                    // console.error("Notif WS Error", err); 
                };

                ws.onclose = () => {
                    if (!isMounted) return;
                    // console.log('Notif WS Closed, reconnecting in 5s...');
                    reconnectTimer = setTimeout(connectWS, 5000);
                };
            } catch (e) {
                console.error("WS Creation Error", e);
                reconnectTimer = setTimeout(connectWS, 5000);
            }
        };

        connectWS();

        // Polling as a backup (every 60s)
        const interval = setInterval(() => {
            if (isMounted) fetchNotifications();
        }, 60000);

        return () => {
            isMounted = false;
            clearInterval(interval);
            clearTimeout(reconnectTimer);
            if (ws) {
                ws.onclose = null; // Prevent reconnect logic from firing
                ws.close();
            }
        };
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await api.put(`/api/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { console.error(err); }
    };

    const clearAll = async () => {
        if (!window.confirm("Clear all notifications?")) return;
        try {
            await api.delete('/api/notifications/clear');
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) { console.error(err); }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) markAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <FiCheckCircle className="text-emerald-500" />;
            case 'warning': return <FiAlertTriangle className="text-amber-500" />;
            case 'error': return <FiAlertTriangle className="text-rose-500" />;
            default: return <FiInfo className="text-primary" />;
        }
    };

    return (
        <div className="relative z-50">
            {/* Bell Icon */}
            <motion.button
                onClick={toggleOpen}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2.5 rounded-full glass-card hover:bg-white/10 text-main transition-all"
            >
                <FiBell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white/20 rounded-full animate-pulse"></span>
                )}
            </motion.button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for mobile */}
                        <div
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/5 backdrop-blur-[1px] z-40 md:hidden"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 top-full mt-3 w-80 md:w-96 glass-card overflow-hidden shadow-2xl z-50 origin-top-right border border-white/20"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 bg-white/5 backdrop-blur-md">
                                <h3 className="font-black text-main uppercase tracking-wider text-xs">Notifications</h3>
                                <div className="flex gap-2">
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={clearAll}
                                            className="text-[10px] font-bold text-muted hover:text-rose-500 flex items-center gap-1 transition-colors uppercase tracking-widest"
                                        >
                                            <FiTrash2 /> Clear
                                        </button>
                                    )}
                                    <button onClick={() => setIsOpen(false)} className="text-muted hover:text-main">
                                        <FiX />
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-white/5">
                                {notifications.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
                                        <div className="glass-card p-4 rounded-full mb-2 bg-white/5">
                                            <FiBell size={24} className="opacity-50" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest">All caught up!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {notifications.map(notification => (
                                            <div
                                                key={notification.id}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`p-4 hover:bg-white/10 transition-colors cursor-pointer relative group ${!notification.is_read ? 'bg-primary/5' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className="mt-1 flex-shrink-0">
                                                        {getIcon(notification.type)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <h4 className={`text-sm ${!notification.is_read ? 'font-bold text-main' : 'font-medium text-muted'}`}>
                                                                {notification.title}
                                                            </h4>
                                                            <span className="text-[10px] text-muted flex-shrink-0 flex items-center gap-1">
                                                                {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                                                            {notification.message}
                                                        </p>
                                                    </div>
                                                    {!notification.is_read && (
                                                        <div className="flex-shrink-0 self-center">
                                                            <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-2 border-t border-white/10 bg-white/5 text-center">
                                <button className="text-[10px] font-black text-primary hover:text-primary-hover py-1 transition-colors uppercase tracking-[0.2em]">
                                    View All History
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;
