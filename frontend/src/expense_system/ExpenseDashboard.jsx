import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiFileText, FiTrendingUp, FiSend,
    FiCheck, FiX, FiClock, FiMapPin, FiCalendar,
    FiPlus, FiMoreVertical, FiDownload, FiFilter,
    FiCoffee, FiHome, FiShoppingBag, FiTag, FiGrid, FiSettings, FiShield, FiTarget,
    FiNavigation, FiTruck, FiEdit3, FiTrash2, FiHash
} from 'react-icons/fi';
import { FaMotorcycle, FaCar, FaBus, FaTrain, FaSubway, FaTaxi } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import DashboardLayout from '../ticket_system/components/DashboardLayout';
import { useToast } from '../context/ToastContext';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CATEGORIES = [
    { id: 'Travel', icon: <FiMapPin />, color: 'bg-orange-500' },
    { id: 'Meals', icon: <FiCoffee />, color: 'bg-emerald-500' },
    { id: 'Accommodation', icon: <FiHome />, color: 'bg-blue-500' },
    { id: 'Equipment', icon: <FiGrid />, color: 'bg-purple-500' },
    { id: 'Office Supplies', icon: <FiShoppingBag />, color: 'bg-pink-500' },
    { id: 'Other', icon: <FiTag />, color: 'bg-slate-500' },
];

