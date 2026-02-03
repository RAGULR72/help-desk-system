import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import api, { baseURL } from '../../api/axios';
import {
    FiActivity, FiClock, FiCheckCircle, FiUsers, FiRefreshCw,
    FiArrowUpRight, FiArrowDownRight, FiMoreVertical, FiZap, FiAlertTriangle, FiInfo
} from 'react-icons/fi';
import { RiRoadMapLine, RiWallet3Line } from 'react-icons/ri';
import { motion } from 'framer-motion';
import AdminWorkloadHeatmap from './AdminWorkloadHeatmap';

const CATEGORY_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

const AnalyticsDashboard = () => {
    const [data, setData] = useState(null);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        fetchAnalytics();

        // WebSocket for Real-time Updates
        let ws;
        const connectWS = () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Use the same WS endpoint as chat but listen for 'dashboard_update' events
            const wsBase = baseURL.replace(/^http/, 'ws');
            ws = new WebSocket(`${wsBase}/api/chat/ws?token=${token}`);

            ws.onmessage = (event) => {
                try {
                    const wsData = JSON.parse(event.data);
                    if (wsData.type === 'dashboard_update') {
                        console.info(`[RealTime] Update received from ${wsData.source}. Refreshing...`);
                        fetchAnalytics(true); // Silent refresh
                    }
                } catch (e) {
                    // Ignore non-json or malformed messages
                }
            };

            ws.onclose = () => {
                console.log("[RealTime] WS closed. Reconnecting in 5s...");
                setTimeout(connectWS, 5000);
            };

            ws.onerror = (err) => {
                console.error("[RealTime] WS Error:", err);
                ws.close();
            };
        };

        connectWS();
        return () => {
            if (ws) ws.close();
        };
    }, []);


    const fetchAnalytics = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/api/tickets/analytics/dashboard');
            setData(res.data);
            fetchInsights(true);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchInsights = async (silent = false) => {
        if (!silent) setLoadingInsights(true);
        try {
            const res = await api.get('/api/tickets/analytics/ai-insights');
            setInsights(res.data);
        } catch (err) {
            console.error("Failed to fetch AI insights", err);
        } finally {
            if (!silent) setLoadingInsights(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px] glass-card bg-white/5">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center text-muted glass-card bg-white/5">No data available</div>;

    const { summary, trend_data, category_distribution, resolution_distribution, top_agents } = data;

    return (
        <div className="glass-card p-6 md:p-8 animate-in fade-in duration-500 overflow-hidden relative group border-gray-100 dark:border-slate-800">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-10 relative z-10 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Operational Analytics</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Key performance indicators and help desk throughput.</p>
                </div>
                <button
                    onClick={() => { fetchAnalytics(); fetchInsights(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-slate-100 transition-all active:scale-95 group/refresh"
                >
                    <FiRefreshCw size={16} className={(loading || loadingInsights) ? "animate-spin" : "group-hover/refresh:rotate-180 transition-transform duration-500"} />
                    <span className="text-xs font-semibold">{(loading || loadingInsights) ? "Refreshing..." : "Refresh Data"}</span>
                </button>
            </div>

            {/* AI Insights Section */}
            {insights.length > 0 && (
                <div className="mb-10 relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <FiZap className="text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic">AI Operations Intelligence</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {insights.map((insight, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`p-5 rounded-2xl border flex gap-4 transition-all hover:scale-[1.02] cursor-default shadow-sm ${insight.type === 'warning' ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30' :
                                    insight.type === 'success' ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30' :
                                        'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800/30'
                                    }`}
                            >
                                <div className={`mt-1 shrink-0 ${insight.type === 'warning' ? 'text-amber-500' :
                                    insight.type === 'success' ? 'text-emerald-500' :
                                        'text-indigo-500'
                                    }`}>
                                    {insight.type === 'warning' ? <FiAlertTriangle size={18} /> :
                                        insight.type === 'success' ? <FiCheckCircle size={18} /> :
                                            <FiInfo size={18} />}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{insight.title}</h4>
                                    <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 leading-relaxed">{insight.message}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Row Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
                <StatCard
                    title="Total Tickets"
                    value={summary.totalTickets || summary.total_tickets || 0}
                    trend="+12%"
                    trendUp={true}
                    icon={<FiActivity size={20} />}
                    color="#4f46e5"
                    bgColor="bg-indigo-50/50 dark:bg-indigo-400/10"
                />
                <StatCard
                    title="Avg Resolution"
                    value={`${summary.avgResolutionTime || summary.avg_resolution_time || 0}h`}
                    trend="-18%"
                    trendUp={false}
                    icon={<FiClock size={20} />}
                    color="#f59e0b"
                    bgColor="bg-amber-50/50 dark:bg-amber-400/10"
                />
                <StatCard
                    title="Resolution Rate"
                    value={`${summary.resolutionRate || summary.resolution_rate || 0}%`}
                    trend="+5%"
                    trendUp={true}
                    icon={<FiCheckCircle size={20} />}
                    color="#10b981"
                    bgColor="bg-emerald-50/50 dark:bg-emerald-400/10"
                />
                <StatCard
                    title="Active Techs"
                    value={summary.activeAgents || summary.active_agents || 0}
                    trend={(summary.onLeave || summary.on_leave) > 0 ? `${summary.onLeave || summary.on_leave} Leave` : 'All Active'}
                    trendUp={(summary.onLeave || summary.on_leave) === 0}
                    icon={<FiUsers size={20} />}
                    color="#8b5cf6"
                    bgColor="bg-purple-50/50 dark:bg-purple-400/10"
                />
            </div>

            {/* Workload Heatmap - Admin Focus */}
            <div className="mb-10 relative z-10">
                <AdminWorkloadHeatmap />
            </div>

            {/* Second Row: Trend and Categories */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 relative z-10">
                {/* Ticket Performance Trend */}
                <div className="xl:col-span-2 glass-card p-5 border-gray-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                <FiActivity size={14} />
                            </div>
                            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider italic">Performance Trend</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest italic">Created</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest italic">Resolved</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full h-[240px] min-w-0">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trend_data}>
                                    <defs>
                                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        dx={-5}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="created"
                                        stroke="#4f46e5"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#colorCreated)"
                                        animationDuration={1500}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="resolved"
                                        stroke="#10b981"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#colorResolved)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Tickets by Category */}
                <div className="glass-card p-5 border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <FiActivity size={14} style={{ transform: 'rotate(90deg)' }} />
                        </div>
                        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider italic">Categories</h3>
                    </div>
                    <div className="h-[200px] w-full flex items-center justify-center min-w-0">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={category_distribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {category_distribution.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}
                                    />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => (
                                            <span className="text-gray-600 dark:text-gray-400 font-bold text-[9px] ml-1 uppercase tracking-widest">{value}</span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Third Row: Time Distribution and Top Agents */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
                {/* Resolution Time Distribution */}
                <div className="glass-card p-5 border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <FiClock size={14} />
                        </div>
                        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider italic">Resolution Speed</h3>
                    </div>
                    <div className="h-[200px] w-full min-w-0">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={resolution_distribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                                        dy={5}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                                        dx={-5}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc', radius: 4 }}
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                    />
                                    <Bar
                                        dataKey="value"
                                        fill="#4f46e5"
                                        radius={[6, 6, 0, 0]}
                                        barSize={28}
                                    >
                                        {resolution_distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Top Performing Agents */}
                <div className="glass-card p-5 border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <FiUsers size={14} />
                        </div>
                        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider italic">Elite Technicians</h3>
                    </div>
                    <div className="space-y-2">
                        {top_agents.map((agent, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-gray-50 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-[10px] font-bold text-indigo-600 rounded-lg">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight">{agent.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[8px] text-gray-400 font-semibold uppercase tracking-widest">{agent.tickets} Tickets</span>
                                            <span className="text-[8px] text-indigo-500 font-bold uppercase tracking-tighter">AVG {agent.avgTime || agent.avg_time}H</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-emerald-500 text-[10px] font-bold italic">
                                        {agent.satisfaction}%
                                    </div>
                                    <span className="text-[7px] text-gray-400 font-bold uppercase tracking-[0.1em] block">S-Index</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, trend, trendUp, icon, color, bgColor }) => (
    <div className={`glass-card p-4 flex items-center justify-between border-gray-100 dark:border-slate-800 transition-all hover:scale-[1.02] ${bgColor}`}>
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm`} style={{ backgroundColor: `${color}15`, color: color }}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em]">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">{value}</h3>
                    <div className={`flex items-center text-[10px] font-bold ${trendUp ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {trendUp ? <FiArrowUpRight size={10} /> : <FiArrowDownRight size={10} />}
                        <span>{trend}</span>
                    </div>
                </div>
            </div>
        </div>
        <div className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
            <FiMoreVertical className="text-gray-400" size={16} />
        </div>
    </div>
);

export default AnalyticsDashboard;
