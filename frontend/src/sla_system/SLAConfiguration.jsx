import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiClock, FiInfo, FiSave, FiPlus, FiTrash2, FiEdit2,
    FiAlertCircle, FiCheckCircle, FiHelpCircle, FiSettings,
    FiCalendar, FiBell, FiZap, FiTrendingUp, FiArrowLeft
} from 'react-icons/fi';
import api from '../api/axios';

const SLAConfiguration = ({ onBack, initialSection = 'overview', autoCreate = false }) => {
    const [activeSection, setActiveSection] = useState(initialSection);
    const [showHelp, setShowHelp] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isAddRuleOpen, setIsAddRuleOpen] = useState(autoCreate);

    // SLA Configuration State
    const [config, setConfig] = useState({
        businessHours: {
            mode: '24/7', // or 'business_hours'
            startTime: '09:00',
            endTime: '17:00',
            workingDays: [1, 2, 3, 4, 5], // Monday to Friday
        },
        priorities: {
            critical: { enabled: true, responseMinutes: 15, resolutionHours: 2, escalateAtPercent: 80, description: 'Business halted' },
            high: { enabled: true, responseMinutes: 60, resolutionHours: 8, escalateAtPercent: 75, description: 'Urgent attention' },
            medium: { enabled: true, responseMinutes: 240, resolutionHours: 24, escalateAtPercent: 70, description: 'Standard request' },
            low: { enabled: true, responseMinutes: 480, resolutionHours: 72, escalateAtPercent: 60, description: 'Non-urgent' }
        },
        escalation: {
            level1: { triggerPercent: 50, notify: ['assignee'] },
            level2: { triggerPercent: 90, notify: ['assignee', 'manager'] },
            breach: { triggerPercent: 100, notify: ['assignee', 'manager', 'admin'], autoReassign: true }
        },
        customRules: [],
        notifications: {
            responseWarning: true,
            resolutionWarning: true,
            breachAlert: true,
            dailyReport: true
        }
    });

    const [categoryOverrides, setCategoryOverrides] = useState([
        {
            id: 1,
            category: 'Server Down',
            priority: 'critical',
            responseMinutes: 10,
            resolutionHours: 1,
            enabled: true
        }
    ]);

    useEffect(() => {
        loadSLAConfiguration();
    }, []);

    useEffect(() => {
        if (initialSection) setActiveSection(initialSection);
        if (autoCreate) setIsAddRuleOpen(true);
    }, [initialSection, autoCreate]);

    const loadSLAConfiguration = async () => {
        try {
            const response = await api.get('/api/sla/configuration');
            if (response.data) {
                // Merge with default config to ensure all keys are present
                setConfig(prevConfig => ({
                    ...prevConfig,
                    ...response.data,
                    priorities: {
                        ...prevConfig.priorities,
                        ...response.data.priorities
                    },
                    escalation: {
                        ...prevConfig.escalation,
                        ...response.data.escalation
                    },
                    customRules: response.data.customRules || [],
                    notifications: {
                        ...prevConfig.notifications,
                        ...response.data.notifications
                    }
                }));
                fetchHolidays();
            }
        } catch (error) {
            console.error('Failed to load SLA configuration:', error);
        }
    };

    const [holidays, setHolidays] = useState([]);
    const fetchHolidays = async () => {
        try {
            const res = await api.get('/api/sla/holidays');
            setHolidays(res.data);
        } catch (e) {
            console.error("Failed to fetch holidays", e);
        }
    };

    const addHoliday = async (name, date) => {
        try {
            await api.post('/api/sla/holidays', { name, date });
            fetchHolidays();
        } catch (e) {
            console.error("Failed to add holiday", e);
        }
    };

    const deleteHoliday = async (id) => {
        try {
            await api.delete(`/api/sla/holidays/${id}`);
            fetchHolidays();
        } catch (e) {
            console.error("Failed to delete holiday", e);
        }
    };

    const saveSLAConfiguration = async () => {
        setSaving(true);
        try {
            await api.post('/api/sla/configuration', config);
            alert('✅ SLA Configuration saved successfully!');
        } catch (error) {
            console.error('Failed to save:', error);
            alert('❌ Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const HelpTooltip = ({ title, content }) => (
        <div className="group relative inline-block ml-2">
            <FiHelpCircle className="text-muted hover:text-primary cursor-help transition-colors" size={16} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-slate-900 text-white text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-white/10 backdrop-blur-md">
                <div className="font-black mb-1 text-primary uppercase tracking-wider">{title}</div>
                <div className="text-gray-300 leading-relaxed">{content}</div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
            </div>
        </div>
    );

    const OverviewSection = () => (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[2rem] p-8 glass-card border-none">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
                <div className="relative flex items-start gap-6">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner border border-white/20 text-primary">
                        <FiClock size={32} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-main tracking-tighter italic uppercase mb-2">What is SLA?</h2>
                        <p className="text-sm text-muted mb-6 max-w-2xl font-medium">
                            <strong>Service Level Agreement (SLA)</strong> is your promise to customers about how quickly you'll respond to and resolve their tickets.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-card-border/30 hover:bg-white/10 transition-colors">
                                <div className="text-lg font-black text-main mb-1 flex items-center gap-2">
                                    <span className="text-amber-400">⚡</span> Response
                                </div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-wider">How fast you acknowledge</div>
                            </div>
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-card-border/30 hover:bg-white/10 transition-colors">
                                <div className="text-lg font-black text-main mb-1 flex items-center gap-2">
                                    <span className="text-emerald-400">✅</span> Resolution
                                </div>
                                <div className="text-[10px] text-muted font-bold uppercase tracking-wider">How fast you fix</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card bg-white/5 rounded-[2rem] p-6 border-none shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-4 shadow-inner border border-emerald-500/20">
                        <FiCheckCircle size={24} />
                    </div>
                    <h3 className="font-black text-main text-sm mb-3 uppercase tracking-wider">Why Use SLA?</h3>
                    <ul className="text-[11px] text-muted font-bold space-y-2">
                        <li className="flex items-center gap-2"><span className="text-emerald-500 flex-shrink-0">✓</span> Set clear expectations</li>
                        <li className="flex items-center gap-2"><span className="text-emerald-500 flex-shrink-0">✓</span> Improve satisfaction</li>
                        <li className="flex items-center gap-2"><span className="text-emerald-500 flex-shrink-0">✓</span> Track performance</li>
                        <li className="flex items-center gap-2"><span className="text-emerald-500 flex-shrink-0">✓</span> Prevent lost tickets</li>
                    </ul>
                </div>

                <div className="glass-card bg-white/5 rounded-[2rem] p-6 border-none shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-4 shadow-inner border border-amber-500/20">
                        <FiAlertCircle size={24} />
                    </div>
                    <h3 className="font-black text-main text-sm mb-3 uppercase tracking-wider">SLA States</h3>
                    <div className="text-[11px] space-y-3 font-bold">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-muted">Compliant <span className="text-emerald-500 text-[10px] uppercase ml-1 opacity-70">On time</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                            <span className="text-muted">At Risk <span className="text-amber-500 text-[10px] uppercase ml-1 opacity-70">Warning</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                            <span className="text-muted">Breached <span className="text-rose-500 text-[10px] uppercase ml-1 opacity-70">Overdue</span></span>
                        </div>
                    </div>
                </div>

                <div className="glass-card bg-white/5 rounded-[2rem] p-6 border-none shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-inner border border-primary/20">
                        <FiTrendingUp size={24} />
                    </div>
                    <h3 className="font-black text-main text-sm mb-3 uppercase tracking-wider">Configuration</h3>
                    <ul className="text-[11px] text-muted font-bold space-y-2">
                        <li className="flex items-center gap-2"><span className="text-primary flex-shrink-0">→</span> Business hours</li>
                        <li className="flex items-center gap-2"><span className="text-primary flex-shrink-0">→</span> Priority response times</li>
                        <li className="flex items-center gap-2"><span className="text-primary flex-shrink-0">→</span> Escalation rules</li>
                        <li className="flex items-center gap-2"><span className="text-primary flex-shrink-0">→</span> Notification settings</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    const BusinessHoursSection = () => (
        <div className="space-y-6">
            <div className="glass-card bg-white/5 rounded-[2.5rem] p-8 border-none shadow-2xl">
                <div className="flex items-center justify-between mb-8 border-b border-card-border/30 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                            <FiCalendar size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-main tracking-tighter italic uppercase">Business Hours</h3>
                            <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mt-1">When does your support team work?</p>
                        </div>
                    </div>
                    <HelpTooltip
                        title="Business Hours"
                        content="Determines when SLA time counts. If set to 'Business Hours Only', SLA pauses outside these times."
                    />
                </div>

                <div className="space-y-8">
                    {/* Mode Selection */}
                    <div>
                        <label className="block text-xs font-black text-main uppercase tracking-widest mb-4">
                            Operating Mode
                        </label>
                        <div className="grid grid-cols-2 gap-6">
                            <button
                                onClick={() => setConfig({ ...config, businessHours: { ...config.businessHours, mode: '24/7' } })}
                                className={`p-6 rounded-2xl border transition-all text-left relative overflow-hidden group ${config.businessHours.mode === '24/7'
                                    ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]'
                                    : 'border-card-border/30 bg-white/5 hover:bg-white/10 hover:border-card-border/50'
                                    }`}
                            >
                                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">⏰</div>
                                <div className={`font-black text-sm uppercase tracking-wider mb-1 ${config.businessHours.mode === '24/7' ? 'text-primary' : 'text-main'}`}>24/7 Support</div>
                                <div className="text-[10px] text-muted font-medium leading-relaxed">
                                    SLA runs continually, inclusive of weekends and nights.
                                </div>
                                {config.businessHours.mode === '24/7' && (
                                    <div className="absolute top-4 right-4 text-primary">
                                        <FiCheckCircle size={20} />
                                    </div>
                                )}
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, businessHours: { ...config.businessHours, mode: 'business_hours' } })}
                                className={`p-6 rounded-2xl border transition-all text-left relative overflow-hidden group ${config.businessHours.mode === 'business_hours'
                                    ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]'
                                    : 'border-card-border/30 bg-white/5 hover:bg-white/10 hover:border-card-border/50'
                                    }`}
                            >
                                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🕐</div>
                                <div className={`font-black text-sm uppercase tracking-wider mb-1 ${config.businessHours.mode === 'business_hours' ? 'text-primary' : 'text-main'}`}>Business Hours</div>
                                <div className="text-[10px] text-muted font-medium leading-relaxed">
                                    SLA pauses outside defined work hours and weekends.
                                </div>
                                {config.businessHours.mode === 'business_hours' && (
                                    <div className="absolute top-4 right-4 text-primary">
                                        <FiCheckCircle size={20} />
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Time Settings (only if business hours mode) */}
                    {config.businessHours.mode === 'business_hours' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: -20 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            className="space-y-6 pt-4 border-t border-card-border/30"
                        >
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={config.businessHours.startTime}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            businessHours: { ...config.businessHours, startTime: e.target.value }
                                        })}
                                        className="w-full px-4 py-3 rounded-xl border border-card-border/50 bg-black/20 text-main focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={config.businessHours.endTime}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            businessHours: { ...config.businessHours, endTime: e.target.value }
                                        })}
                                        className="w-full px-4 py-3 rounded-xl border border-card-border/50 bg-black/20 text-main focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-3">
                                    Active Working Days
                                </label>
                                <div className="flex gap-3">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                                        <button
                                            key={day}
                                            onClick={() => {
                                                const days = config.businessHours.workingDays;
                                                const newDays = days.includes(idx + 1)
                                                    ? days.filter(d => d !== idx + 1)
                                                    : [...days, idx + 1].sort();
                                                setConfig({
                                                    ...config,
                                                    businessHours: { ...config.businessHours, workingDays: newDays }
                                                });
                                            }}
                                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all transform active:scale-95 ${config.businessHours.workingDays.includes(idx + 1)
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                : 'bg-white/5 text-muted hover:bg-white/10'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );

    const PriorityRulesSection = () => (
        <div className="space-y-6">
            <div className="glass-card bg-primary/10 border-primary/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="bg-primary/20 p-2 rounded-lg text-primary mt-1">
                        <FiInfo size={16} />
                    </div>
                    <div className="text-xs text-muted leading-relaxed">
                        <strong className="text-primary uppercase tracking-wider block mb-1">Recommendation</strong>
                        Start conservative! It's better to exceed expectations than constantly miss deadlines. Review performance from past tickets and set SLAs slightly better.
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {Object.entries(config.priorities).map(([priority, settings]) => (
                    <PriorityCard key={priority} priority={priority} settings={settings} config={config} setConfig={setConfig} />
                ))}
            </div>
        </div>
    );

    const PriorityCard = ({ priority, settings, config, setConfig }) => {
        const priorityStyles = {
            critical: { border: 'border-rose-500/50 hover:border-rose-500', text: 'text-rose-500', bg: 'bg-rose-500/5', icon: '🔥', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.1)]' },
            high: { border: 'border-amber-500/50 hover:border-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/5', icon: '⚡', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]' },
            medium: { border: 'border-primary/50 hover:border-primary', text: 'text-primary', bg: 'bg-primary/5', icon: '📋', glow: 'shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]' },
            low: { border: 'border-card-border/50 hover:border-card-border', text: 'text-muted', bg: 'bg-white/5', icon: '📝', glow: 'shadow-none' }
        };

        const styles = priorityStyles[priority];
        if (!styles) return null;

        return (
            <div className="p-6 md:p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all duration-500 overflow-hidden relative group/rule mb-6 last:mb-0">
                <div className={`absolute top-0 right-0 w-32 h-32 ${styles.bg} opacity-10 rounded-full blur-3xl -mr-16 -mt-16 group-hover/rule:opacity-20 transition-all duration-700`}></div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className={`text-2xl w-14 h-14 rounded-2xl flex items-center justify-center ${styles.bg} border border-white/10 shadow-xl group-hover/rule:scale-110 transition-transform duration-500`}>
                            {styles.icon}
                        </div>
                        <div>
                            <h3 className={`text-xl font-black uppercase tracking-tighter ${styles.text}`}>{priority} Priority</h3>
                            <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mt-1.5 opacity-60">{settings.description}</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group/toggle">
                        <input
                            type="checkbox"
                            checked={settings.enabled}
                            onChange={(e) => {
                                setConfig({
                                    ...config,
                                    priorities: {
                                        ...config.priorities,
                                        [priority]: { ...settings, enabled: e.target.checked }
                                    }
                                });
                            }}
                            className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary border border-white/5 shadow-inner"></div>
                    </label>
                </div>

                {settings.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 animate-in slide-in-from-top-4 fade-in duration-500">
                        <div className="group/input">
                            <label className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-3 group-focus-within/input:text-primary transition-colors">
                                Response (Min)
                                <HelpTooltip title="Response Time" content="Maximum time to acknowledge the ticket" />
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={settings.responseMinutes}
                                    onChange={(e) => {
                                        setConfig({
                                            ...config,
                                            priorities: {
                                                ...config.priorities,
                                                [priority]: { ...settings, responseMinutes: parseInt(e.target.value) }
                                            }
                                        });
                                    }}
                                    className="input-field py-4"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/50 pointer-events-none uppercase tracking-widest">
                                    {Math.floor(settings.responseMinutes / 60)}h {settings.responseMinutes % 60}m
                                </div>
                            </div>
                        </div>

                        <div className="group/input">
                            <label className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-3 group-focus-within/input:text-primary transition-colors">
                                Resolution (Hrs)
                                <HelpTooltip title="Resolution Time" content="Maximum time to resolve the ticket" />
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={settings.resolutionHours}
                                    onChange={(e) => {
                                        setConfig({
                                            ...config,
                                            priorities: {
                                                ...config.priorities,
                                                [priority]: { ...settings, resolutionHours: parseInt(e.target.value) }
                                            }
                                        });
                                    }}
                                    className="input-field py-4"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/50 pointer-events-none uppercase tracking-widest">
                                    {settings.resolutionHours * 60}m
                                </div>
                            </div>
                        </div>

                        <div className="group/input">
                            <label className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-3 group-focus-within/input:text-primary transition-colors">
                                Escalation (%)
                                <HelpTooltip title="Escalation Trigger" content="Trigger escalation when this % of time is used" />
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="50"
                                    max="95"
                                    value={settings.escalateAtPercent}
                                    onChange={(e) => {
                                        setConfig({
                                            ...config,
                                            priorities: {
                                                ...config.priorities,
                                                [priority]: { ...settings, escalateAtPercent: parseInt(e.target.value) }
                                            }
                                        });
                                    }}
                                    className="input-field py-4 border-primary/20"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary pointer-events-none uppercase tracking-widest">
                                    Alert @ {settings.escalateAtPercent}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };


    const CustomRulesSection = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-black text-main uppercase italic tracking-tighter">Custom Rules</h3>
                    <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em] mt-1.5 opacity-60">Granular automation based on specific conditions</p>
                </div>
                <button
                    onClick={() => setIsAddRuleOpen(true)}
                    className="btn-primary text-[10px] px-6 py-3 flex items-center gap-2">
                    <FiPlus size={16} /> Add Rule
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.customRules?.length > 0 ? (
                    config.customRules.map((rule, idx) => (
                        <div key={idx} className="glass-card bg-white/[0.02] border-white/5 rounded-2xl p-6 group/rule hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover/rule:bg-primary/10 transition-all duration-700"></div>

                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <h4 className="text-[11px] font-black text-main uppercase tracking-widest flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"></span>
                                    {rule.name}
                                </h4>
                                <button
                                    onClick={() => {
                                        const newRules = config.customRules.filter((_, i) => i !== idx);
                                        setConfig({ ...config, customRules: newRules });
                                    }}
                                    className="p-2 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                >
                                    <FiTrash2 size={14} />
                                </button>
                            </div>
                            <div className="space-y-4 bg-white/5 rounded-2xl p-5 border border-white/5 relative z-10">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-muted font-black uppercase text-[9px] tracking-[0.2em] opacity-50">Condition</span>
                                    <span className="text-main font-bold text-xs">{rule.condition}</span>
                                </div>
                                <div className="w-full h-px bg-white/5"></div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-muted font-black uppercase text-[9px] tracking-[0.2em] opacity-50">Action</span>
                                    <span className="text-primary font-black text-xs uppercase tracking-wider">{rule.action}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-1 md:col-span-2 py-16 border-2 border-dashed border-card-border/30 rounded-[2.5rem] flex flex-col items-center justify-center text-muted group hover:border-primary/30 hover:bg-white/5 transition-all cursor-pointer" onClick={() => setIsAddRuleOpen(true)}>
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <FiZap size={32} className="opacity-50 text-main" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] mb-2">No custom rules yet</p>
                        <span className="text-primary text-[10px] font-black uppercase tracking-widest border-b border-primary/30 group-hover:border-primary transition-colors">Create your first rule</span>
                    </div>
                )}
            </div>

            {/* Add Rule Modal */}
            <AnimatePresence>
                {isAddRuleOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddRuleOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md glass-card bg-[#0f172a] border-card-border/50 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <h3 className="font-black text-sm text-main uppercase tracking-wider">Create Custom Rule</h3>
                                <button onClick={() => setIsAddRuleOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted hover:text-white"><FiTrash2 className="rotate-45" size={18} /></button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">Rule Name</label>
                                    <input type="text" placeholder="e.g. Unassigned Critical Alert" className="w-full px-4 py-3 rounded-xl border border-card-border/30 bg-black/40 text-main focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold transition-all placeholder:text-muted/50" id="new-rule-name" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">Condition</label>
                                    <div className="relative">
                                        <select className="w-full px-4 py-3 rounded-xl border border-card-border/30 bg-black/40 text-main focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold transition-all appearance-none cursor-pointer" id="new-rule-cond">
                                            <option>Unassigned for 30 mins</option>
                                            <option>Priority is Critical</option>
                                            <option>Category is Network</option>
                                            <option>Status is Stale</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted"><FiArrowLeft className="-rotate-90" /></div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-muted uppercase tracking-widest mb-2">Action</label>
                                    <div className="relative">
                                        <select className="w-full px-4 py-3 rounded-xl border border-card-border/30 bg-black/40 text-main focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold transition-all appearance-none cursor-pointer" id="new-rule-action">
                                            <option>Notify Admin via Email</option>
                                            <option>Auto-Reassign to Senior Staff</option>
                                            <option>Set Priority to Critical</option>
                                            <option>Ping Manager on App</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted"><FiArrowLeft className="-rotate-90" /></div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const name = document.getElementById('new-rule-name').value;
                                        const cond = document.getElementById('new-rule-cond').value;
                                        const action = document.getElementById('new-rule-action').value;
                                        if (name) {
                                            setConfig({
                                                ...config,
                                                customRules: [...(config.customRules || []), { name, condition: cond, action }]
                                            });
                                            setIsAddRuleOpen(false);
                                        }
                                    }}
                                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black shadow-lg shadow-primary/25 transition-all uppercase tracking-widest mt-2 hover:scale-[1.02] active:scale-95"
                                >
                                    Create Rule
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );

    const HolidaysSection = () => {
        const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-main uppercase italic tracking-tighter">Holidays</h3>
                        <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em] mt-1.5 opacity-60">Non-working days for SLA calculation</p>
                    </div>
                    <button
                        onClick={() => setIsAddHolidayOpen(true)}
                        className="btn-primary text-[10px] px-6 py-3 flex items-center gap-2">
                        <FiPlus size={16} /> Add Holiday
                    </button>
                </div>

                <div className="glass-card bg-white/[0.02] border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-60">Date</th>
                                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-60">Holiday Name</th>
                                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-60 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {holidays.map((h) => (
                                <tr key={h.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-5 font-black text-main tabular-nums">{h.date}</td>
                                    <td className="px-8 py-5 font-bold text-muted group-hover:text-primary transition-colors italic">{h.name}</td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => deleteHoliday(h.id)}
                                            className="p-2.5 bg-white/5 hover:bg-rose-500/20 text-muted hover:text-rose-500 rounded-xl transition-all border border-white/5 hover:border-rose-500/30"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {holidays.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-8 py-24 text-center">
                                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                                            <FiCalendar size={48} className="opacity-10 text-primary" />
                                        </div>
                                        <p className="text-xs font-black text-muted uppercase tracking-[0.3em] opacity-50">No holidays defined in the system</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add Holiday Modal */}
                <AnimatePresence>
                    {isAddHolidayOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddHolidayOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xl" />
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md glass-card p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-black text-lg text-main uppercase tracking-tighter italic">New Holiday</h3>
                                    <button onClick={() => setIsAddHolidayOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-muted hover:text-white border border-white/5"><FiTrash2 className="rotate-45" size={18} /></button>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-3 opacity-60">Select Date</label>
                                        <input type="date" id="h-date" className="input-field py-4" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-3 opacity-60">Holiday Name</label>
                                        <input type="text" id="h-name" placeholder="e.g. New Year's Day" className="input-field py-4" />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const d = document.getElementById('h-date').value;
                                            const n = document.getElementById('h-name').value;
                                            if (d && n) {
                                                addHoliday(n, d);
                                                setIsAddHolidayOpen(false);
                                            }
                                        }}
                                        className="btn-primary w-full py-4 text-[11px]"
                                    >
                                        Add to Calendar
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        );
    };


    const EscalationSection = () => (
        <div className="space-y-6">
            <div className="glass-card bg-primary/5 border-primary/20 rounded-3xl p-8 mb-10 overflow-hidden relative group/header">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-xl border border-primary/30 group-hover/header:scale-110 transition-transform duration-500">
                        <FiBell size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-main uppercase tracking-tighter italic leading-none">Escalation Tiers</h3>
                        <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mt-2 opacity-60">Notification triggers & automated reassignments</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Level 1 */}
                <div className="glass-card bg-amber-500/5 border-amber-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/20 transition-all"></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="text-3xl">⚠️</div>
                        <div>
                            <h4 className="font-black text-lg text-amber-500 uppercase tracking-tight">Level 1: Warning</h4>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Initial alert</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div>
                            <label className="block text-[10px] font-black text-amber-500/80 uppercase tracking-widest mb-2">Trigger (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={config.escalation.level1.triggerPercent}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        escalation: {
                                            ...config.escalation,
                                            level1: { ...config.escalation.level1, triggerPercent: parseInt(e.target.value) }
                                        }
                                    })}
                                    className="w-full px-4 py-3 rounded-xl border border-amber-500/30 bg-black/40 text-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-bold transition-all"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-500/50 pointer-events-none">% OF TIME USED</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-amber-500/80 uppercase tracking-widest mb-0.5">Notify Roles</label>
                            <div className="flex flex-wrap gap-2">
                                {['assignee', 'manager', 'admin'].map(role => (
                                    <button
                                        key={role}
                                        onClick={() => {
                                            const current = config.escalation.level1.notify || [];
                                            const next = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
                                            setConfig({ ...config, escalation: { ...config.escalation, level1: { ...config.escalation.level1, notify: next } } });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${config.escalation.level1.notify?.includes(role)
                                            ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                            : 'bg-transparent text-amber-500 border-amber-500/30 hover:bg-amber-500/10'}`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Level 2 */}
                <div className="glass-card bg-orange-500/5 border-orange-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-orange-500/50 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/20 transition-all"></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="text-3xl">🚨</div>
                        <div>
                            <h4 className="font-black text-lg text-orange-500 uppercase tracking-tight">Level 2: Critical</h4>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Deadline approaching</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div>
                            <label className="block text-[10px] font-black text-orange-500/80 uppercase tracking-widest mb-2">Trigger (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={config.escalation.level2.triggerPercent}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        escalation: {
                                            ...config.escalation,
                                            level2: { ...config.escalation.level2, triggerPercent: parseInt(e.target.value) }
                                        }
                                    })}
                                    className="w-full px-4 py-3 rounded-xl border border-orange-500/30 bg-black/40 text-orange-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-bold transition-all"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-orange-500/50 pointer-events-none">% OF TIME USED</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-orange-500/80 uppercase tracking-widest mb-0.5">Notify Roles</label>
                            <div className="flex flex-wrap gap-2">
                                {['assignee', 'manager', 'admin'].map(role => (
                                    <button
                                        key={role}
                                        onClick={() => {
                                            const current = config.escalation.level2.notify || [];
                                            const next = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
                                            setConfig({ ...config, escalation: { ...config.escalation, level2: { ...config.escalation.level2, notify: next } } });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${config.escalation.level2.notify?.includes(role)
                                            ? 'bg-orange-500 text-black border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                                            : 'bg-transparent text-orange-500 border-orange-500/30 hover:bg-orange-500/10'}`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Breach */}
                <div className="glass-card bg-rose-500/5 border-rose-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-rose-500/50 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/20 transition-all"></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="text-3xl">❌</div>
                        <div>
                            <h4 className="font-black text-lg text-rose-500 uppercase tracking-tight">SLA Breach</h4>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Missed deadline action</p>
                        </div>
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-rose-500/80 uppercase tracking-widest mb-0.5">Notify Roles</label>
                            <div className="flex flex-wrap gap-2">
                                {['assignee', 'manager', 'admin'].map(role => (
                                    <button
                                        key={role}
                                        onClick={() => {
                                            const current = config.escalation.breach?.notify || [];
                                            const next = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
                                            setConfig({ ...config, escalation: { ...config.escalation, breach: { ...config.escalation.breach, notify: next } } });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${config.escalation.breach?.notify?.includes(role)
                                            ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                                            : 'bg-transparent text-rose-500 border-rose-500/30 hover:bg-rose-500/10'}`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <label className="flex items-center gap-4 cursor-pointer group/check bg-black/20 p-4 rounded-xl border border-rose-500/20 hover:border-rose-500/40 transition-all">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={config.escalation.breach?.autoReassign || false}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        escalation: {
                                            ...config.escalation,
                                            breach: { ...(config.escalation.breach || {}), autoReassign: e.target.checked }
                                        }
                                    })}
                                    className="peer sr-only"
                                />
                                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500 border border-white/10"></div>
                            </div>
                            <div>
                                <div className="font-black text-sm text-rose-500 uppercase tracking-wider group-hover/check:text-rose-400 transition-colors">Auto-reassign Ticket</div>
                                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mt-0.5">Transfer ownership to senior staff immediately upon breach</div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );

    const sections = [
        { id: 'overview', label: 'Overview', icon: FiInfo, component: OverviewSection },
        { id: 'business-hours', label: 'Business Hours', icon: FiCalendar, component: BusinessHoursSection },
        { id: 'priority-rules', label: 'Priority Rules', icon: FiZap, component: PriorityRulesSection },
        { id: 'escalation', label: 'Escalation', icon: FiBell, component: EscalationSection },
        { id: 'custom_rules', label: 'Custom Rules', icon: FiZap, component: CustomRulesSection },
        { id: 'holidays', label: 'Holidays', icon: FiCalendar, component: HolidaysSection },
    ];

    const ActiveComponent = sections.find(s => s.id === activeSection)?.component || OverviewSection;

    return (
        <div className="min-h-screen p-6 md:p-10 text-main font-sans selection:bg-primary/30 relative">
            {/* Background elements */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none"></div>
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -ml-64 -mb-64 pointer-events-none"></div>

            {/* Header */}
            <div className="max-w-7xl mx-auto mb-12 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-muted hover:text-white border border-white/5"
                                title="Go Back"
                            >
                                <FiArrowLeft size={24} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-4xl font-black text-main mb-2 tracking-tighter uppercase italic">
                                SLA <span className="text-primary">Configuration</span>
                            </h1>
                            <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">
                                Service Level Agreements & Response Optimization
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={saveSLAConfiguration}
                        disabled={saving}
                        className="btn-primary px-8 py-3.5 flex items-center gap-3">
                        <FiSave size={18} className={`${saving ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-2 sticky top-6">
                        <nav className="space-y-1">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] transition-all uppercase tracking-widest ${activeSection === section.id
                                        ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]'
                                        : 'text-muted hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <section.icon size={18} className={activeSection === section.id ? 'text-white' : 'text-primary'} />
                                    {section.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-8 md:p-12 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
                        <div className="relative z-10">
                            <ActiveComponent />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default SLAConfiguration;
