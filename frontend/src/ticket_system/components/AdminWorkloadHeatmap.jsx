import React, { useState, useEffect } from 'react';
import api, { baseURL } from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiInfo, FiActivity, FiUser, FiZap, FiCheckCircle, FiClock, FiAlertTriangle } from 'react-icons/fi';

const AdminWorkloadHeatmap = () => {
    const [heatmap, setHeatmap] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHeatmap();
        const interval = setInterval(fetchHeatmap, 60000); // Auto-refresh every minute
        return () => clearInterval(interval);
    }, []);

    const fetchHeatmap = async () => {
        try {
            const res = await api.get('/api/auto-assignment/workload-heatmap');
            setHeatmap(res.data);
        } catch (err) {
            console.error("Failed to fetch heatmap", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="text-xs font-bold text-slate-400">Generating heatmap...</span>
                </div>
            </div>
        );
    }

    if (!heatmap || heatmap.technicians.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <FiUsers size={48} className="text-slate-300 mb-4" />
                <p className="text-sm font-bold text-slate-500">No active technicians found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                        <FiZap size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Live workload heatmap</h3>
                        <p className="text-[10px] text-slate-500 font-bold">Real-time technician capacity & availability</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[9px] font-black text-slate-500">Online</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        <span className="text-[9px] font-black text-slate-500">Offline</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {heatmap.technicians.map((tech, idx) => {
                    const usagePercent = (tech.active_tickets / tech.max_capacity) * 100;
                    let intensityColor = "bg-emerald-500";
                    let labelColor = "text-emerald-600";
                    let bgColor = "bg-emerald-50/50 dark:bg-emerald-900/10";
                    let borderColor = "border-emerald-100 dark:border-emerald-900/30";

                    if (usagePercent >= 80) {
                        intensityColor = "bg-rose-500";
                        labelColor = "text-rose-600";
                        bgColor = "bg-rose-50/50 dark:bg-rose-900/10";
                        borderColor = "border-rose-100 dark:border-rose-900/30";
                    } else if (usagePercent >= 50) {
                        intensityColor = "bg-amber-500";
                        labelColor = "text-amber-600";
                        bgColor = "bg-amber-50/50 dark:bg-amber-900/10";
                        borderColor = "border-amber-100 dark:border-amber-900/30";
                    }

                    return (
                        <motion.div
                            key={tech.user_id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`p-4 rounded-3xl border ${borderColor} ${bgColor} transition-all hover:scale-[1.02] hover:shadow-xl relative overflow-hidden group`}
                        >
                            {/* Visual Pulse for online status */}
                            {tech.is_online && (
                                <div className="absolute top-4 right-4 h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </div>
                            )}
                            {!tech.is_online && (
                                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                            )}

                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative">
                                    {tech.avatar_url ? (
                                        <img
                                            src={tech.avatar_url.startsWith('http') ? tech.avatar_url : `${baseURL}${tech.avatar_url.startsWith('/') ? '' : '/'}${tech.avatar_url}`}
                                            alt=""
                                            className="w-10 h-10 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-sm border-2 border-white dark:border-slate-800 shadow-sm">
                                            {tech.full_name[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{tech.full_name}</h4>
                                    <p className="text-[9px] font-bold text-slate-400 truncate">@{tech.username}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-end mb-1.5 px-1">
                                        <span className="text-[9px] font-black text-slate-500">Heat index</span>
                                        <span className={`text-[10px] font-black ${labelColor}`}>{Math.round(usagePercent)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${usagePercent}%` }}
                                            transition={{ duration: 1, ease: "circOut" }}
                                            className={`h-full rounded-full ${intensityColor} ${usagePercent > 0 ? 'shadow-[0_0_8px_rgba(var(--intensity-rgb),0.5)]' : ''}`}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                                    <div className="text-center">
                                        <div className="text-xs font-black text-slate-900 dark:text-white leading-none mb-0.5">{tech.active_tickets}</div>
                                        <span className="text-[7px] font-black text-slate-400">Active</span>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-black text-slate-900 dark:text-white leading-none mb-0.5">{tech.max_capacity}</div>
                                        <span className="text-[7px] font-black text-slate-400">Limit</span>
                                    </div>
                                    <div className="text-center">
                                        <div className={`text-xs font-black leading-none mb-0.5 ${tech.status === 'available' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            {tech.status === 'available' ? <FiCheckCircle className="mx-auto" /> : <FiClock className="mx-auto" />}
                                        </div>
                                        <span className="text-[7px] font-black text-slate-400">Level</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminWorkloadHeatmap;
