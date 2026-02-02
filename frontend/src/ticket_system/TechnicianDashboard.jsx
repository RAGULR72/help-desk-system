import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import TicketList from './components/TicketList';
import AttendanceView from '../attendance_system/AttendanceView';
import SLAMonitoring from '../sla_system/SLAMonitoring';
import UserProfileView from './components/UserProfileView';
import UserManagementView from './components/UserManagementView';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiCheckSquare, FiClock, FiStar, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import { useTranslation } from '../context/TranslationContext';

import { useChat } from '../chat_system/ChatContext';
import { IoChatbubbles, IoCard } from 'react-icons/io5';
import LiveMapView from '../map_system/components/LiveMapView';
import AssetManagement from '../asset_management/AssetManagement';
import ExpenseDashboard from '../expense_system/ExpenseDashboard';

const TechnicianStatsView = ({ user, onTabChange }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState({ open: 0, in_progress: 0, resolved: 0, total: 0 });
    const [travelStats, setTravelStats] = useState({ monthly_spent: 0 });
    const { unreadCount: chatUnread } = useChat();
    const [recentTickets, setRecentTickets] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, ticketsRes, activityRes, attendanceRes, travelRes] = await Promise.all([
                    api.get('/api/tickets/stats'),
                    api.get('/api/tickets/'),
                    api.get('/api/auth/profile/activity'),
                    api.get('/api/attendance/status'),
                    api.get('/api/travel/stats')
                ]);
                const allTickets = ticketsRes.data || [];
                const myTickets = allTickets.filter(t => Number(t.assigned_to) === Number(user?.id));

                setStats({
                    open: myTickets.filter(t => t.status === 'open').length,
                    in_progress: myTickets.filter(t => t.status === 'in_progress').length,
                    resolved: myTickets.filter(t => t.status === 'resolved').length,
                    total: myTickets.length
                });

                // Get most recent 5 tickets assigned to this tech
                const sortedRecent = [...myTickets]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5);
                setRecentTickets(sortedRecent);

                // Set real activity (limit to 5)
                setRecentActivity((activityRes.data.recent_activity || []).slice(0, 5));

                // Set attendance status
                setAttendanceStatus(attendanceRes.data);

                setTravelStats({
                    monthly_spent: travelRes.data.monthly_spent || 0
                });
            } catch (err) {
                console.error("Dashboard fetch failed", err);
            } finally {
                setIsLoading(false);
            }
        };
        if (user?.id) fetchDashboardData();
    }, [user]);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
                    {t('technician_dashboard.welcome')}{user?.full_name?.split(' ')[0] || user?.username}!
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                    {t('technician_dashboard.subtitle')}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900/50 transition-all cursor-default">
                    <div>
                        <h3 className="font-bold text-[10px] mb-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('technician_dashboard.assigned')}</h3>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : stats.open}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><FiCheckSquare size={20} /></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-900/50 transition-all cursor-default">
                    <div>
                        <h3 className="font-bold text-[10px] mb-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('technician_dashboard.processing')}</h3>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : stats.in_progress}</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform"><FiClock size={20} /></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:shadow-lg hover:border-yellow-200 dark:hover:border-yellow-900/50 transition-all cursor-default">
                    <div>
                        <h3 className="font-bold text-[10px] mb-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('technician_dashboard.resolved')}</h3>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : stats.resolved}</p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform"><FiStar size={20} /></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all cursor-default">
                    <div>
                        <h3 className="font-bold text-[10px] mb-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('technician_dashboard.total')}</h3>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{isLoading ? '...' : stats.total}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform"><FiTrendingUp size={20} /></div>
                </div>


            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main section: Recent Tickets */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-xl text-slate-900 dark:text-white">Recent Assignments</h3>
                            <button className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">View All Tickets</button>
                        </div>

                        <div className="overflow-hidden">
                            {recentTickets.length > 0 ? (
                                <div className="space-y-3">
                                    {recentTickets.map((ticket) => (
                                        <div key={ticket.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-10 rounded-full ${ticket.priority === 'critical' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : ticket.priority === 'high' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">#{ticket.id} - {ticket.subject}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ticket.requester_name} • {new Date(ticket.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${ticket.status === 'open' ? 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <FiCheckSquare size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="font-bold">No tickets assigned to you yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Activity and Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="font-black text-xl mb-6 text-slate-900 dark:text-white italic underline decoration-indigo-500 decoration-4 underline-offset-4">{t('technician_dashboard.activity')}</h3>
                        <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((activity, i) => (
                                    <div key={activity.id || i} className="flex gap-4 items-start relative z-10">
                                        <div className="w-4 h-4 mt-1 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex-shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.2)]"></div>
                                        <div>
                                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{activity.description}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                                                {new Date(activity.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 italic py-4">No recent activity recorded.</p>
                            )}
                        </div>
                    </div>

                    {/* Attendance Quick Widget */}
                    <div className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[32px] shadow-xl text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-black text-lg uppercase tracking-widest text-slate-400">Duty Status</h3>
                                <div className={`w-3 h-3 rounded-full ${attendanceStatus?.isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today's Punch</p>
                                    <p className="text-2xl font-black">{attendanceStatus?.checkInTime ? new Date(attendanceStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not Pushed'}</p>
                                </div>

                                <button
                                    onClick={() => onTabChange('attendance')}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                                >
                                    Open Attendance Portal <FiArrowRight />
                                </button>
                            </div>
                        </div>
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};



const TechnicianDashboard = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || localStorage.getItem(`activeTab_${user?.role}`) || 'dashboard');

    useEffect(() => {
        if (user?.role) {
            localStorage.setItem(`activeTab_${user.role}`, activeTab);
        }
    }, [activeTab, user?.role]);

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    return (
        <DashboardLayout activeTab={activeTab} userRole="technician" onTabChange={setActiveTab}>
            {activeTab === 'dashboard' && <TechnicianStatsView user={user} onTabChange={setActiveTab} />}
            {activeTab === 'tickets' && <TicketList userRole="technician" currentUserId={user?.id} />}
            {activeTab === 'attendance' && <AttendanceView />}
            {activeTab === 'sla' && <SLAMonitoring />}
            {activeTab === 'expenses' && <ExpenseDashboard />}

            {activeTab === 'users' && <UserManagementView />}
            {activeTab === 'profile' && <UserProfileView />}
            {activeTab === 'map' && <LiveMapView />}
            {activeTab === 'asset_management' && <AssetManagement />}
        </DashboardLayout>
    );
};

export default TechnicianDashboard;