const ExpenseDashboard = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        expense_reports: { saved: 0, submitted: 0, pending: 0, approved: 0, rejected: 0 },
        expense_claims: { saved: 0, submitted: 0, pending: 0, approved: 0, rejected: 0, paid: 0 },
        advances: { saved: 0, submitted: 0, pending: 0, approved: 0, rejected: 0 },
        trip_requests: { saved: 0, submitted: 0, pending: 0, approved: 0, rejected: 0 },
        recent_transactions: [],
        spend_trend: []
    });

    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(null); // 'expense', 'report', 'advance', 'trip'
    const [showTutorial, setShowTutorial] = useState(true);
    const [viewMode, setViewMode] = useState('personal'); // 'personal', 'team', 'admin'
    const [adminPeriod, setAdminPeriod] = useState('monthly');
    const [teamChartPeriod, setTeamChartPeriod] = useState('monthly'); // 'monthly', 'weekly'
    const [adminStats, setAdminStats] = useState({ user_summaries: [], category_breakdown: [], total_spend: 0 });
    const [overriding, setOverriding] = useState(null); // { type, id, amount }
    const [overrideForm, setOverrideForm] = useState({ amount: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);
    const [rejecting, setRejecting] = useState(null); // { type, id }
    const [rejectionReason, setRejectionReason] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [travelRates, setTravelRates] = useState([]);
    const [editingRate, setEditingRate] = useState(null); // { mode, rate_per_km }
    const [managers, setManagers] = useState([]);
    const [approverConfig, setApproverConfig] = useState({
        primary: { name: 'Not Assigned', is_unavailable: false, status_reason: '' },
        secondary: { name: 'Not Assigned' },
        auto_detect_enabled: false,
        active_approver: ''
    });
    const [idConfig, setIdConfig] = useState({ prefix: 'REI', next_number: 1001 });
    const [settingsTab, setSettingsTab] = useState('travel'); // 'travel', 'approvers', 'id_config'
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (viewMode === 'admin') {
            fetchAdminStats();
        } else if (viewMode === 'settings') {
            fetchTravelRates();
            fetchManagers();
            fetchApproverConfig();
            fetchIdConfig();
        } else {
            fetchDashboard();
        }
    }, [viewMode, adminPeriod]);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/expenses/dashboard?view=${viewMode}`);
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch dashboard', error);
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;
        try {
            await api.delete(`/api/expenses/${type}/${id}`);
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`, 'success');
            fetchDashboard();
        } catch (err) {
            showToast('Failed to delete item', 'error');
        }
    };

    const fetchAdminStats = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/expenses/admin/stats?period=${adminPeriod}`);
            setAdminStats(res.data);
        } catch (error) {
            console.error('Failed to fetch admin stats', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTravelRates = async () => {
        try {
            const res = await api.get('/api/expenses/config/travel-rates');
            setTravelRates(res.data);
        } catch (error) {
            console.error('Failed to fetch travel rates', error);
        }
    };

    const fetchManagers = async () => {
        try {
            const response = await api.get('/api/admin/users');
            const filtered = response.data.filter(u => u.role === 'manager' || u.role === 'admin');
            setManagers(filtered);
        } catch (err) { console.error('Managers fetch failed', err); }
    };

    const fetchApproverConfig = async () => {
        try {
            const response = await api.get('/api/expenses/config/approvers');
            setApproverConfig(response.data);
        } catch (err) { console.error('Approver config fetch failed', err); }
    };

    const handleSaveGlobalApprovers = async (pId, sId, autoDetect) => {
        try {
            await api.post('/api/expenses/config/approvers', {
                primary_id: pId,
                secondary_id: sId,
                auto_detect: autoDetect !== undefined ? autoDetect : approverConfig.auto_detect_enabled
            });
            showToast('Global settings updated', 'success');
            fetchApproverConfig();
        } catch (err) { showToast('Update failed', 'error'); }
    };

    const fetchIdConfig = async () => {
        try {
            const res = await api.get('/api/system/config/expense-sequence');
            setIdConfig(res.data);
        } catch (err) { console.error('ID config fetch failed', err); }
    };

    const handleSaveIdConfig = async () => {
        try {
            await api.put('/api/system/config/expense-sequence', idConfig);
            showToast('ID Generator settings updated', 'success');
            fetchIdConfig();
        } catch (err) { showToast('Update failed', 'error'); }
    };

    const saveTravelRate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/expenses/config/travel-rates', editingRate);
            showToast(`Rate for ${editingRate.mode} updated`, 'success');
            setEditingRate(null);
            fetchTravelRates();
        } catch (error) {
            showToast('Failed to update rate', 'error');
        }
    };

    useEffect(() => {
        if (showSettings) fetchTravelRates();
    }, [showSettings]);

    const handlePay = async (type, id) => {
        try {
            await api.post(`/api/expenses/pay/${type}/${id}`);
            showToast('Claim marked as PAID', 'success');
            fetchDashboard();
        } catch (error) {
            showToast('Payment failed', 'error');
        }
    };

    const handleOverrideApprove = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/expenses/approve/${overriding.type}/${overriding.id}`, {
                overridden_amount: parseFloat(overrideForm.amount),
                override_reason: overrideForm.reason
            });
            showToast('Approved with override', 'success');
            setOverriding(null);
            setOverrideForm({ amount: '', reason: '' });
            fetchDashboard();
        } catch (error) {
            showToast('Override failed', 'error');
        }
    };

    const handleApprove = async (type, id) => {
        try {
            await api.post(`/api/expenses/approve/${type}/${id}`);
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} approved`, 'success');
            fetchDashboard();
        } catch (error) {
            showToast('Approval failed', 'error');
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        if (!rejectionReason) return;

        try {
            await api.post(`/api/expenses/reject/${rejecting.type}/${rejecting.id}`, null, {
                params: { reason: rejectionReason }
            });
            showToast(`${rejecting.type.charAt(0).toUpperCase() + rejecting.type.slice(1)} rejected`, 'success');
            setRejecting(null);
            setRejectionReason('');
            fetchDashboard();
        } catch (error) {
            showToast('Rejection failed', 'error');
        }
    };

    const RupeeIcon = ({ className = "" }) => (
        <span className={`${className} font-bold`}>₹</span>
    );

    const StatCard = ({ title, icon, data, color }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white`}>
                        {icon}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
                </div>
                <FiMoreVertical className="text-gray-400 cursor-pointer" />
            </div>

            <div className="grid grid-cols-4 gap-2 mt-6">
                {[
                    { label: 'Pending', value: (data.saved || 0) + (data.submitted || 0) + (data.pending || 0) },
                    { label: 'Approved', value: data.approved || 0 },
                    { label: 'Rejected', value: data.rejected || 0 },
                    { label: 'Paid', value: data.paid || 0 }
                ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                        <div className="text-xl font-black text-slate-800 dark:text-white mb-0.5">
                            {item.value}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-tight text-center leading-none">
                            {item.label}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    const QuickActionButton = ({ icon, label, onClick, color }) => (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all group w-full`}
        >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        </motion.button>
    );

    const getCategoryColor = (catName) => {
        const cat = CATEGORIES.find(c => c.id === catName);
        return cat ? cat.color : 'bg-slate-500';
    };

    const getTravelModeIcon = (mode) => {
        const m = mode.toLowerCase();
        if (m.includes('bike') || m.includes('rapido')) return <FaMotorcycle size={22} />;
        if (m.includes('car')) return <FaCar size={20} />;
        if (m.includes('bus')) return <FaBus size={20} />;
        if (m.includes('train') && !m.includes('metro')) return <FaTrain size={20} />;
        if (m.includes('metro') || m.includes('subway')) return <FaSubway size={20} />;
        if (m.includes('taxi') || m.includes('auto') || m.includes('uber') || m.includes('ola')) return <FaTaxi size={20} />;
        return <FiNavigation size={20} />;
    };

    const getCategoryIcon = (catName) => {
        const cat = CATEGORIES.find(c => c.id === catName);
        return cat ? cat.icon : <FiTag />;
    };

    const getStatusColor = (status) => {
        const colors = {
            'Saved': 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
            'Submitted': 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
            'Verifying': 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
            'Pending Approval': 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
            'Approved': 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
            'Rejected': 'text-red-500 bg-red-50 dark:bg-red-900/20',
            'Reimbursed': 'text-green-600 bg-green-50 dark:bg-green-900/20',
            'Paid': 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
        };
        return colors[status] || colors['Saved'];
    };

    const isManager = ['admin', 'manager'].includes(user?.role);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0F1116] p-4 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {viewMode === 'team' ? 'Team Expense Overview' : `Welcome, ${user?.full_name || user?.username || 'User'}`}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Effortlessly</span>
                        {viewMode === 'team' ? ' review and manage team claims' : ' manage your expenses now'}
                    </p>
                </div>

                {isManager && (
                    <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm self-start">
                        <button
                            onClick={() => setViewMode('personal')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'personal' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            My Expenses
                        </button>
                        <button
                            onClick={() => setViewMode('team')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'team' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Team Overview
                        </button>
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => setViewMode('admin')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Admin Overview
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('settings')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <FiSettings className={`inline mr-2 ${viewMode === 'settings' ? 'animate-spin-slow text-white' : ''}`} />
                            Settings
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Actions - Only show in Personal View to avoid clutter in Team/Admin view */}
            {viewMode === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <QuickActionButton
                        icon={<RupeeIcon className="text-2xl" />}
                        label="Create Expense"
                        onClick={() => navigate('/expenses/create')}
                        color="from-emerald-500 to-teal-500"
                    />
                    <QuickActionButton
                        icon={<FiTrendingUp size={24} />}
                        label="Advance Request"
                        onClick={() => setShowCreateModal('advance')}
                        color="from-purple-500 to-pink-500"
                    />
                    <QuickActionButton
                        icon={<FiMapPin size={24} />}
                        label="Trip Request"
                        onClick={() => setShowCreateModal('trip')}
                        color="from-orange-500 to-red-600"
                    />
                </div>
            )}

            {/* Admin Statistics View */}
            {viewMode === 'admin' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mb-8">
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <FiTrendingUp size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Admin Financial Summary (₹{adminStats.total_spend.toLocaleString()})</h2>
                        </div>
                        <div className="flex gap-2 p-1 bg-gray-50 dark:bg-slate-700 rounded-xl">
                            {['daily', 'weekly', 'monthly'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setAdminPeriod(p)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${adminPeriod === p ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">User Spending Breakdown</h3>
                            <div className="space-y-4">
                                {adminStats.user_summaries.map(u => (
                                    <div key={u.username} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">{u.username[0].toUpperCase()}</div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{u.name || u.username}</div>
                                                <div className="text-[10px] text-gray-500">{u.claims} claims this {adminPeriod}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">₹{u.amount.toLocaleString()}</div>
                                    </div>
                                ))}
                                {adminStats.user_summaries.length === 0 && <div className="text-center py-8 text-gray-400">No data for this period</div>}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Category Allocation</h3>
                            <div className="space-y-6">
                                {adminStats.category_breakdown.map(c => (
                                    <div key={c.category} className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-bold text-gray-600 dark:text-gray-400">{c.category}</span>
                                            <span className="font-black text-gray-900 dark:text-white">₹{c.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getCategoryColor(c.category)}`}
                                                style={{ width: `${(c.amount / (adminStats.total_spend || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {adminStats.category_breakdown.length === 0 && <div className="text-center py-8 text-gray-400">No data for this period</div>}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Page Content Mapping */}
            {(viewMode === 'personal' || viewMode === 'team') && (
                <div key={viewMode} className="w-full">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <StatCard
                            title="Expense Claims"
                            icon={<FiTag />}
                            data={stats.expense_claims}
                            color="from-emerald-500 to-teal-600"
                        />
                        <StatCard
                            title="Advances"
                            icon={<FiTrendingUp />}
                            data={stats.advances}
                            color="from-purple-500 to-pink-600"
                        />
                        <StatCard
                            title="Travel Requests"
                            icon={<FiMapPin />}
                            data={stats.trip_requests}
                            color="from-orange-500 to-red-600"
                        />
                    </div>

                    {/* Team Analytics Chart Section */}
                    {viewMode === 'team' && stats.spend_trend?.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm mb-8"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                                            <FiTrendingUp size={20} />
                                        </div>
                                        Team Expense Analytics
                                    </h3>
                                    <p className="text-sm text-gray-500 font-medium mt-1">
                                        {teamChartPeriod === 'monthly' ? 'Monitoring team spend behavior over the last 6 months' : 'Tracking claim processing frequency over the last 8 weeks'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-slate-700/50 rounded-2xl border border-gray-100 dark:border-slate-600 self-start">
                                    <button
                                        onClick={() => setTeamChartPeriod('monthly')}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${teamChartPeriod === 'monthly' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Monthly Spend
                                    </button>
                                    <button
                                        onClick={() => setTeamChartPeriod('weekly')}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${teamChartPeriod === 'weekly' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Weekly Claims
                                    </button>
                                </div>
                            </div>

                            <div className="h-[350px] w-full min-h-[350px] relative overflow-hidden">
                                {isMounted && (
                                    <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                                        <AreaChart data={teamChartPeriod === 'monthly' ? (stats.spend_trend || []) : (stats.weekly_trend || [])}>
                                            <defs>
                                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={teamChartPeriod === 'monthly' ? '#6366f1' : '#10b981'} stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor={teamChartPeriod === 'monthly' ? '#6366f1' : '#10b981'} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                                tickFormatter={(value) => teamChartPeriod === 'monthly' ? `₹${value}` : value}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0/0.1)' }}
                                                formatter={(value) => [teamChartPeriod === 'monthly' ? `₹${value.toLocaleString()}` : `${value} Claims`, teamChartPeriod === 'monthly' ? 'Total Amount' : 'Volume']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey={teamChartPeriod === 'monthly' ? "amount" : "count"}
                                                stroke={teamChartPeriod === 'monthly' ? "#6366f1" : "#10b981"}
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorTrend)"
                                                isAnimationActive={true}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </motion.div>
                    )}
                    {/* Tutorial / Transactions section continues below */}
                </div>
            )}

            {viewMode === 'settings' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-[#4AA4FF]" />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                    <FiSettings className="text-indigo-500" />
                                    Expense Module Configuration
                                </h2>
                                <p className="text-sm text-gray-500 font-medium mt-1">Manage global travel rates and approval workflow logic</p>
                            </div>

                            <div className="flex p-1.5 bg-gray-50 dark:bg-slate-700 rounded-2xl border border-gray-100 dark:border-slate-600">
                                <button
                                    onClick={() => setSettingsTab('travel')}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${settingsTab === 'travel' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Travel Rates
                                </button>
                                <button
                                    onClick={() => setSettingsTab('approvers')}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${settingsTab === 'approvers' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Approvers
                                </button>
                                <button
                                    onClick={() => setSettingsTab('id_config')}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${settingsTab === 'id_config' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    ID Config
                                </button>
                            </div>
                        </div>

                        {settingsTab === 'travel' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Configured Rates</h3>
                                        <button
                                            onClick={() => setEditingRate({ mode: '', rate_per_km: 0, is_new: true })}
                                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                        >
                                            <FiPlus /> Add Mode
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {travelRates.map(rate => (
                                            <div key={rate.mode} className="flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-indigo-500/30 transition-all group shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 text-indigo-500 flex items-center justify-center font-black text-xl shadow-sm border border-indigo-50">
                                                        {getTravelModeIcon(rate.mode)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">{rate.mode}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase">₹{rate.rate_per_km} / KM</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setEditingRate(rate)}
                                                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-indigo-600"
                                                >
                                                    <FiSettings size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {editingRate ? (
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-[#4AA4FF]/5 rounded-3xl p-6 border border-[#4AA4FF]/20">
                                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                                <div className="p-1.5 bg-white rounded-lg shadow-sm font-black text-[#4AA4FF] border border-[#4AA4FF]/20"><FiTarget /></div>
                                                {editingRate.is_new ? 'New Travel Mode' : 'Edit Travel Mode'}
                                            </h3>
                                            <form onSubmit={saveTravelRate} className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Mode Name</label>
                                                    <input
                                                        disabled={!editingRate.is_new}
                                                        className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-[#4AA4FF]/20 outline-none"
                                                        value={editingRate.mode}
                                                        onChange={e => setEditingRate({ ...editingRate, mode: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Rate per KM (₹)</label>
                                                    <input
                                                        type="number" step="0.01"
                                                        className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-[#4AA4FF]/20 outline-none"
                                                        value={editingRate.rate_per_km}
                                                        onChange={e => setEditingRate({ ...editingRate, rate_per_km: parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={() => setEditingRate(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-wider">Cancel</button>
                                                    <button type="submit" className="flex-1 py-3 bg-[#4AA4FF] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#4AA4FF]/30">Save</button>
                                                </div>
                                            </form>
                                        </motion.div>
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-10 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-4 shadow-sm border border-slate-100">
                                                <FiMapPin size={32} />
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-[150px]">Select a mode to edit or add new</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {settingsTab === 'approvers' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="p-6 rounded-3xl border border-rose-100 bg-rose-50/30 flex items-center justify-between shadow-sm">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest">Intelligent Attendance Link</h4>
                                            <p className="text-[11px] text-slate-500 font-medium max-w-[280px]">Automatically swap approvers if Primary Manager hasn't punched in via Attendance System.</p>
                                        </div>
                                        <button
                                            onClick={() => handleSaveGlobalApprovers(approverConfig.primary.id, approverConfig.secondary.id, !approverConfig.auto_detect_enabled)}
                                            className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner ${approverConfig.auto_detect_enabled ? 'bg-rose-500' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ${approverConfig.auto_detect_enabled ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Manager Assignment</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="p-5 bg-emerald-50 content-border rounded-3xl border border-emerald-100/50 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-black text-emerald-600 uppercase flex items-center gap-1.5"><FiShield size={12} /> Primary</span>
                                                    {approverConfig.primary.is_unavailable && <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 italic">{approverConfig.primary.status_reason}</span>}
                                                </div>
                                                <select
                                                    className="w-full bg-white border border-emerald-200/50 p-3.5 rounded-2xl text-sm font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-emerald-500/10 outline-none"
                                                    value={approverConfig.primary.id || ''}
                                                    onChange={e => handleSaveGlobalApprovers(e.target.value, approverConfig.secondary.id)}
                                                >
                                                    <option value="">Select Primary Manager...</option>
                                                    {managers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
                                                </select>
                                            </div>

                                            <div className="p-5 bg-blue-50 content-border rounded-3xl border border-blue-100/50 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-black text-blue-600 uppercase flex items-center gap-1.5"><FiClock size={12} /> Secondary (Backup)</span>
                                                    {approverConfig.primary.is_unavailable && <span className="text-[9px] font-black text-blue-600 bg-blue-100/50 px-2.5 py-1 rounded-lg animate-pulse">SYSTEM ACTIVE</span>}
                                                </div>
                                                <select
                                                    className="w-full bg-white border border-blue-200/50 p-3.5 rounded-2xl text-sm font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-500/10 outline-none"
                                                    value={approverConfig.secondary.id || ''}
                                                    onChange={e => handleSaveGlobalApprovers(approverConfig.primary.id, e.target.value)}
                                                >
                                                    <option value="">Select Secondary Manager...</option>
                                                    {managers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200">
                                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-indigo-500 shadow-2xl shadow-indigo-500/10 border border-white mb-6 animate-float">
                                        <FiShield size={32} />
                                    </div>
                                    <h5 className="text-sm font-black text-slate-700 mb-2">Automated Approval Bridge</h5>
                                    <p className="text-xs text-slate-500 font-medium max-w-[280px] leading-relaxed">
                                        The system monitor's the <b>Primary Manager's</b> live status. If unavailable, authority seamlessly shifts to the <b>Secondary Manager</b>.
                                    </p>
                                    <div className="mt-8 flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-75" />
                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse delay-150" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {settingsTab === 'id_config' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600">
                                                <FiHash size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest leading-none">ID Prefix</h4>
                                                <p className="text-[10px] text-gray-500 font-bold mt-1">Example: REI, EXP, CLM</p>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-lg font-black text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                            value={idConfig.prefix}
                                            onChange={(e) => setIdConfig({ ...idConfig, prefix: e.target.value })}
                                            placeholder="REI"
                                        />
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600">
                                                <FiTarget size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest leading-none">Starting Number</h4>
                                                <p className="text-[10px] text-gray-500 font-bold mt-1">Next claim will use this number</p>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-lg font-black text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                            value={idConfig.next_number}
                                            onChange={(e) => setIdConfig({ ...idConfig, next_number: parseInt(e.target.value) })}
                                            placeholder="1001"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSaveIdConfig}
                                        className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Save Configuration
                                    </button>
                                </div>

                                <div className="bg-indigo-50 dark:bg-indigo-500/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center border border-indigo-100/50">
                                    <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-indigo-600 shadow-2xl shadow-indigo-500/10 border border-indigo-50 mb-6">
                                        <FiTag size={40} />
                                    </div>
                                    <h5 className="text-lg font-black text-slate-800 dark:text-white mb-3">Professional ID System</h5>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[280px]">
                                        Your claims will be generated as <b>{idConfig.prefix}{idConfig.next_number}</b>, <b>{idConfig.prefix}{idConfig.next_number + 1}</b>, and so on. This maintains a clean and traceable audit trail.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Admin Statistics & Transactions view logic below */}
            {viewMode === 'admin' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mb-8">
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <FiTrendingUp size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Admin Financial Summary (₹{adminStats.total_spend.toLocaleString()})</h2>
                        </div>
                        <div className="flex gap-2 p-1 bg-gray-50 dark:bg-slate-700 rounded-xl">
                            {['daily', 'weekly', 'monthly'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setAdminPeriod(p)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${adminPeriod === p ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">User Spending Breakdown</h3>
                            <div className="space-y-4">
                                {adminStats.user_summaries.map(u => (
                                    <div key={u.username} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">{u.username[0].toUpperCase()}</div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{u.name || u.username}</div>
                                                <div className="text-[10px] text-gray-500">{u.claims} claims this {adminPeriod}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">₹{u.amount.toLocaleString()}</div>
                                    </div>
                                ))}
                                {adminStats.user_summaries.length === 0 && <div className="text-center py-8 text-gray-400">No data for this period</div>}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Category Allocation</h3>
                            <div className="space-y-6">
                                {adminStats.category_breakdown.map(c => (
                                    <div key={c.category} className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-bold text-gray-600 dark:text-gray-400">{c.category}</span>
                                            <span className="font-black text-gray-900 dark:text-white">₹{c.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getCategoryColor(c.category)}`}
                                                style={{ width: `${(c.amount / (adminStats.total_spend || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {adminStats.category_breakdown.length === 0 && <div className="text-center py-8 text-gray-400">No data for this period</div>}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Recent Transactions & Tutorial - Only on personal/team views */}
            {(viewMode === 'personal' || viewMode === 'team') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Transactions - 2/3 width */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {viewMode === 'team' ? 'Recent Team Activity' : 'Recent Transactions'}
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={fetchDashboard} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <FiFilter className="text-gray-500" />
                                </button>
                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <FiDownload className="text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[300px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <span className="text-sm text-gray-500">Loading transactions...</span>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left pb-3 font-semibold uppercase tracking-wider">Category</th>
                                            {viewMode === 'team' && <th className="text-left pb-3 font-semibold uppercase tracking-wider">Requester</th>}
                                            <th className="text-left pb-3 font-semibold uppercase tracking-wider">ID</th>
                                            <th className="text-left pb-3 font-semibold uppercase tracking-wider">Date</th>
                                            <th className="text-right pb-3 font-semibold uppercase tracking-wider">Amount</th>
                                            <th className="text-center pb-3 font-semibold uppercase tracking-wider">Status</th>
                                            <th className="text-right pb-3 font-semibold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {stats.recent_transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={viewMode === 'team' ? 7 : 5} className="text-center py-12 text-gray-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <FiFileText size={32} className="opacity-20" />
                                                        <span>No transactions found</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            stats.recent_transactions.map((txn, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
                                                    <td className="py-4 text-sm text-gray-700 dark:text-gray-300">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl ${getCategoryColor(txn.category)} flex items-center justify-center text-white shadow-sm`}>
                                                                {txn.category === 'Travel' && txn.travel_mode ? getTravelModeIcon(txn.travel_mode) : getCategoryIcon(txn.category)}
                                                            </div>
                                                            <span className="font-semibold">{txn.category === 'Travel' && txn.travel_mode ? txn.travel_mode : txn.category}</span>
                                                        </div>
                                                    </td>
                                                    {viewMode === 'team' && (
                                                        <td className="py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            {txn.requester || 'User'}
                                                        </td>
                                                    )}
                                                    <td className="py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{txn.id}</td>
                                                    <td className="py-4 text-sm text-gray-500 dark:text-gray-400">{txn.date}</td>
                                                    <td className="py-4 text-sm font-bold text-gray-900 dark:text-white text-right">
                                                        ₹ {txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(txn.status)}`}>
                                                            {['Saved', 'Submitted', 'Pending Approval'].includes(txn.status) ? 'Pending' : txn.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {/* Admin Shortcut Actions */}
                                                            {user?.role === 'admin' && (
                                                                <div className="flex gap-2">
                                                                    {(txn.status === 'Submitted' || txn.status === 'Pending Approval') && (
                                                                        <button
                                                                            onClick={() => handleApprove('expense', txn.db_id)}
                                                                            className="p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-200"
                                                                            title="Admin Approve"
                                                                        >
                                                                            <FiCheck />
                                                                        </button>
                                                                    )}
                                                                    {txn.status === 'Approved' && (
                                                                        <button
                                                                            onClick={() => handlePay('expense', txn.db_id)}
                                                                            className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700"
                                                                        >
                                                                            PAY
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {viewMode === 'personal' ? (
                                                                (txn.status !== 'Approved' && txn.status !== 'Paid' && txn.status !== 'Rejected') ? (
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => navigate(`/expenses/edit/${txn.db_id}`)}
                                                                            className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg transition-colors"
                                                                            title="Edit Claim"
                                                                        >
                                                                            <FiEdit3 />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete('expense', txn.db_id)}
                                                                            className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg transition-colors"
                                                                            title="Delete Claim"
                                                                        >
                                                                            <FiTrash2 />
                                                                        </button>
                                                                    </div>
                                                                ) : !(user?.role === 'admin' && txn.status === 'Approved') && (
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase py-1 px-2 bg-gray-50 dark:bg-slate-700 rounded-md">Locked</span>
                                                                )
                                                            ) : (
                                                                (txn.status === 'Submitted' || txn.status === 'Pending Approval') ? (
                                                                    <>
                                                                        {user?.role !== 'admin' && (
                                                                            <button
                                                                                onClick={() => handleApprove('expense', txn.db_id)}
                                                                                className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-lg transition-colors"
                                                                                title="Approve"
                                                                            >
                                                                                <FiCheck />
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => {
                                                                                setOverriding({ type: 'expense', id: txn.db_id, amount: txn.amount });
                                                                                setOverrideForm({ amount: txn.amount, reason: '' });
                                                                            }}
                                                                            className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-600 rounded-lg transition-colors"
                                                                            title="Override & Approve"
                                                                        >
                                                                            <FiGrid />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setRejecting({ type: 'expense', id: txn.db_id })}
                                                                            className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-lg transition-colors"
                                                                            title="Reject"
                                                                        >
                                                                            <FiX />
                                                                        </button>
                                                                    </>
                                                                ) : (txn.status === 'Approved' && user?.role === 'admin') ? null : (
                                                                    <span className="text-xs text-gray-400 italic">No actions</span>
                                                                )
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Tutorial Card - 1/3 width */}
                    <AnimatePresence>
                        {showTutorial && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 relative overflow-hidden border border-indigo-100 dark:border-indigo-800/30"
                            >
                                <button
                                    onClick={() => setShowTutorial(false)}
                                    className="absolute top-4 right-4 p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <FiX />
                                </button>

                                <div className="mb-6">
                                    <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-2 uppercase tracking-widest text-xs">Getting Started</div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                                        Understanding Expense Management
                                    </h3>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                                    The expense module helps you handle your expenses, organize them into reports, and track reimbursement status seamlessly.
                                </p>

                                <div className="space-y-4">
                                    {[
                                        { step: 1, text: "Create your individual expenses" },
                                        { step: 2, text: "Bundle expenses into a Report" },
                                        { step: 3, text: "Submit report for approval" }
                                    ].map((item) => (
                                        <div key={item.step} className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                                                {item.step}
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-400">{item.text}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Placeholder Video/Illustration */}
                                <div className="mt-8 relative h-40 bg-white dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center border border-indigo-100 dark:border-indigo-900 shadow-inner group cursor-pointer overflow-hidden">
                                    <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                                    <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <div className="w-0 h-0 border-t-6 border-t-transparent border-l-10 border-l-white border-b-6 border-b-transparent ml-1"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-500 mt-3 uppercase tracking-tighter">Tutorial Video</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}


            {/* Reject Modal */}
            <AnimatePresence>
                {rejecting && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reject {rejecting.type}</h3>
                            <form onSubmit={handleReject}>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Reason for rejection</label>
                                <textarea
                                    required
                                    rows="4"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-rose-500 dark:text-white mb-6"
                                    placeholder="Explain why this is being rejected..."
                                />
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setRejecting(null)}
                                        className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 rounded-xl font-bold bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Trip Request Modal */}
            <AnimatePresence>
                {showCreateModal === 'trip' && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-500" />
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Trip Request</h3>
                                <button onClick={() => setShowCreateModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <FiX size={24} className="text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const data = Object.fromEntries(formData.entries());

                                setSubmitting(true);
                                try {
                                    await api.post('/api/expenses/trips/create', {
                                        ...data,
                                        estimated_cost: parseFloat(data.estimated_cost),
                                        start_date: new Date(data.start_date).toISOString(),
                                        end_date: new Date(data.end_date).toISOString()
                                    });
                                    showToast('Trip request submitted', 'success');
                                    setShowCreateModal(null);
                                    fetchDashboard();
                                } catch (error) {
                                    showToast('Failed to submit trip request', 'error');
                                } finally {
                                    setSubmitting(false);
                                }
                            }} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Destination</label>
                                    <input name="destination" required className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm dark:text-white" placeholder="Where are you going?" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
                                        <input name="start_date" type="date" required className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm dark:text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">End Date</label>
                                        <input name="end_date" type="date" required className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm dark:text-white" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Purpose</label>
                                    <textarea name="purpose" required rows="3" className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm dark:text-white resize-none" placeholder="Business purpose of this trip" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Estimated Cost (₹)</label>
                                    <input name="estimated_cost" type="number" required className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm dark:text-white" placeholder="0.00" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(null)} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-600">Cancel</button>
                                    <button type="submit" disabled={submitting} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25">
                                        {submitting ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Advance Request Modal */}
            <AnimatePresence>
                {showCreateModal === 'advance' && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500" />
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Advance Request</h3>
                                <button onClick={() => setShowCreateModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <FiX size={24} className="text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const data = Object.fromEntries(formData.entries());

                                setSubmitting(true);
                                try {
                                    await api.post('/api/expenses/advances/create', {
                                        amount: parseFloat(data.amount),
                                        purpose: data.purpose
                                    });
                                    showToast('Advance request submitted', 'success');
                                    setShowCreateModal(null);
                                    fetchDashboard();
                                } catch (error) {
                                    showToast('Failed to submit advance request', 'error');
                                } finally {
                                    setSubmitting(false);
                                }
                            }} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Amount Required (₹)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</div>
                                        <input name="amount" type="number" required className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 pl-9 text-sm dark:text-white" placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Purpose of Advance</label>
                                    <textarea name="purpose" required rows="4" className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm dark:text-white resize-none" placeholder="Why do you need this advance?" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(null)} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-600">Cancel</button>
                                    <button type="submit" disabled={submitting} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25">
                                        {submitting ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Report Modal */}
            <AnimatePresence>
                {showCreateModal === 'report' && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">New Expense Report</h3>
                                <button onClick={() => setShowCreateModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <FiX size={24} className="text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                const data = Object.fromEntries(formData.entries());

                                setSubmitting(true);
                                try {
                                    await api.post('/api/expenses/reports/create', data);
                                    showToast('Expense report created', 'success');
                                    setShowCreateModal(null);
                                    fetchDashboard();
                                } catch (error) {
                                    showToast('Failed to create report', 'error');
                                } finally {
                                    setSubmitting(false);
                                }
                            }} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Report Title</label>
                                    <input name="title" required className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm dark:text-white" placeholder="e.g., Q1 Travel Expenses" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                    <textarea name="description" required rows="4" className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm dark:text-white resize-none" placeholder="Provide context for this report" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(null)} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-600">Cancel</button>
                                    <button type="submit" disabled={submitting} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                                        {submitting ? 'Creating...' : 'Create Report'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Override Modal */}
            <AnimatePresence>
                {overriding && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Override Claim Amount</h3>
                            <p className="text-sm text-gray-500 mb-6 font-medium">Original Amount: <span className="font-bold text-gray-900 dark:text-white">₹{overriding.amount}</span></p>

                            <form onSubmit={handleOverrideApprove} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Adjusted Amount (₹)</label>
                                    <input
                                        type="number"
                                        required
                                        value={overrideForm.amount}
                                        onChange={(e) => setOverrideForm({ ...overrideForm, amount: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Reason for Adjustment</label>
                                    <textarea
                                        required
                                        rows="3"
                                        value={overrideForm.reason}
                                        onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm dark:text-white resize-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter why you are overriding this amount..."
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setOverriding(null)} className="flex-1 py-4 rounded-2xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-500">Cancel</button>
                                    <button type="submit" className="flex-1 py-4 rounded-2xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">Apply & Approve</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Other Modals (Fallback) */}
            {
                showCreateModal && !['expense', 'trip', 'advance', 'report'].includes(showCreateModal) && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg"><FiPlus /></div>
                                Create {showCreateModal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                                Detailed forms for <b>{showCreateModal}</b> are being finalized. You can currently create standalone expenses which can then be grouped into reports.
                            </p>
                            <button
                                onClick={() => setShowCreateModal(null)}
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                Got it
                            </button>
                        </motion.div>
                    </div>
                )
            }
        </div>
    );
};

export default ExpenseDashboard;
