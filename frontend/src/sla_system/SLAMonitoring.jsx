import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    FiClock, FiAlertTriangle, FiCheckCircle, FiTrendingUp,
    FiActivity, FiShield, FiSettings, FiDownload, FiRefreshCw,
    FiMoreVertical, FiArrowRight, FiBarChart2, FiCalendar, FiBell, FiAlertCircle
} from 'react-icons/fi';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../api/axios';

const SLAMonitoring = ({ userRole, onTabChange }) => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState({
        complianceRate: 98.5,
        activeEscalations: 3,
        avgResponseTime: "4m 30s",
        breachPrevention: 12,
        totalTickets: 1248,
        resolved: 1189
    });

    const [atRiskTickets, setAtRiskTickets] = useState([]);
    const [recentHistory, setRecentHistory] = useState([]); // New History State
    const [slaBreakdown, setSlaBreakdown] = useState({
        compliant: 0,
        atRisk: 0,
        breached: 0
    });

    // New state for dynamic filtering
    const [timeRange, setTimeRange] = useState('weekly');
    const [trendData, setTrendData] = useState([]);

    // Live data from API
    const [hourlyData, setHourlyData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);

    useEffect(() => {
        fetchSLAData();
        const timer = setInterval(() => {
            setCurrentDate(new Date());
            fetchSLAData(true); // Silent refresh
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(timer);
    }, [timeRange]); // Add timeRange as dependency

    const fetchSLAData = async (silent = false) => {
        try {
            const [monRes] = await Promise.all([
                api.get('/api/sla/monitoring', { params: { time_range: timeRange } })
            ]);

            if (monRes.data?.stats) setStats(monRes.data.stats);
            if (monRes.data?.atRiskTickets) setAtRiskTickets(monRes.data.atRiskTickets);
            if (monRes.data?.slaBreakdown) setSlaBreakdown(monRes.data.slaBreakdown);
            // Use trendData for dynamic chart
            if (monRes.data?.trendData) setTrendData(monRes.data.trendData);
            if (monRes.data?.categoryData) setCategoryData(monRes.data.categoryData);
            if (monRes.data?.recentHistory) setRecentHistory(monRes.data.recentHistory); // Set History
        } catch (error) {
            console.error('Failed to fetch SLA data:', error);
        }
    };

    // --- Custom Components for "Dark/Premium" Look ---

    const DottedGauge = () => {
        const total = (slaBreakdown?.compliant || 0) + (slaBreakdown?.atRisk || 0) + (slaBreakdown?.breached || 0);
        const dots = 30; // Number of dots in the circle
        const radius = 40;
        const center = 50;

        // Calculate status distribution for dots
        const compliantDots = total > 0 ? Math.round(((slaBreakdown.compliant || 0) / total) * dots) : 0;
        const atRiskDots = total > 0 ? Math.round(((slaBreakdown.atRisk || 0) / total) * dots) : 0;
        // Remaining are breached
        const breachedDots = dots - compliantDots - atRiskDots;

        return (
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 100 100">
                    {/* Render Dots */}
                    {Array.from({ length: dots }).map((_, i) => {
                        const angle = (i / dots) * 360 - 90; // Start from top
                        const x = center + radius * Math.cos((angle * Math.PI) / 180);
                        const y = center + radius * Math.sin((angle * Math.PI) / 180);

                        let color = "#374151"; // Default Gray-700
                        if (i < compliantDots) color = "#10b981"; // Emerald
                        else if (i < compliantDots + atRiskDots) color = "#f59e0b"; // Amber
                        else if (total > 0) color = "#ef4444"; // Red (Breached)

                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="2.5"
                                fill={color}
                                className="transition-colors duration-500"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{total}</span>
                    <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Tickets</span>
                </div>
            </div>
        );
    };

    const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0F1116] p-6 text-slate-900 dark:text-gray-100 font-sans transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">SLA Monitoring</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                        <FiCalendar className="text-indigo-500" />
                        {timeRange === 'yearly'
                            ? currentDate.toLocaleDateString('en-US', { year: 'numeric' })
                            : timeRange === 'monthly'
                                ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                : currentDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-xs font-semibold text-emerald-500">Live Updates</span>
                    </div>
                    <button onClick={() => fetchSLAData(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <FiRefreshCw className="text-gray-500" />
                    </button>

                </div>
            </div>

            {/* Main Grid */}
            <div className="space-y-6">

                {/* Top Row: Chart */}
                <div className="bg-white dark:bg-[#15171E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Resolved vs Breached Trend</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ticket volume over time</p>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                            {['weekly', 'monthly', 'yearly'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${timeRange === range
                                        ? 'bg-white dark:bg-[#252836] text-indigo-600 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} barGap={8}>
                                <defs>
                                    <pattern id="striped" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                        <rect width="4" height="8" transform="translate(0,0)" fill="#4B5563" opacity="0.3"></rect>
                                    </pattern>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.2} />
                                <XAxis
                                    dataKey="label"
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1E293B',
                                        borderColor: '#334155',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '12px'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="resolved" name="Resolved" fill="#64748b" radius={[2, 2, 0, 0]} barSize={12} />
                                <Bar dataKey="breached" name="Breached" fill="#f97316" radius={[2, 2, 0, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bottom Row: 3 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* 1. Category Performance */}
                    <div className="bg-white dark:bg-[#15171E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800/50 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Category Performance</h3>
                            <FiMoreVertical className="text-gray-400 cursor-pointer" />
                        </div>
                        <div className="flex-1 relative min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="onTime"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Available Label Overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white shadow-black drop-shadow-md">{stats.complianceRate}%</span>
                                <span className="text-[10px] text-gray-400">Compliance</span>
                            </div>
                        </div>
                        {/* Legend */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {categoryData.slice(0, 4).map((cat, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{cat.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Severity Ticket (Dotted Gauge) */}
                    <div className="bg-white dark:bg-[#15171E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800/50">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Ticket Status</h3>
                            <FiMoreVertical className="text-gray-400 cursor-pointer" />
                        </div>

                        <DottedGauge />

                        <div className="space-y-3 mt-4 px-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded bg-emerald-500"></div>
                                    <span className="text-xs text-gray-400">Compliant</span>
                                </div>
                                <span className="text-xs font-bold text-white">{slaBreakdown.compliant}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded bg-amber-500"></div>
                                    <span className="text-xs text-gray-400">At Risk</span>
                                </div>
                                <span className="text-xs font-bold text-white">{slaBreakdown.atRisk}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded bg-red-500"></div>
                                    <span className="text-xs text-gray-400">Breached</span>
                                </div>
                                <span className="text-xs font-bold text-white">{slaBreakdown.breached}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Critical Alerts (Alarms Alert) */}
                    <div className="bg-white dark:bg-[#15171E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800/50 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Critical Alerts</h3>
                            <FiMoreVertical className="text-gray-400 cursor-pointer" />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[250px] custom-scrollbar">
                            {atRiskTickets.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <FiCheckCircle size={24} className="mb-2 opacity-50 text-emerald-500" />
                                    <span className="text-xs">System Healthy</span>
                                </div>
                            ) : (
                                atRiskTickets.slice(0, 5).map(ticket => (
                                    <div key={ticket.id} className="relative pl-4 group">
                                        <div className={`absolute left-0 top-1 w-1 h-full rounded-full ${ticket.slaStatus === 'Breached' ? 'bg-red-500' : 'bg-amber-500'
                                            }`}></div>

                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-xs font-bold ${ticket.slaStatus === 'Breached' ? 'text-red-400' : 'text-amber-400'
                                                }`}>
                                                {ticket.slaStatus} Alert
                                            </h4>
                                            <span className="text-[10px] text-gray-500">{ticket.timeRemaining}</span>
                                        </div>

                                        <p className="text-[11px] text-gray-400 leading-tight line-clamp-2">
                                            {ticket.subject} - {ticket.id}
                                        </p>
                                        <div className="mt-2 text-[10px] text-gray-600 dark:text-gray-500">
                                            {ticket.department} • {ticket.priority}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* New: Recent Ticket History Table */}
                <div className="bg-white dark:bg-[#15171E] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Recent Ticket History</h3>
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            <span className="text-xs text-gray-500">Live Updates</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                                    <th className="pb-3 pl-2 font-medium">Ticket ID</th>
                                    <th className="pb-3 font-medium">Subject</th>
                                    <th className="pb-3 font-medium">Category</th>
                                    <th className="pb-3 font-medium">Assigned To</th>
                                    <th className="pb-3 font-medium">Updated</th>
                                    <th className="pb-3 font-medium">SLA Status</th>
                                    <th className="pb-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {recentHistory.length > 0 ? (
                                    recentHistory.map((t, i) => (
                                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3 pl-2 font-bold text-gray-700 dark:text-gray-300">{t.id}</td>
                                            <td className="py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{t.subject}</td>
                                            <td className="py-3 text-gray-500 dark:text-gray-500">{t.category}</td>
                                            <td className="py-3 text-gray-500 dark:text-gray-500 flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold">
                                                    {t.assignee.charAt(0)}
                                                </div>
                                                {t.assignee}
                                            </td>
                                            <td className="py-3 text-gray-500 dark:text-gray-500 text-xs">{t.updated}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${t.sla_status === 'Breached'
                                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                    }`}>
                                                    {t.sla_status}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{t.status}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-8 text-center text-gray-400 text-xs">No recent history available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SLAMonitoring;
