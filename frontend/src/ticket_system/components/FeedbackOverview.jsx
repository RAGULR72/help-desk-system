import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FiStar, FiMessageSquare, FiTrendingUp, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

const FeedbackOverview = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, positive, critical

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const response = await api.get('/api/communication/feedback/summary');
                setSummary(response.data);
            } catch (error) {
                console.error("Failed to fetch feedback summary", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFeedback();
    }, []);

    if (loading) {
        return (
            <div className="p-8 space-y-10 animate-pulse min-h-screen bg-slate-950">
                <div className="flex items-center justify-between">
                    <div className="space-y-4">
                        <div className="h-10 w-64 bg-white/5 rounded-2xl"></div>
                        <div className="h-5 w-48 bg-white/5 rounded-xl"></div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-40 bg-white/5 rounded-[2.5rem] border border-white/5"></div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-white/5 rounded-[2rem] border border-white/5"></div>
                    ))}
                </div>
            </div>
        );
    }

    const filteredFeedbacks = summary.feedbacks.filter(f => {
        if (filter === 'positive') return f.rating >= 4;
        if (filter === 'critical') return f.rating <= 2;
        return true;
    });

    if (!summary || summary.total_feedbacks === 0) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <FiMessageSquare size={40} className="text-muted opacity-50" />
                </div>
                <h3 className="text-xl font-black text-main uppercase tracking-widest mb-2">No Feedback Yet</h3>
                <p className="font-medium text-muted text-sm max-w-md">Feedback will appear here once users start rating their ticket resolution experience.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-10 space-y-10 text-main font-sans selection:bg-primary/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-main uppercase tracking-tighter italic">Customer <span className="text-primary">Satisfaction</span></h2>
                    <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] mt-1">Service quality analytics & user sentiment</p>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                        {['all', 'positive', 'critical'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted hover:text-white hover:bg-white/5'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="h-10 w-px bg-white/10 mx-2 hidden md:block"></div>
                    <div className="flex items-center gap-4 bg-white/5 px-6 py-2 rounded-2xl border border-white/10">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">CSAT Score</p>
                            <span className="text-3xl font-black text-white italic tracking-tighter">{summary.average_rating.toFixed(1)}</span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
                            <FiStar className="fill-amber-500 text-amber-500" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Volume', value: summary.total_feedbacks, icon: FiMessageSquare, color: 'primary', bg: 'bg-primary/10', text: 'text-primary' },
                    { label: 'Satisfied Users', value: summary.feedbacks.filter(f => f.rating >= 4).length, icon: FiCheckCircle, color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
                    { label: 'Growth Vector', value: '+12%', icon: FiTrendingUp, color: 'orange', bg: 'bg-orange-500/10', text: 'text-orange-500' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card bg-white/5 p-8 rounded-[2.5rem] border-none shadow-lg hover:shadow-xl transition-all flex items-center justify-between group">
                        <div>
                            <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                            <p className="text-4xl font-black text-white tracking-tighter italic">{stat.value}</p>
                        </div>
                        <div className={`w-16 h-16 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.text} border border-white/5 group-hover:scale-110 transition-transform shadow-inner`}>
                            <stat.icon size={28} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Feedback List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-xl font-black text-main uppercase tracking-tight italic">Feedback Stream</h3>
                    <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-muted uppercase tracking-widest">{filteredFeedbacks.length} records</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredFeedbacks.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card bg-white/5 p-8 rounded-[2rem] border-none shadow-lg hover:shadow-2xl transition-all relative group overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                <FiMessageSquare size={100} />
                            </div>

                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div>
                                    <span className="inline-block px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest mb-2">
                                        #{f.custom_id || f.ticket_id}
                                    </span>
                                    <h4 className="text-lg font-bold text-white truncate max-w-[250px]">{f.subject}</h4>
                                </div>
                                <div className="flex gap-1 bg-black/20 p-2 rounded-xl border border-white/5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <FiStar key={star} size={14} className={star <= f.rating ? 'fill-amber-500 text-amber-500' : 'text-white/10'} />
                                    ))}
                                </div>
                            </div>

                            <div className="relative z-10 bg-white/5 p-6 rounded-2xl border border-white/5 mb-6">
                                <p className="text-sm text-gray-300 italic font-medium leading-relaxed line-clamp-3">
                                    "{f.feedback || 'No written commentary provided.'}"
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                        {f.user.charAt(0)}
                                    </div>
                                    <span className="text-[10px] font-black text-muted uppercase tracking-wider">{f.user}</span>
                                </div>
                                <span className="text-[10px] font-black text-muted/50 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg">
                                    {new Date(f.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FeedbackOverview;
