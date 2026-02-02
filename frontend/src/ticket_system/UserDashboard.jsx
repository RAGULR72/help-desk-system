import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from './components/DashboardLayout';
import TicketList from './components/TicketList';
import CreateTicketModal from './components/CreateTicketModal';
import { useAuth } from '../context/AuthContext';
import { FiPlusCircle, FiFileText, FiCheckCircle, FiActivity } from 'react-icons/fi';
import { useTranslation } from '../context/TranslationContext';
import UserProfileView from './components/UserProfileView';

import { useChat } from '../chat_system/ChatContext';
import { IoChatbubbles, IoNavigate, IoCard, IoDocument } from 'react-icons/io5';

import api from '../api/axios';
import AiConciergeModal from './components/concierge/AiConciergeModal';
import ExpenseDashboard from '../expense_system/ExpenseDashboard';

const UserStatsView = ({ user, onRefresh }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState({ open: 0, resolved: 0, total: 0 });
    const [travelStats, setTravelStats] = useState({ monthly_spent: 0, limit: 5000 });
    const { unreadCount: chatUnread } = useChat();
    const [recentTickets, setRecentTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isConciergeOpen, setIsConciergeOpen] = useState(false);
    const [conciergeEnabled, setConciergeEnabled] = useState(false);
    const [preFilledData, setPreFilledData] = useState(null);

    const fetchData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [ticketsRes, travelRes] = await Promise.all([
                api.get('/api/tickets/'),
                api.get('/api/travel/stats')
            ]);

            const myTickets = ticketsRes.data.filter(t => t.user_id === user.id);
            setStats({
                open: myTickets.filter(t => t.status === 'open').length,
                resolved: myTickets.filter(t => t.status === 'resolved').length,
                total: myTickets.length
            });

            setTravelStats({
                monthly_spent: travelRes.data.monthly_spent || 0,
                limit: travelRes.data.budget_info?.limit || 5000
            });

            // Fetch concierge status
            const conciergeConfig = await api.get('/api/ai/concierge/config');
            setConciergeEnabled(conciergeConfig.data.enabled);

            const sortedTickets = [...myTickets].sort((a, b) => b.id - a.id);
            setRecentTickets(sortedTickets.slice(0, 5));
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    return (
        <div className="p-8 transition-colors duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h2 className="text-3xl font-black text-main tracking-tight">{t('user_dashboard.welcome')}{user?.full_name || user?.username || 'User'}</h2>
                    <p className="text-muted font-medium mt-1">{t('user_dashboard.subtitle')}</p>
                </div>
                <button
                    onClick={() => {
                        if (conciergeEnabled) {
                            setIsConciergeOpen(true);
                        } else {
                            setIsCreateModalOpen(true);
                        }
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <FiPlusCircle size={20} />
                    <span>{t('user_dashboard.create_ticket')}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <div className="glass-card p-6 flex items-center gap-5 group hover:-translate-y-1 transition-all">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-lg shadow-primary/5">
                        <FiFileText size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-black text-main leading-tight">{loading ? '...' : stats.open}</div>
                        <div className="text-[10px] font-bold text-muted uppercase tracking-widest">{t('user_dashboard.open_tickets')}</div>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-5 group hover:-translate-y-1 transition-all">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-lg shadow-primary/5">
                        <FiCheckCircle size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-black text-main leading-tight">{loading ? '...' : stats.resolved}</div>
                        <div className="text-[10px] font-bold text-muted uppercase tracking-widest">{t('user_dashboard.resolved')}</div>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-5 group hover:-translate-y-1 transition-all">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-lg shadow-primary/5">
                        <FiActivity size={24} />
                    </div>
                    <div>
                        <div className="text-3xl font-black text-main leading-tight">{loading ? '...' : stats.total}</div>
                        <div className="text-[10px] font-bold text-muted uppercase tracking-widest">{t('user_dashboard.total_requests')}</div>
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden shadow-xl border-card-border">
                <div className="p-6 border-b border-card-border flex justify-between items-center bg-white/5">
                    <h3 className="font-black text-xl text-main tracking-tight">{t('user_dashboard.recent_tickets')}</h3>
                    <button onClick={fetchData} className="text-primary hover:opacity-80 text-xs font-black uppercase tracking-widest transition-all">Refresh</button>
                </div>
                <div className="divide-y divide-card-border">
                    {loading ? (
                        <div className="p-12 text-center text-muted font-bold animate-pulse">Loading tickets...</div>
                    ) : recentTickets.length > 0 ? (
                        recentTickets.map((ticket) => (
                            <div key={ticket.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                    <span className="text-xs font-black text-primary font-mono bg-primary/5 px-2 py-1 rounded">#TKT-{ticket.id}</span>
                                    <span className="text-sm font-bold text-main group-hover:text-primary transition-colors truncate max-w-[300px]">{ticket.subject}</span>
                                    <span className="text-[10px] font-black text-muted uppercase tracking-tighter opacity-70">({ticket.category})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${ticket.status === 'open' ? 'bg-primary/10 text-primary border border-primary/20' :
                                        ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted/10 text-muted border border-muted/20'
                                        }`}>
                                        {t(`tickets.values.${ticket.status}`)}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-muted font-black uppercase tracking-widest text-xs">No tickets found.</div>
                    )}
                </div>
            </div>

            {/* Create Ticket Modal */}
            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setPreFilledData(null);
                }}
                preFilledData={preFilledData}
                onCreate={async (newTicketData) => {
                    try {
                        const payload = {
                            subject: newTicketData.title || newTicketData.subject,
                            description: newTicketData.description,
                            priority: newTicketData.priority.toLowerCase(),
                            category: newTicketData.category,
                            subcategory: newTicketData.subcategory,
                            attachments: newTicketData.attachments
                        };

                        await api.post('/api/tickets/', payload);
                        fetchData();
                        if (onRefresh) onRefresh();
                    } catch (error) {
                        console.error("Failed to create ticket", error);
                        alert("Failed to create ticket. Please try again.");
                    }
                }}
            />

            {/* AI Concierge Modal */}
            <AnimatePresence>
                {isConciergeOpen && (
                    <AiConciergeModal
                        onClose={() => setIsConciergeOpen(false)}
                        onProceedToTicket={(data) => {
                            if (data) {
                                setPreFilledData(data);
                            }
                            setIsConciergeOpen(false);
                            setIsCreateModalOpen(true);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const UserDashboard = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || localStorage.getItem(`activeTab_${user?.role}`) || 'dashboard');
    const [refreshKey, setRefreshKey] = useState(0);

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

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <DashboardLayout activeTab={activeTab} userRole="user" onTabChange={setActiveTab}>
            {activeTab === 'dashboard' && (
                <UserStatsView
                    user={user}
                    onRefresh={(tab) => tab ? setActiveTab(tab) : handleRefresh()}
                    key={refreshKey}
                />
            )}
            {activeTab === 'tickets' && <TicketList userRole="user" currentUserId={user?.id} />}

            {activeTab === 'sla' && <div className="p-8">My SLAs (Placeholder)</div>}
            {activeTab === 'profile' && <UserProfileView />}
            {activeTab === 'expenses' && <ExpenseDashboard />}
        </DashboardLayout>
    );
};

export default UserDashboard;
