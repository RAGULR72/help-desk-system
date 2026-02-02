import React, { useState, useEffect } from 'react';
import {
    FiPlus, FiEdit3, FiToggleLeft, FiToggleRight, FiSettings,
    FiGitPullRequest, FiZap, FiGrid, FiMoreVertical, FiArrowRight, FiX, FiCheckCircle, FiTruck, FiNavigation, FiCpu
} from 'react-icons/fi';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';

const TicketWorkflowConfig = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
    const [newCat, setNewCat] = useState({ name: '', description: '', color: '#6366f1' });
    const [addingCat, setAddingCat] = useState(false);

    const [liveMapEnabled, setLiveMapEnabled] = useState(false);
    const [conciergeEnabled, setConciergeEnabled] = useState(false);
    const [conciergeName, setConciergeName] = useState('Proserve AI Concierge');
    const [dispatcherEnabled, setDispatcherEnabled] = useState(false);
    const [sequenceConfig, setSequenceConfig] = useState(null);
    const [isEditWfModalOpen, setIsEditWfModalOpen] = useState(false);
    const [editingWf, setEditingWf] = useState({ id: null, name: '', description: '' });
    const [updatingWf, setUpdatingWf] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchConfig();
        fetchSystemConfig();
        fetchSequenceConfig();
    }, []);

    const fetchSystemConfig = async () => {
        try {
            const res = await api.get('/api/system/config/');

            const mapSetting = res.data.find(c => c.key === 'live_map_enabled');
            if (mapSetting) {
                setLiveMapEnabled(mapSetting.value === 'true');
            }
            const conciergeSetting = res.data.find(c => c.key === 'ai_concierge_enabled');
            if (conciergeSetting) {
                setConciergeEnabled(conciergeSetting.value === 'true');
            }
            const conciergeNameSetting = res.data.find(c => c.key === 'ai_concierge_name');
            if (conciergeNameSetting) {
                setConciergeName(conciergeNameSetting.value);
            }
            const dispatcherSetting = res.data.find(c => c.key === 'ai_dispatcher_enabled');
            if (dispatcherSetting) {
                setDispatcherEnabled(dispatcherSetting.value === 'true');
            }
        } catch (error) {
            console.error("Failed to fetch system config", error);
        }
    };

    const fetchSequenceConfig = async () => {
        try {
            const res = await api.get('/api/system/config/sequence');
            setSequenceConfig(res.data);
        } catch (error) {
            console.error("Failed to fetch sequence config", error);
        }
    };

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/workflows/config');
            setConfig(res.data);
        } catch (error) {
            console.error("Failed to fetch workflow config", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRule = async (id) => {
        try {
            await api.post(`/api/workflows/rules/${id}/toggle`);
            // Optimistic update
            setConfig(prev => ({
                ...prev,
                automation_rules: prev.automation_rules.map(r =>
                    r.id === id ? { ...r, is_active: !r.is_active } : r
                )
            }));
        } catch (error) {
            console.error("Failed to toggle rule", error);
        }
    };



    const handleToggleLiveMap = async () => {
        const newValue = !liveMapEnabled;
        setLiveMapEnabled(newValue);
        try {
            await api.put('/api/system/config/live_map_enabled', {
                value: newValue ? 'true' : 'false'
            });
        } catch (error) {
            console.error("Failed to toggle live map", error);
            setLiveMapEnabled(!newValue);
        }
    };

    const handleToggleConcierge = async () => {
        const newValue = !conciergeEnabled;
        setConciergeEnabled(newValue);
        try {
            await api.put('/api/system/config/ai_concierge_enabled', {
                value: newValue ? 'true' : 'false'
            });
        } catch (error) {
            console.error("Failed to toggle AI concierge", error);
            setConciergeEnabled(!newValue);
        }
    };

    const handleToggleDispatcher = async () => {
        const newValue = !dispatcherEnabled;
        setDispatcherEnabled(newValue);
        try {
            await api.put('/api/system/config/ai_dispatcher_enabled', {
                value: newValue ? 'true' : 'false'
            });
        } catch (error) {
            console.error("Failed to toggle AI dispatcher", error);
            setDispatcherEnabled(!newValue);
        }
    };

    const handleUpdateConciergeName = async () => {
        try {
            await api.put('/api/system/config/ai_concierge_name', {
                value: conciergeName
            });
            showToast("Chatbot name updated successfully!");
        } catch (error) {
            console.error("Failed to update AI concierge name", error);
            showToast("Failed to update name.", "error");
        }
    };

    const handleSaveSequence = async () => {
        if (!sequenceConfig) return;
        try {
            await api.put('/api/system/config/sequence', sequenceConfig);
            showToast("Ticket sequence configuration saved!");
            fetchSequenceConfig(); // Refresh
        } catch (error) {
            console.error("Failed to save sequence config", error);
            showToast("Failed to save configuration", "error");
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCat.name) return;
        setAddingCat(true);
        try {
            const res = await api.post('/api/workflows/categories', newCat);
            setConfig(prev => ({
                ...prev,
                categories: [...prev.categories, res.data]
            }));
            setIsAddCatModalOpen(false);
            setNewCat({ name: '', description: '', color: '#6366f1' });
            showToast("Category added successfully!");
        } catch (error) {
            console.error("Failed to add category", error);
            showToast(error.response?.data?.detail || "Failed to add category", "error");
        } finally {
            setAddingCat(false);
        }
    };

    const handleDeleteWorkflow = async (id) => {
        if (!window.confirm("Are you sure you want to delete this workflow?")) return;
        try {
            await api.delete(`/api/workflows/${id}`);
            setConfig(prev => ({
                ...prev,
                workflows: prev.workflows.filter(w => w.id !== id)
            }));
            showToast("Workflow deleted successfully!");
        } catch (error) {
            console.error("Failed to delete workflow", error);
            showToast("Failed to delete workflow", "error");
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Are you sure you want to delete this category?")) return;
        try {
            await api.delete(`/api/workflows/categories/${id}`);
            setConfig(prev => ({
                ...prev,
                categories: prev.categories.filter(c => c.id !== id)
            }));
            showToast("Category deleted successfully!");
        } catch (error) {
            console.error("Failed to delete category", error);
            showToast("Failed to delete category", "error");
        }
    };

    const handleUpdateWorkflow = async (e) => {
        e.preventDefault();
        setUpdatingWf(true);
        try {
            const res = await api.patch(`/api/workflows/${editingWf.id}`, editingWf);
            setConfig(prev => ({
                ...prev,
                workflows: prev.workflows.map(w => w.id === editingWf.id ? res.data : w)
            }));
            setIsEditWfModalOpen(false);
            showToast("Workflow updated successfully!");
        } catch (error) {
            console.error("Failed to update workflow", error);
            showToast("Failed to update workflow", "error");
        } finally {
            setUpdatingWf(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-20 min-h-[400px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
    );

    if (!config) return (
        <div className="p-10 text-center">
            <p className="text-muted font-bold text-xs mb-4">Connection failed</p>
            <button onClick={fetchConfig} className="text-primary font-bold hover:underline text-xs">Retry</button>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-main">Workflow settings</h1>
                    <p className="text-xs text-muted mt-0.5">Manage ticket routing and automation</p>
                </div>
                <button
                    onClick={() => alert("Workflow Designer coming soon! You can now delete existing workflows.")}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95"
                >
                    <FiPlus size={14} />
                    New workflow
                </button>
            </div>

            {/* Top Cards: Workflows */}
            <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
                <AnimatePresence mode="popLayout">
                    {config.workflows.map((wf) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={wf.id}
                            className="glass-card bg-white/5 p-5 rounded-2xl border-none shadow-lg hover:shadow-xl transition-all group relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
                                    <FiGitPullRequest size={18} />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold">Active</span>
                                    <button
                                        onClick={() => handleDeleteWorkflow(wf.id)}
                                        className="p-1.5 text-muted hover:text-rose-500 transition-colors rounded hover:bg-rose-500/10"
                                        title="Delete"
                                    >
                                        <FiX size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingWf({ id: wf.id, name: wf.name, description: wf.description });
                                            setIsEditWfModalOpen(true);
                                        }}
                                        className="p-1.5 text-muted hover:text-primary transition-colors rounded hover:bg-primary/10"
                                    >
                                        <FiEdit3 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="relative z-10 mb-4">
                                <h3 className="text-base font-bold text-main mb-1">{wf.name}</h3>
                                <p className="text-xs text-muted line-clamp-2">{wf.description}</p>
                            </div>

                            <div className="flex items-center gap-6 border-t border-white/5 pt-4 relative z-10">
                                <div>
                                    <p className="text-[10px] text-muted mb-0.5">Steps</p>
                                    <p className="text-sm font-bold text-main">{wf.steps_count}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted mb-0.5">Avg time</p>
                                    <p className="text-sm font-bold text-main">{wf.avg_resolution}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted mb-0.5">Tickets</p>
                                    <p className="text-sm font-bold text-main">{wf.tickets_processed}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Workflow Designer Area */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <FiSettings className="text-primary" size={14} />
                    <h2 className="text-xs font-bold text-muted">Workflow designer</h2>
                </div>
                <div className="glass-card bg-white/5 border-none rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="relative mb-4">
                        <div className="relative p-4 bg-black/20 rounded-full border border-white/10">
                            <FiGitPullRequest size={24} className="text-primary" />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-main mb-2">Build custom workflows</h3>
                    <p className="text-xs text-muted max-w-md mx-auto mb-6">
                        Drag and drop nodes to create your own workflow logic.
                    </p>
                    <button className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                        <FiZap size={14} /> Open designer
                    </button>
                </div>
            </div>

            {/* Automation Rules */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <FiZap className="text-amber-500" size={14} />
                    <h2 className="text-xs font-bold text-muted">Automation rules</h2>
                </div>
                <div className="glass-card bg-white/5 border-none rounded-2xl overflow-hidden shadow-lg">
                    {config.automation_rules.map((rule, idx) => (
                        <div key={rule.id} className={`p-4 flex items-center justify-between hover:bg-white/5 transition-all ${idx !== config.automation_rules.length - 1 ? 'border-b border-white/5' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${rule.is_active ? 'bg-indigo-500/10 text-indigo-500' : 'bg-white/5 text-muted'}`}>
                                    <FiZap size={16} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-main mb-0.5">{rule.name}</h4>
                                    <p className="text-xs text-muted">{rule.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggleRule(rule.id)}
                                className={`text-2xl transition-all active:scale-90 ${rule.is_active ? 'text-indigo-500' : 'text-muted/30 hover:text-muted'}`}
                            >
                                {rule.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                            </button>
                        </div>
                    ))}


                    {/* Live Map Rule */}
                    <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-all border-t border-white/5">
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${liveMapEnabled ? 'bg-indigo-500/10 text-indigo-500' : 'bg-white/5 text-muted'}`}>
                                <FiNavigation size={16} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-main mb-0.5">Live map</h4>
                                <p className="text-xs text-muted">Track technicians and tickets on a map</p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleLiveMap}
                            className={`text-2xl transition-all active:scale-90 ${liveMapEnabled ? 'text-indigo-500' : 'text-muted/30 hover:text-muted'}`}
                        >
                            {liveMapEnabled ? <FiToggleRight /> : <FiToggleLeft />}
                        </button>
                    </div>

                    {/* AI Concierge Rule */}
                    <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-all border-t border-white/5">
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${conciergeEnabled ? 'bg-indigo-500/10 text-indigo-500' : 'bg-white/5 text-muted'}`}>
                                <FiZap size={16} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-main mb-0.5">AI chatbot</h4>
                                <p className="text-xs text-muted">Smart assistant that helps users before they create a ticket</p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleConcierge}
                            className={`text-2xl transition-all active:scale-90 ${conciergeEnabled ? 'text-indigo-500' : 'text-muted/30 hover:text-muted'}`}
                        >
                            {conciergeEnabled ? <FiToggleRight /> : <FiToggleLeft />}
                        </button>
                    </div>

                    {/* AI Dispatcher Rule */}
                    <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-all border-t border-white/5">
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${dispatcherEnabled ? 'bg-indigo-500/10 text-indigo-500' : 'bg-white/5 text-muted'}`}>
                                <FiCpu size={16} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-main mb-0.5">Smart assignment</h4>
                                <p className="text-xs text-muted">Auto-assign tickets based on skills and workload</p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleDispatcher}
                            className={`text-2xl transition-all active:scale-90 ${dispatcherEnabled ? 'text-indigo-500' : 'text-muted/30 hover:text-muted'}`}
                        >
                            {dispatcherEnabled ? <FiToggleRight /> : <FiToggleLeft />}
                        </button>
                    </div>

                    {/* Chatbot Name Selection */}
                    {conciergeEnabled && (
                        <div className="mx-4 mb-4 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1">
                                <h4 className="text-xs font-bold text-main mb-0.5">Chatbot name</h4>
                                <p className="text-[10px] text-muted">Give your assistant a friendly name</p>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <input
                                    type="text"
                                    value={conciergeName}
                                    onChange={(e) => setConciergeName(e.target.value)}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border-none rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 w-full md:w-48"
                                    placeholder="e.g. Support Bot"
                                />
                                <button
                                    onClick={handleUpdateConciergeName}
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:scale-105 transition-all"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-3 bg-black/20 flex justify-center border-t border-white/5">
                        <button className="text-xs font-bold text-muted hover:text-primary flex items-center gap-1.5 py-2 px-4 rounded-lg hover:bg-white/5 transition-all">
                            <FiPlus size={14} /> Add rule
                        </button>
                    </div>
                </div>
            </div>

            {/* Ticket Categories */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <FiGrid className="text-rose-500" size={14} />
                    <h2 className="text-xs font-bold text-muted">Categories</h2>
                </div>
                <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <AnimatePresence mode="popLayout">
                        {config.categories.map((cat) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                key={cat.id}
                                className="glass-card bg-white/5 p-5 rounded-xl border-none shadow-md hover:shadow-lg hover:bg-white/10 transition-all group relative"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }}></span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDeleteCategory(cat.id)}
                                            className="p-1.5 text-muted hover:text-white hover:bg-rose-500 rounded-lg transition-all"
                                            title="Delete"
                                        >
                                            <FiX size={12} />
                                        </button>
                                    </div>
                                </div>
                                <h4 className="text-sm font-bold text-main mb-1">{cat.name}</h4>
                                <p className="text-[10px] text-muted border-t border-white/5 pt-3 mt-3 text-center">{cat.tickets_count} tickets</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <motion.button
                        layout
                        onClick={() => setIsAddCatModalOpen(true)}
                        className="bg-white/5 border border-dashed border-white/10 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiPlus size={16} />
                        </div>
                        <span className="text-xs font-bold">Add category</span>
                    </motion.button>
                </motion.div>
            </div>

            {/* Ticket ID Sequence Configuration */}
            {sequenceConfig && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <FiSettings className="text-primary" size={14} />
                        <h2 className="text-xs font-bold text-muted">Ticket ID settings</h2>
                    </div>
                    <div className="glass-card bg-white/5 border-none rounded-2xl p-6 shadow-lg relative overflow-hidden">
                        <div className="flex flex-col lg:flex-row gap-6 items-start relative z-10">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-main mb-1">Sequence settings</h3>
                                    <p className="text-xs text-muted">
                                        Ticket IDs follow <strong className="text-primary">PREFIX-FY-NUMBER</strong> format. Resets each fiscal year.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted mb-1.5 ml-1">Prefix</label>
                                        <input
                                            type="text"
                                            value={sequenceConfig.prefix}
                                            onChange={e => setSequenceConfig({ ...sequenceConfig, prefix: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl text-sm font-bold text-main focus:outline-none focus:border-primary/50 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted mb-1.5 ml-1">Fiscal year</label>
                                        <input
                                            type="number"
                                            value={sequenceConfig.current_fy}
                                            onChange={e => setSequenceConfig({ ...sequenceConfig, current_fy: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2.5 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl text-sm font-bold text-main focus:outline-none focus:border-primary/50 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted mb-1.5 ml-1">Year start</label>
                                        <div className="relative">
                                            <select
                                                value={sequenceConfig.fy_start_month}
                                                onChange={e => setSequenceConfig({ ...sequenceConfig, fy_start_month: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2.5 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl text-sm font-bold text-main focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer shadow-sm"
                                            >
                                                <option value={1}>January</option>
                                                <option value={4}>April (India/UK)</option>
                                                <option value={7}>July (US/AU)</option>
                                                <option value={10}>October</option>
                                            </select>
                                            <FiMoreVertical className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted mb-1.5 ml-1">Next number</label>
                                        <input
                                            type="number"
                                            value={sequenceConfig.next_number}
                                            onChange={e => setSequenceConfig({ ...sequenceConfig, next_number: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2.5 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl text-sm font-bold text-main focus:outline-none focus:border-primary/50 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="lg:w-64 bg-white dark:bg-black/20 rounded-xl p-5 flex flex-col items-center justify-center text-center border border-black/5 dark:border-white/5 self-stretch shadow-sm">
                                <p className="text-[10px] text-muted mb-2 font-bold uppercase tracking-wider">Preview</p>
                                <div className="text-lg font-mono font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 mb-4">
                                    {sequenceConfig.prefix}-{sequenceConfig.current_fy}-{String(sequenceConfig.next_number).padStart(4, '0')}
                                </div>
                                <button
                                    onClick={handleSaveSequence}
                                    className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                    <FiCheckCircle size={14} /> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            <AnimatePresence>
                {isAddCatModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddCatModalOpen(false)}
                            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md glass-card bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <div>
                                    <h2 className="text-lg font-bold text-main">New category</h2>
                                    <p className="text-xs text-muted mt-0.5">Add a ticket category</p>
                                </div>
                                <button onClick={() => setIsAddCatModalOpen(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-muted hover:bg-rose-500 hover:text-white transition-all">
                                    <FiX size={16} />
                                </button>
                            </div>
                            <form onSubmit={handleAddCategory} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-muted mb-1.5 ml-1">Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={newCat.name}
                                        onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm font-bold text-main focus:outline-none focus:border-primary/50 transition-all placeholder-muted/30"
                                        placeholder="e.g., Software Support"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted mb-1.5 ml-1">Description</label>
                                    <textarea
                                        value={newCat.description}
                                        onChange={e => setNewCat({ ...newCat, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-main focus:outline-none focus:border-primary/50 transition-all h-24 resize-none placeholder-muted/30"
                                        placeholder="Brief description..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted mb-1.5 ml-1">Color</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={newCat.color}
                                                onChange={e => setNewCat({ ...newCat, color: e.target.value })}
                                                className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent overflow-hidden opacity-0 absolute inset-0 z-10"
                                            />
                                            <div className="w-12 h-12 rounded-xl border border-white/10 shadow flex items-center justify-center" style={{ backgroundColor: newCat.color }}>
                                                <FiEdit3 className="text-white/50" size={14} />
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={newCat.color}
                                            onChange={e => setNewCat({ ...newCat, color: e.target.value })}
                                            className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm font-mono font-bold text-main"
                                        />
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={addingCat}
                                        className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {addingCat ? <FiZap className="animate-spin" size={14} /> : <FiPlus size={14} />}
                                        {addingCat ? 'Creating...' : 'Create category'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Footer Links */}
            <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-8 mb-2">
                <p className="text-[10px] text-muted">© 2026 Proserve Systems</p>
                <div className="flex items-center gap-4">
                    <a href="#" className="text-[10px] text-muted hover:text-primary transition-colors">Docs</a>
                    <a href="#" className="text-[10px] text-muted hover:text-primary transition-colors">Support</a>
                    <a href="#" className="text-[10px] text-muted hover:text-primary transition-colors">Privacy</a>
                </div>
            </div>

            {/* Edit Workflow Modal */}
            <AnimatePresence>
                {isEditWfModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditWfModalOpen(false)}
                            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md glass-card bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <div>
                                    <h2 className="text-lg font-bold text-main">Edit workflow</h2>
                                    <p className="text-xs text-muted mt-0.5">Update workflow details</p>
                                </div>
                                <button onClick={() => setIsEditWfModalOpen(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-muted hover:bg-rose-500 hover:text-white transition-all">
                                    <FiX size={16} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateWorkflow} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-muted mb-1.5 ml-1">Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={editingWf.name}
                                        onChange={e => setEditingWf({ ...editingWf, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm font-bold text-main focus:outline-none focus:border-indigo-500/50 transition-all placeholder-muted/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted mb-1.5 ml-1">Description</label>
                                    <textarea
                                        value={editingWf.description}
                                        onChange={e => setEditingWf({ ...editingWf, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-main focus:outline-none focus:border-indigo-500/50 transition-all h-24 resize-none placeholder-muted/30"
                                    />
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={updatingWf}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                                    >
                                        {updatingWf ? <FiZap className="animate-spin" size={14} /> : <FiCheckCircle size={14} />}
                                        {updatingWf ? 'Saving...' : 'Save changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TicketWorkflowConfig;
