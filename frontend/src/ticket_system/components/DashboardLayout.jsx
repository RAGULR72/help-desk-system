import React, { useState, useEffect } from 'react';
import { FiGrid, FiList, FiClock, FiUser, FiLogOut, FiCalendar, FiSettings, FiChevronDown, FiUsers, FiBell, FiChevronRight, FiMoon, FiSun, FiGlobe, FiX, FiPlus, FiChevronsLeft, FiChevronsRight, FiGitPullRequest, FiMessageSquare, FiTruck, FiStar, FiBox, FiLayout, FiShield, FiBookOpen, FiActivity } from 'react-icons/fi';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import api, { baseURL } from '../../api/axios';
import { useChat } from '../../chat_system/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../context/TranslationContext';
import NoPunchOutModal from '../../attendance_system/NoPunchOutModal';


const DashboardLayout = ({ children, activeTab = 'tickets', userRole, onTabChange, onAddUser }) => {
    const { logout, user, checkPermission, updateUser } = useAuth();
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop sidebar collapse state
    const [showNotifOptions, setShowNotifOptions] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [ticketCount, setTicketCount] = useState(0);
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const { t, language: currentLanguage, setLanguage: setCurrentLanguage } = useTranslation();
    const [currentTimezone, setCurrentTimezone] = useState(user?.timezone || 'UTC+5:30');
    const [isSaving, setIsSaving] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { unreadCount: chatUnread } = useChat();

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/api/auth/notifications');
            setNotifications(res.data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    const fetchAttendanceStatus = async () => {
        try {
            const res = await api.get('/api/attendance/status');
            setAttendanceStatus(res.data);
        } catch (err) {
            console.error("Failed to fetch attendance status", err);
        }
    };

    const fetchTicketCount = async () => {
        try {
            const res = await api.get('/api/tickets/');
            let count = 0;
            if (userRole === 'technician') {
                count = res.data.filter(t => Number(t.assigned_to) === Number(user?.id) && t.status === 'open').length;
            } else if (userRole === 'user') {
                count = res.data.filter(t => t.user_id === user?.id && t.status === 'open').length;
            } else {
                // Admin/Manager sees unassigned
                count = res.data.filter(t => !t.assigned_to).length;
            }
            setTicketCount(count);
        } catch (err) {
            console.error("Failed to fetch ticket count", err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            fetchTicketCount();
            fetchAttendanceStatus();

            // Polling as fallback (intervals increased to reduce load)
            const interval = setInterval(() => {
                fetchNotifications();
                fetchAttendanceStatus();
            }, 60000);

            // WebSocket for Real-time Updates
            let ws;
            const connectWS = () => {
                const token = localStorage.getItem('token');
                if (!token) return;

                const wsBase = baseURL.replace(/^http/, 'ws');
                ws = new WebSocket(`${wsBase}/api/chat/ws?token=${token}`);

                ws.onmessage = (event) => {
                    try {
                        const wsData = JSON.parse(event.data);
                        if (wsData.type === 'dashboard_update') {
                            console.info(`[RealTime] Global update received from ${wsData.source}`);
                            if (wsData.source === 'tickets') fetchTicketCount();
                            if (wsData.source === 'attendance') fetchAttendanceStatus();
                            // Notifications usually come from many sources
                            fetchNotifications();
                        }
                    } catch (e) {
                        // Not a JSON message or dashboard update
                    }
                };

                ws.onclose = () => {
                    setTimeout(connectWS, 5000);
                };
            };

            connectWS();



            return () => {
                clearInterval(interval);

                if (ws) ws.close();
            };
        }
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleNotificationPref = async (pref) => {
        const success = await updateUser({ notification_preference: pref });
        if (success) {
            setShowNotifOptions(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await updateUser({
                language: currentLanguage,
                timezone: currentTimezone
            });
            setIsSettingsModalOpen(false);
        } catch (error) {
            console.error("Failed to save settings", error);
        } finally {
            setIsSaving(false);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const sidebarItems = [
        { id: 'dashboard', label: t('nav.dashboard'), icon: <FiGrid />, color: 'text-indigo-500', badge: null, module: 'Dashboard' },
        { id: 'tickets', label: t('nav.tickets'), icon: <FiList />, color: 'text-emerald-500', badge: ticketCount > 0 ? ticketCount : null, module: 'Tickets' },
        { id: 'sla', label: 'SLA Monitoring', icon: <FiClock />, color: 'text-orange-500', badge: null, module: 'Reports', roles: ['admin'] },
        { id: 'chats', label: 'Chat', icon: <FiMessageSquare />, color: 'text-blue-500', badge: chatUnread > 0 ? chatUnread : null, module: 'Chat', roles: ['user', 'admin', 'manager', 'technician'] },
        { id: 'expenses', label: 'Expense Claims', icon: <FiTruck />, color: 'text-indigo-500', badge: null, roles: ['user', 'admin', 'manager', 'technician'] },

        { id: 'users', label: t('nav.user_management'), icon: <FiUsers />, color: 'text-purple-500', badge: null, module: 'Users', roles: ['admin', 'manager', 'technician'] },
        { id: 'attendance', label: t('nav.attendance'), icon: <FiCalendar />, color: 'text-rose-500', badge: null, module: 'Attendance', roles: ['admin', 'manager', 'technician'] },
        { id: 'workflows', label: 'Workflows', icon: <FiGitPullRequest />, color: 'text-cyan-500', badge: null, module: 'Reports', roles: ['admin'] },
        { id: 'asset_management', label: 'Assets & Inventory', icon: <FiBox />, color: 'text-purple-600', badge: null, roles: ['admin', 'manager', 'technician'] },
        { id: 'feedback', label: 'User Feedback', icon: <FiStar />, color: 'text-yellow-500', badge: null, module: 'Reports', roles: ['admin', 'manager'] },
        { id: 'portal_config', label: 'Portal Config', icon: <FiLayout />, color: 'text-indigo-600', badge: null, roles: ['admin'] },
        { id: 'asset_settings', label: 'Asset Settings', icon: <FiShield />, color: 'text-slate-600', badge: null, roles: ['admin'] },
        { id: 'command_center', label: 'AI Command Center', icon: <FiActivity />, color: 'text-indigo-400', badge: 'PRO', roles: ['admin'] },

    ].filter(item => {
        if (item.roles && !item.roles.includes(userRole)) return false;
        if (item.id === 'dashboard' || item.id === 'chats') return true;
        if (item.module) return checkPermission(item.module, 'view');
        return true;
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans transition-colors duration-300 relative overflow-hidden">
            {/* No Punch Out Modal - Shows if user has pending no-punch-out records */}
            <NoPunchOutModal />

            {/* Sidebar Overlay (Mobile Only) */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[25] lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <div className={`fixed lg:sticky top-0 h-screen z-30 transition-all duration-300 overflow-y-auto no-scrollbar
                ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
                ${isSidebarCollapsed ? 'w-0 lg:w-16' : 'w-0 lg:w-56 xl:w-64'}
                bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col`}>
                <div className="p-6 flex items-center justify-between">
                    <div className={`flex items-center gap-3 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 lg:opacity-0' : 'opacity-100'}`}>
                        <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-green-500 font-bold border border-green-200 dark:border-green-900/50 shadow-sm">
                            <img src="/proserve_logo_placeholder.png" alt="P" className="w-6 h-6 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = 'P' }} />
                        </div>
                        <span className="font-bold text-lg text-primary tracking-tight whitespace-nowrap">Proserve</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                <nav className="px-4 space-y-2 mt-4">
                    {sidebarItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'chats') {
                                    navigate('/chats');
                                } else {
                                    if (onTabChange) {
                                        onTabChange(item.id);
                                    } else {
                                        // For pages that don't have a tab container (like ProfilePage)
                                        if (item.id === 'expenses') {
                                            navigate('/expenses');
                                        } else {
                                            navigate(`/dashboard/${userRole}`);
                                        }
                                    }
                                }
                                if (window.innerWidth < 1024) setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-[13px] font-medium rounded-xl transition-all duration-200 group relative ${activeTab === item.id
                                ? 'bg-primary/5 dark:bg-primary/10 text-primary shadow-sm font-semibold'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            title={isSidebarCollapsed ? item.label : ''}
                        >
                            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                                <span className={`${activeTab === item.id ? item.color : 'text-gray-400 group-hover:' + item.color} ${isSidebarCollapsed ? 'text-lg' : ''} transition-colors duration-300`}>
                                    {item.icon}
                                </span>
                                <span className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                                    {item.label}
                                </span>
                            </div>
                            {item.badge && !isSidebarCollapsed && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all ${activeTab === item.id
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {item.badge}
                                </span>
                            )}
                            {item.badge && isSidebarCollapsed && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Desktop Sidebar Toggle Button - Bottom Positioned */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-800">
                    <motion.button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="hidden lg:flex w-full items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/5 dark:to-primary/10 hover:from-primary/10 hover:to-primary/20 dark:hover:from-primary/10 dark:hover:to-primary/20 border border-primary/20 rounded-xl text-primary font-bold text-sm transition-all shadow-sm hover:shadow-md group"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={false}
                        animate={isSidebarCollapsed ? {
                            backgroundColor: "rgba(16, 185, 129, 0.1)"
                        } : {}}
                    >
                        <motion.div
                            animate={{
                                x: isSidebarCollapsed ? [0, -3, 3, -3, 0] : 0,
                            }}
                            transition={{
                                duration: 0.5,
                                ease: "easeInOut"
                            }}
                        >
                            <motion.div
                                animate={{
                                    rotate: isSidebarCollapsed ? 0 : 180,
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 15
                                }}
                            >
                                <FiGrid size={18} className="group-hover:scale-110 transition-transform" />
                            </motion.div>
                        </motion.div>

                        <motion.span
                            className="font-black uppercase tracking-wider text-xs whitespace-nowrap"
                            animate={{
                                opacity: isSidebarCollapsed ? 0 : 1,
                                width: isSidebarCollapsed ? 0 : "auto",
                                display: isSidebarCollapsed ? "none" : "block"
                            }}
                            transition={{ duration: 0.2 }}
                        >
                            {isSidebarCollapsed ? "" : "Hide Menu"}
                        </motion.span>

                        {/* Animated pulse ring when collapsed */}
                        {isSidebarCollapsed && (
                            <motion.div
                                className="absolute inset-0 rounded-xl border-2 border-green-400 dark:border-green-500"
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.5, 0, 0.5]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300">
                <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 py-2 px-4 md:px-6 flex justify-between items-center sticky top-0 z-20 shadow-sm bg-opacity-90 dark:bg-opacity-90 backdrop-blur-md transition-all duration-300 h-14">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <FiGrid size={20} />
                        </button>
                        {activeTab === 'dashboard' ? (
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize px-2">
                                    {userRole === 'technician' ? 'Technician' : userRole} Dashboard
                                </h1>
                            </div>
                        ) : activeTab === 'users' ? (
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white px-2">User Management</h1>
                            </div>
                        ) : activeTab === 'tickets' ? (
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white px-2">Ticket Management</h1>
                            </div>
                        ) : activeTab === 'attendance' ? (
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white px-2">Attendance & Leave</h1>
                            </div>
                        ) : activeTab === 'sla' ? (
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white px-2">SLA Monitoring</h1>
                            </div>
                        ) : activeTab === 'sla_config' ? (
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white px-2">SLA Rules Configuration</h1>
                            </div>
                        ) : activeTab === 'system_config' ? (
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white px-2">System Configuration</h1>
                            </div>
                        ) : activeTab === 'command_center' ? (
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white px-2">AI Intelligence Command</h1>
                            </div>
                        ) : (
                            <div className="flex-1" />
                        )}
                    </div>

                    {/* Top Right Actions */}
                    <div className="flex items-center gap-4">
                        {/* Duty Status Badge */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-all group" onClick={() => onTabChange && onTabChange('attendance')}>
                            <div className={`w-2 h-2 rounded-full ${attendanceStatus?.isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                            <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                {attendanceStatus?.isCheckedIn ? (attendanceStatus?.checkInTime ? new Date(attendanceStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Duty') : 'Off Duty'}
                            </span>
                        </div>
                        {/* Tab-specific actions (like Add User) */}
                        {activeTab === 'users' && checkPermission('Users', 'create') && (
                            <button
                                onClick={onAddUser}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <FiPlus size={16} />
                                Add User
                            </button>
                        )}

                        {/* Theme Switcher Quick Toggle */}
                        <button
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group"
                            title="Change Theme & Color"
                        >
                            <div className="relative">
                                <FiMoon size={20} className="group-hover:scale-110 transition-transform" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-slate-900 group-hover:animate-ping"></span>
                            </div>
                        </button>

                        <div className="h-8 w-px bg-gray-100 dark:bg-slate-800 mx-1"></div>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all relative ${isNotificationsOpen ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                            >
                                <FiBell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotificationsOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)}></div>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                            className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-40 overflow-hidden ring-1 ring-black/5"
                                        >
                                            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h3>
                                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-lg">{unreadCount} New</span>
                                            </div>
                                            <div className="max-h-96 overflow-y-auto">
                                                {notifications.length > 0 ? (
                                                    notifications.map(notif => (
                                                        <div key={notif.id} className={`p-4 border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${!notif.is_read ? 'bg-indigo-50/10' : ''}`}>
                                                            <div className="flex gap-3">
                                                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.is_read ? 'bg-indigo-600' : 'bg-transparent'}`}></div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{notif.title}</p>
                                                                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                                                                    <p className="text-[8px] text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1"><FiClock size={10} /> {new Date(notif.timestamp).toLocaleString()}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-8 text-center text-gray-400">
                                                        <FiBell size={32} className="mx-auto mb-3 opacity-20" />
                                                        <p className="text-xs font-bold uppercase tracking-widest">No notifications</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Profile */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={`flex items-center gap-3 p-1.5 pr-3 rounded-xl transition-all group ${isProfileOpen ? 'bg-gray-50 dark:bg-slate-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                            >
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 flex-shrink-0">
                                    <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] overflow-hidden flex items-center justify-center">
                                        <img
                                            src={user?.avatar_url
                                                ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${baseURL}${user.avatar_url.startsWith('/') ? '' : '/'}${user.avatar_url}`)
                                                : `https://ui-avatars.com/api/?name=${user?.full_name || 'U'}&background=random`}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="hidden lg:block text-left min-w-0">
                                    <span className="block text-xs font-semibold text-slate-900 dark:text-white truncate uppercase tracking-tight">{user?.full_name || user?.username || 'Administrator'}</span>
                                    <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 capitalize">{userRole}</span>
                                </div>
                                <FiChevronDown size={14} className={`text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isProfileOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setIsProfileOpen(false)}></div>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                                            className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 py-2 z-40 overflow-hidden ring-1 ring-black/5"
                                        >
                                            <div className="p-2 space-y-1">
                                                <button
                                                    onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                                                >
                                                    <FiUser size={16} className="text-gray-400 group-hover:text-indigo-600" />
                                                    <span>My Profile</span>
                                                </button>
                                                <button
                                                    onClick={() => { setIsSettingsModalOpen(true); setIsProfileOpen(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                                                >
                                                    <FiSettings size={16} className="text-gray-400 group-hover:text-indigo-600" />
                                                    <span>Settings</span>
                                                </button>
                                                <div className="h-px bg-gray-100 dark:bg-slate-800 mx-2 my-1" />
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all group uppercase tracking-widest"
                                                >
                                                    <FiLogOut size={16} />
                                                    <span>Log Out</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-0 overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
            </div>

            {/* Settings Modal */}
            <AnimatePresence>
                {isSettingsModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSettingsModalOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                        ></motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-white dark:border-slate-800 transition-all duration-300"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h2>
                                <button onClick={() => setIsSettingsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50" disabled={isSaving}>
                                    <FiX size={18} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-800">
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-slate-200 text-sm mb-1">Personalization</p>
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-4">Choose your preferred style and color palette.</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'light', label: 'Light', color: 'bg-white border-gray-200' },
                                            { id: 'dark', label: 'Dark', color: 'bg-slate-900 border-slate-700' },
                                            { id: 'theme-midnight', label: 'Midnight', color: 'bg-black border-slate-800' },
                                            { id: 'theme-ocean', label: 'Ocean', color: 'bg-blue-600 border-blue-400' },
                                            { id: 'theme-nature', label: 'Nature', color: 'bg-emerald-600 border-emerald-400' },
                                            { id: 'theme-sunset', label: 'Sunset', color: 'bg-orange-600 border-orange-400' }
                                        ].map((skin) => (
                                            <button
                                                key={skin.id}
                                                onClick={() => toggleTheme(skin.id)}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group ${theme === skin.id ? 'border-primary bg-primary/5 shadow-lg' : 'border-transparent bg-gray-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-full ${skin.color} border shadow-inner group-hover:scale-110 transition-transform`} />
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${theme === skin.id ? 'text-primary' : 'text-muted'}`}>{skin.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                                            <FiGlobe size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-slate-200">{t('settings.language')}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('settings.language_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={currentLanguage}
                                            onChange={(e) => setCurrentLanguage(e.target.value)}
                                            className="appearance-none bg-gray-100 dark:bg-slate-800 px-4 py-2 pr-8 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                                        >
                                            <option value="English (US)">English (US)</option>
                                            <option value="Tamil (ID)">Tamil (ID)</option>
                                            <option value="Hindi (IN)">Hindi (IN)</option>
                                            <option value="Spanish (ES)">Spanish (ES)</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-slate-400">
                                            <FiChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <FiClock size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-slate-200">{t('settings.timezone')}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t('settings.timezone_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={currentTimezone}
                                            onChange={(e) => setCurrentTimezone(e.target.value)}
                                            className="appearance-none bg-gray-100 dark:bg-slate-800 px-4 py-2 pr-8 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                                        >
                                            <option value="UTC+0:00">UTC (GMT)</option>
                                            <option value="UTC+3:00">UTC+3:00 (Riyadh)</option>
                                            <option value="UTC+4:00">UTC+4:00 (Dubai)</option>
                                            <option value="UTC+5:30">UTC+5:30 (India)</option>
                                            <option value="UTC+8:00">UTC+8:00 (Singapore)</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-slate-400">
                                            <FiChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end">
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={isSaving}
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? t('settings.saving') : t('settings.save')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardLayout;
