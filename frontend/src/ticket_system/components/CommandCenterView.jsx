import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiMapPin, FiAlertTriangle, FiTrendingUp,
    FiRefreshCw, FiZap, FiCpu, FiShield
} from 'react-icons/fi';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api from '../../api/axios';

const CommandCenterView = () => {
    const [data, setData] = useState({
        locations: [],
        breaches: [],
        prediction: [],
        live_headcount: 0
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [isMounted, setIsMounted] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/command-center/stats');
            setData(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Failed to load command center data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setIsMounted(true);
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 selection:bg-indigo-500/30">
            {/* Top Navigation / Status Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)]">
                            <FiShield className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter italic">Command Center <span className="text-indigo-500">v3.0</span></h1>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">Real-time Intelligence & Predictive Monitoring</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden lg:block text-right">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">System Status</p>
                        <div className="flex items-center gap-2 justify-end">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                            <p className="text-xs font-bold text-emerald-400">OPERATIONAL</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all group"
                    >
                        <FiRefreshCw className={`text-indigo-400 group-hover:rotate-180 transition-transform duration-700 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Visual Location Matrix (Mocking 3D Surface) */}
                <div className="lg:col-span-2 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/50 rounded-[3rem] border border-slate-800 p-8 relative overflow-hidden h-[500px]"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(79,70,229,0.05)_0%,_transparent_70%)]" />

                        <div className="relative z-10 flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <FiMapPin className="text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] italic">Live Ticket Distribution Matrix</h2>
                            </div>
                            <div className="px-4 py-1.5 bg-cyan-400/10 rounded-full border border-cyan-400/20">
                                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Active Scan</span>
                            </div>
                        </div>

                        {/* Symbolic Map View using CSS Grid & Motion Nodes */}
                        <div className="relative w-full h-[350px] bg-slate-950/30 rounded-3xl border border-slate-800/50 grid grid-cols-10 grid-rows-10 opacity-60 pointer-events-none">
                            {/* Grid Lines */}
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="border-r border-slate-800/10 h-full w-full" />
                            ))}
                        </div>

                        {/* Intersection Points & Nodes */}
                        <div className="absolute inset-x-8 inset-y-24">
                            {data.locations.map((loc, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute"
                                    style={{
                                        left: `${50 + loc.coords[0] * 4}%`,
                                        top: `${50 + loc.coords[1] * 4}%`
                                    }}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-12 h-12 bg-indigo-600/20 rounded-full animate-ping absolute" />
                                        <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)] border-2 border-white relative z-10" />
                                        <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <p className="text-[9px] font-black uppercase tracking-widest bg-slate-950 border border-slate-800 px-2 py-0.5 rounded shadow-xl">
                                                {loc.name} <span className="text-indigo-400 ml-1">{loc.count}</span>
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Predictive Chart Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-slate-900/50 rounded-[2.5rem] border border-slate-800 p-8"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <FiTrendingUp className="text-indigo-400" />
                                    <h2 className="text-sm font-black uppercase tracking-widest italic">AI Volume Forecast</h2>
                                </div>
                                <span className="text-[9px] font-black text-slate-500 uppercase">Next 7 Days</span>
                            </div>
                            <div className="h-[200px] w-full">
                                {isMounted && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.prediction}>
                                            <defs>
                                                <linearGradient id="colorPredict" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="predict"
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorPredict)"
                                                animationDuration={2000}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </motion.div>

                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                            <FiZap className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-150 transition-transform duration-1000" size={180} />
                            <div className="relative z-10">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-8">Live Headcount</h3>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-6xl font-black italic tracking-tighter">{data.live_headcount}</span>
                                    <span className="text-xs font-bold opacity-60 uppercase">Staff Online</span>
                                </div>
                                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 inline-flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-tight">System High Load Efficiency</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Critical Alerts & SLA Breach Matrix */}
                <div className="space-y-8">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 border-b border-slate-800 bg-red-500/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                                    <h2 className="text-sm font-black uppercase tracking-widest text-red-500 italic underline underline-offset-8">Critical SLA Breaches</h2>
                                </div>
                                <span className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase">{data.breaches.length} Alerts</span>
                            </div>
                        </div>

                        <div className="p-8 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {data.breaches.map((b, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ x: 5 }}
                                    className="p-5 bg-slate-950/50 border border-slate-800 rounded-3xl hover:border-red-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${b.priority === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                            {b.priority}
                                        </span>
                                        <span className="text-[8px] font-black text-slate-600 uppercase">#{b.id}</span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-2 mb-4 leading-relaxed">
                                        {b.subject}
                                    </h4>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FiAlertTriangle className="text-red-500" size={12} />
                                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Breached</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 italic">
                                            {new Date(b.breach_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                            {data.breaches.length === 0 && (
                                <div className="py-20 text-center opacity-20">
                                    <FiShield className="mx-auto mb-4" size={48} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">All Systems Compliant</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Quick System Monitor */}
                    <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] relative group">
                        <div className="flex items-center gap-3 mb-8">
                            <FiCpu className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                            <h2 className="text-sm font-black uppercase tracking-widest italic">Core Engine Health</h2>
                        </div>
                        <div className="space-y-6">
                            {[
                                { label: 'AI Inference', val: 98, color: 'bg-indigo-500' },
                                { label: 'Ticket Routing', val: 94, color: 'bg-cyan-400' },
                                { label: 'SLA Engine', val: 100, color: 'bg-emerald-500' }
                            ].map((stat, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                                        <span className="text-slate-500">{stat.label}</span>
                                        <span className="text-slate-300">{stat.val}%</span>
                                    </div>
                                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stat.val}%` }}
                                            className={`h-full ${stat.color}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Aesthetic */}
            <div className="mt-12 pt-8 border-t border-slate-900 text-center opacity-30">
                <p className="text-[10px] font-black uppercase tracking-[0.8em]">End of Transmission | Secure Protocol {lastUpdated.toLocaleTimeString()}</p>
            </div>
        </div>
    );
};

export default CommandCenterView;
