import { useState, useEffect } from 'react';
import { FiUser, FiLogIn, FiX, FiBell } from 'react-icons/fi';
import api from '../api/axios';

const NotificationsPanel = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/notifications/');
            setNotifications(response.data.notifications || []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'new_user':
                return <FiUser className="text-blue-400" size={18} />;
            case 'login':
                return <FiLogIn className="text-green-400" size={18} />;
            default:
                return <FiBell className="text-gray-400" size={18} />;
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'new_user':
                return 'bg-blue-500/10 border-blue-500/20';
            case 'login':
                return 'bg-green-500/10 border-green-500/20';
            default:
                return 'bg-gray-500/10 border-gray-500/20';
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={onClose}></div>

            {/* Panel */}
            <div className="fixed top-16 right-4 z-50 w-96 bg-[#1a1f4f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0f1729]/50">
                    <div className="flex items-center gap-2">
                        <FiBell className="text-blue-400" size={20} />
                        <h3 className="text-white font-bold">Notifications</h3>
                        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {notifications.length}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Notifications List */}
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">
                            Loading notifications...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            No notifications yet
                        </div>
                    ) : (
                        <div className="divide-y divide-white/10">
                            {notifications.map((notif, index) => (
                                <div
                                    key={index}
                                    className={`p-4 hover:bg-white/5 transition-colors ${getColor(notif.type)} border-l-2`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">{getIcon(notif.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm">{notif.message}</p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                {formatTime(notif.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default NotificationsPanel;
