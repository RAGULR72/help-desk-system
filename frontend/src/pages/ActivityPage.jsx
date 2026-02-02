import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { FiActivity, FiSmartphone, FiMonitor, FiGrid, FiUser, FiFileText, FiSettings, FiCalendar } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/TranslationContext';

const ActivityPage = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [activityLogs, setActivityLogs] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const response = await api.get('/api/auth/activity');
                setActivityLogs(response.data);
            } catch (error) {
                console.error("Failed to fetch activity logs", error);
            }
        };
        if (user) fetchActivity();
    }, [user]);

    const handleLogoutSession = async (logId) => {
        console.log("Attempting to logout session:", logId);
        try {
            const response = await api.delete(`/api/auth/activity/${logId}`);
            console.log("Logout response:", response);
            if (response.status === 200) {
                setActivityLogs(prev => prev.filter(log => log.id !== logId));
                setSuccessMessage(t('activity.logout_success'));
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (error) {
            console.error("Logout failed:", error);
            setErrorMessage(t('activity.logout_fail'));
            setTimeout(() => setErrorMessage(''), 3000);
        }
    };

    const menuItems = [
        { icon: FiGrid, label: 'Dashboard', path: '/admin-dashboard' }, // Assuming admin, but should technically check role
        { icon: FiUser, label: 'User Profile', path: '/profile' },
        { icon: FiFileText, label: 'Documents', path: '#' },
        { icon: FiSettings, label: 'Setting', path: '/settings', badge: '1' },
        { icon: FiCalendar, label: 'Schedule', path: '#' },
        { icon: FiActivity, label: 'Activity', path: '/activity', active: true },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B1437] via-[#1a1f4f] to-[#0f1729] flex">
            {/* Left Sidebar - Duplicated for consistency or should be a Component */}
            <div className="w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 fixed top-0 left-0 h-full flex flex-col z-20">
                <div className="h-20 flex items-center px-8 border-b border-white/10">
                    <h1 className="text-xl font-bold text-white tracking-wider">PROSERVE</h1>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-4">
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            to={item.path}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${item.active
                                ? 'bg-blue-600/20 text-blue-400 font-medium border border-blue-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={20} className={item.active ? 'text-blue-400' : 'text-gray-400'} />
                                <span>{item.label}</span>
                            </div>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">{t('activity.title')}</h1>
                        <p className="text-gray-400">{t('activity.subtitle')}</p>
                    </header>

                    {successMessage && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl">
                            {successMessage}
                        </div>
                    )}
                    {errorMessage && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
                            {errorMessage}
                        </div>
                    )}

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            {t('activity.active_sessions')}
                        </h2>
                        <div className="space-y-4">
                            {activityLogs.length > 0 ? (
                                activityLogs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                {log.device === 'Mobile' ? <FiSmartphone /> : <FiMonitor />}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{log.device || 'Unknown Device'} • {log.os || 'Unknown OS'}</p>
                                                <p className="text-xs text-gray-400">
                                                    {log.location ? `${log.location} • ` : ''} {log.browser} • {log.ip_address} • {new Date(log.login_time).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleLogoutSession(log.id)}
                                            className="text-sm text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                        >
                                            {t('activity.logout')}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm">{t('activity.no_activity')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityPage;
