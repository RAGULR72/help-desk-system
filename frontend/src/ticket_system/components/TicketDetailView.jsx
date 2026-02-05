import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FiArrowLeft, FiClock, FiUser, FiAlertCircle,
    FiPaperclip, FiDownload, FiMessageSquare, FiSend,
    FiRotateCcw, FiFlag, FiPlusCircle, FiRefreshCw, FiEdit, FiCheckCircle, FiX, FiChevronDown, FiTool, FiStar, FiCheck, FiHeart, FiLock, FiZap, FiAlertTriangle, FiInfo, FiCpu, FiList
} from 'react-icons/fi';
import CreateTicketModal from './CreateTicketModal';
import { RepairWorkflow, RepairInitiationModal } from './RepairWorkflow';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../context/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import DOMPurify from 'dompurify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AIAssistantButton from '../../components/AIAssistantButton';

const SmartCoPilotCard = ({ ticketId, ticketData }) => {
    const [suggestion, setSuggestion] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchSuggestion = async () => {
        setSuggestion(null);
        setLoading(true);
        try {
            const res = await api.get(`/api/tickets/${ticketId}/ai-suggestion`);
            setSuggestion(res.data);
        } catch (err) {
            console.error("Failed to fetch AI suggestions", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl relative group min-h-[300px]"
        >
            {/* Pulsing Background Glow */}
            <div className="absolute inset-0 bg-indigo-500/5 animate-pulse pointer-events-none" />

            {/* Scanning Line Animation */}
            {loading && (
                <motion.div
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent z-10 shadow-[0_0_15px_rgba(129,140,248,0.8)]"
                />
            )}

            <div className="p-8 border-b border-slate-800 flex items-center justify-between relative z-10 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                        <FiZap className={loading ? "animate-spin-slow" : ""} size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest italic">AI Core Diagnostic</h3>
                        <p className="text-[10px] text-indigo-400/80 font-black uppercase tracking-tight flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                            L3 Specialist Co-Pilot
                        </p>
                    </div>
                </div>
                {!suggestion && !loading && (
                    <button
                        onClick={fetchSuggestion}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black text-white rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                    >
                        Analyze Case
                    </button>
                )}
            </div>

            <div className="p-8 space-y-6 relative z-10">
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                            <FiRefreshCw className="animate-spin text-indigo-500" size={48} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[8px] font-black text-indigo-300">SCAN</span>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Consulting Knowledge Base</p>
                            <div className="flex gap-1 justify-center">
                                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-0" />
                                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-150" />
                                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce delay-300" />
                            </div>
                        </div>
                    </div>
                ) : suggestion ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <div className="p-5 bg-indigo-900/20 border border-indigo-500/20 rounded-3xl relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 right-0 p-2 opacity-10"><FiInfo size={40} /></div>
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <FiCpu /> Issue Analysis
                            </h4>
                            <p className="text-xs text-slate-300 font-bold leading-relaxed">
                                {suggestion.summary}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <FiList /> Execution Plan
                            </h4>
                            <div className="space-y-2.5">
                                {suggestion.steps.map((step, i) => (
                                    <div key={i} className="flex gap-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl hover:bg-slate-800/80 transition-all border-l-4 border-l-indigo-500 shadow-sm">
                                        <span className="text-[10px] font-black text-indigo-400 font-mono">{String(i + 1).padStart(2, '0')}</span>
                                        <p className="text-[11px] text-slate-200 font-bold leading-relaxed">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase">Analysis Confidence</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${suggestion.confidence * 100}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className={`h-full ${suggestion.confidence > 0.7 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}
                                        />
                                    </div>
                                    <span className={`text-[11px] font-black ${suggestion.confidence > 0.7 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {(suggestion.confidence * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={fetchSuggestion}
                                className="p-2 bg-slate-800 rounded-xl hover:text-indigo-400 transition-all text-slate-500"
                            >
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-[2rem]">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiCpu className="text-slate-600" size={32} />
                        </div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Awaiting System Input</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const SimilarTicketsCard = ({ ticketId }) => {
    const [similar, setSimilar] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSimilar = async () => {
            try {
                const res = await api.get(`/api/tickets/${ticketId}/similar`);
                setSimilar(res.data.tickets);
            } catch (err) {
                console.error("Failed to fetch similar tickets", err);
            } finally {
                setLoading(false);
            }
        };
        if (ticketId) fetchSimilar();
    }, [ticketId]);

    if (loading) return null;
    if (similar.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm"
        >
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex items-center gap-2">
                <FiZap className="text-amber-500" />
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Smart Similar Cases</h3>
            </div>
            <div className="p-6 space-y-4">
                {similar.map((t) => (
                    <div key={t.id} className="group p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-indigo-300 transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono text-indigo-600 font-black">#TKT-{t.id}</span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{formatTimeAgo(t.resolved_at)}</span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2 truncate">{t.subject}</h4>
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 text-[11px] text-gray-600 dark:text-slate-400 italic">
                            "{t.resolution_note || 'No note'}"
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center">
                                    <FiCheckCircle size={10} className="text-indigo-600" />
                                </div>
                                <span className="text-[9px] font-black text-gray-500 uppercase">{t.assignee_name}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const SentimentAnalysisCard = ({ ticket }) => {
    if (!ticket.sentiment) return null;

    const colors = {
        'Positive': 'text-emerald-600 bg-emerald-50 border-emerald-100',
        'Neutral': 'text-blue-600 bg-blue-50 border-blue-100',
        'Negative': 'text-red-600 bg-red-50 border-red-100'
    };

    const data = typeof ticket.sentiment_data === 'string' ? JSON.parse(ticket.sentiment_data) : ticket.sentiment_data;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm"
        >
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FiHeart className="text-pink-500" />
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Sentiment Analysis</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${colors[ticket.sentiment] || colors.Neutral}`}>
                    {ticket.sentiment}
                </span>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-xs text-gray-600 dark:text-slate-400 font-medium">
                    "{ticket.feedback || 'No text provided'}"
                </p>
                {data && data.keywords && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                        {data.keywords.map((kw, i) => (
                            <span key={i} className="text-[8px] bg-gray-100 dark:bg-slate-800 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">
                                {kw}
                            </span>
                        ))}
                    </div>
                )}
                {data && data.action_required && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-xl flex items-center gap-2">
                        <FiAlertTriangle className="text-red-500" size={14} />
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Follow-up Required</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const StatusBadge = ({ status }) => {
    const { t } = useTranslation();
    const colors = {
        open: 'bg-blue-50 text-blue-600 border-blue-100',
        in_progress: 'bg-orange-50 text-orange-600 border-orange-100',
        resolved: 'bg-green-50 text-green-600 border-green-100',
        closed: 'bg-gray-100 text-gray-800 border-gray-200',
        reopened: 'bg-red-50 text-red-600 border-red-100',
        repairing: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        hold: 'bg-amber-50 text-amber-600 border-amber-100'
    };
    const s = status?.toLowerCase() || 'open';
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[s] || colors.open} uppercase tracking-wider`}>
            {t(`tickets.values.${s}`) || s}
        </span>
    );
};

const PriorityBadge = ({ priority }) => {
    const { t } = useTranslation();
    const colors = {
        critical: 'text-red-600 bg-red-50',
        high: 'text-orange-600 bg-orange-50',
        normal: 'text-blue-600 bg-blue-50',
        low: 'text-gray-600 bg-gray-50'
    };
    const p = priority?.toLowerCase() || 'normal';
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${colors[p] || colors.normal}`}>
            {t(`tickets.values.${p}`) || p}
        </span>
    );
};

const AssignModal = ({ isOpen, onClose, onAssign }) => {
    const [targetStaffId, setTargetStaffId] = useState('');
    const [localStaff, setLocalStaff] = useState([]);
    const [isFetchingStaff, setIsFetchingStaff] = useState(false);
    const [staffError, setStaffError] = useState('');

    useEffect(() => {
        let isMounted = true;
        if (isOpen) {
            const fetchStaff = async () => {
                setIsFetchingStaff(true);
                setStaffError('');
                try {
                    const response = await api.get('/api/tickets/technicians'); // Confirmed: returns admin, manager, technician
                    if (isMounted) {
                        setLocalStaff(response.data || []);
                    }
                } catch (error) {
                    console.error("Staff fetch failed", error);
                    if (isMounted) {
                        setStaffError("Could not load staff list");
                    }
                } finally {
                    if (isMounted) {
                        setIsFetchingStaff(false);
                    }
                }
            };
            fetchStaff();
        }
        return () => { isMounted = false; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Escalate / Assign Ticket</h2>
                        <p className="text-sm text-gray-500">Assign to Technician, Manager, or Admin</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Select Staff Member</label>
                        <div className="relative">
                            <select
                                value={targetStaffId}
                                onChange={(e) => setTargetStaffId(e.target.value)}
                                disabled={isFetchingStaff}
                                className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-gray-900 disabled:opacity-50"
                            >
                                <option value="">{isFetchingStaff ? "Loading staff..." : "Select staff member..."}</option>
                                {localStaff && localStaff.length > 0 && localStaff.map(staff => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.full_name || staff.username} ({staff.role})
                                    </option>
                                ))}
                            </select>
                            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {(localStaff?.length === 0 || staffError) && !isFetchingStaff && (
                            <p className="text-xs text-red-500 mt-1">
                                {staffError || "No eligible staff found."}
                            </p>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all uppercase tracking-wide"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!targetStaffId || isFetchingStaff}
                        onClick={() => onAssign(targetStaffId)}
                        className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-indigo-100 uppercase tracking-wide"
                    >
                        Confirm Assign
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const ReopenModal = ({ isOpen, onClose, onSubmit }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reopen Ticket</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Please provide a reason</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-400">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason</label>
                        <AIAssistantButton
                            text={reason}
                            onPolished={setReason}
                            contextType="ticket_resolution"
                            additionalContext="Reopening a previously closed/resolved ticket."
                        />
                    </div>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Explain why this ticket needs to be reopened..."
                        className="w-full h-32 p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium resize-none text-gray-900 dark:text-white"
                        autoFocus
                    />
                </div>

                <div className="p-6 bg-gray-50 dark:bg-slate-800/50 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all uppercase tracking-wide"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!reason.trim()}
                        onClick={() => onSubmit(reason)}
                        className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-indigo-100 dark:shadow-none uppercase tracking-wide"
                    >
                        Confirm Reopen
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const AISuggestionModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-indigo-100 dark:border-slate-800"
            >
                <div className="p-8 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white dark:from-slate-900 dark:to-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <FiRefreshCw className="animate-spin-slow" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">AI Resolved Suggestion</h2>
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                                Technical Analysis Engine
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all text-gray-400">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Summary Section */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            Analysis Summary
                        </h3>
                        <div className="p-6 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100/50 dark:border-indigo-500/10">
                            <p className="text-gray-800 dark:text-slate-300 font-bold leading-relaxed">
                                {data.summary}
                            </p>
                        </div>
                    </div>

                    {/* Steps Section */}
                    <div className="space-y-4 text-left">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                            Suggested Resolution Steps
                        </h3>
                        <div className="space-y-3">
                            {data.steps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all group"
                                >
                                    <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                        {step}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* KB Links Section */}
                    {data.kb_articles?.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                                Relevant Knowledge Base
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {data.kb_articles.map((art, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            onClose();
                                            // Navigation would happen here
                                        }}
                                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-indigo-500 hover:shadow-lg transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <FiPaperclip />
                                            </div>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{art.title}</span>
                                        </div>
                                        <FiArrowLeft className="rotate-180 text-gray-300 group-hover:text-indigo-600 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Confidence Warning */}
                    <div className="flex items-center gap-3 p-4 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                        <FiAlertCircle className="text-gray-400" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider italic">
                            AI Confidence: {(data.confidence * 100).toFixed(0)}% | Always verify locally before implementing fixes
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center">
                    <button
                        onClick={onClose}
                        className="px-12 py-3 text-sm font-black text-white bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 rounded-2xl transition-all shadow-xl shadow-indigo-100 dark:shadow-none uppercase tracking-widest"
                    >
                        Understood
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return then.toLocaleDateString();
};

const CSATFeedback = ({ ticket, onSubmit }) => {
    const [rating, setRating] = useState(ticket.rating || 0);
    const [hover, setHover] = useState(0);
    const [feedback, setFeedback] = useState(ticket.feedback || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAlreadyRated = !!ticket.rating;

    const handleSubmit = async () => {
        if (rating === 0) return alert("Please select a star rating");
        setIsSubmitting(true);
        try {
            await onSubmit({ rating, feedback });
        } catch (error) {
            console.error("Feedback failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isAlreadyRated) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 dark:bg-emerald-500/5 p-12 rounded-[3.5rem] border border-emerald-100 dark:border-emerald-900/30 text-center relative overflow-hidden flex flex-col items-center gap-6"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400"></div>

                <motion.div
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-emerald-200/20 flex items-center justify-center"
                >
                    <FiHeart className="text-emerald-500 fill-emerald-500" size={40} />
                </motion.div>

                <div>
                    <h3 className="text-2xl font-black text-emerald-900 dark:text-white uppercase tracking-tight mb-2">Feedback Received!</h3>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium max-w-xs mx-auto">Thank you for helping us maintain our premium support quality.</p>
                </div>

                <div className="flex gap-2 bg-white/50 dark:bg-slate-800/50 p-4 rounded-3xl">
                    {[1, 2, 3, 4, 5].map(star => (
                        <FiStar
                            key={star}
                            size={28}
                            className={`${star <= ticket.rating ? 'fill-yellow-400 text-yellow-400' : 'text-emerald-100 dark:text-emerald-900/20'}`}
                        />
                    ))}
                </div>

                {ticket.feedback && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-emerald-800/70 dark:text-emerald-300 italic font-medium px-8 py-4 bg-emerald-100/50 dark:bg-emerald-500/10 rounded-2xl w-full max-w-sm"
                    >
                        "{ticket.feedback}"
                    </motion.p>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-xl shadow-indigo-100/10"
        >
            <div className="p-8 md:p-10 flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-600">
                    <FiStar size={32} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">How was your experience?</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md">Please rate your technician's performance on a scale of 1 to 5.</p>
                </div>

                <div className="flex gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                            className="transition-all hover:scale-125 focus:outline-none"
                        >
                            <FiStar
                                size={40}
                                className={`transition-colors ${(hover || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 dark:text-slate-700'}`}
                            />
                        </button>
                    ))}
                </div>

                <div className="w-full max-w-lg space-y-4">
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Tell us what went well or what we can improve (optional)..."
                        className="w-full h-32 p-6 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 rounded-[2rem] outline-none transition-all text-sm font-medium resize-none shadow-inner"
                    />
                    <button
                        disabled={rating === 0 || isSubmitting}
                        onClick={handleSubmit}
                        className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <FiRefreshCw className="animate-spin" /> : <FiCheck />}
                        Submit Rating
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const HoldModal = ({ isOpen, onClose, onSubmit }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!reason.trim()) return alert("Please provide a reason for the hold");
        setLoading(true);
        try {
            await onSubmit(reason);
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to put ticket on hold");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2 dark:text-white tracking-tight">Put Ticket on Hold</h2>
                    <p className="text-gray-500 text-sm mb-6 font-medium">Please provide a reason for pausing the work on this ticket.</p>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason for Hold</label>
                                <AIAssistantButton
                                    text={reason}
                                    onPolished={setReason}
                                    contextType="ticket_resolution"
                                    additionalContext="Putting a ticket on hold temporarily."
                                />
                            </div>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-amber-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all h-32 resize-none dark:text-white text-sm font-medium"
                                placeholder="e.g., Waiting for replacement parts, Pending user feedback..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button onClick={onClose} className="flex-1 py-4 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-all">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 py-4 bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-600 shadow-xl shadow-amber-200 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : 'Confirm Hold'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const TicketDetailView = () => {
    const { id } = useParams();
    // ID is now passed as numeric from TicketList
    const numericId = id.includes('#TKT-') ? id.replace('#TKT-', '') : id;
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ticket, setTicket] = useState(null);
    const [commentsList, setCommentsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false); // Added state
    const [isRepairInitModalOpen, setIsRepairInitModalOpen] = useState(false);
    const [isRepairReportModalOpen, setIsRepairReportModalOpen] = useState(false); // To be implemented inside RepairWorkflow or here
    const [isRepairCloseModalOpen, setIsRepairCloseModalOpen] = useState(false);
    const [isAISuggestionModalOpen, setIsAISuggestionModalOpen] = useState(false);
    const [aiSuggestionData, setAiSuggestionData] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiHistorySummary, setAiHistorySummary] = useState(null);
    const [isSummarizingHistory, setIsSummarizingHistory] = useState(false);
    const ticketRef = React.useRef(null);

    const fetchTicketDetails = React.useCallback(async () => {
        try {
            setLoading(true);
            const [ticketRes, commentsRes] = await Promise.all([
                api.get(`/api/tickets/${numericId}`),
                api.get(`/api/communication/tickets/${numericId}/comments`)
            ]);
            const ticketData = ticketRes.data;
            if (ticketData.sentiment_data && typeof ticketData.sentiment_data === 'string') {
                ticketData.sentiment_data = JSON.parse(ticketData.sentiment_data);
            }
            setTicket(ticketData);
            setCommentsList(commentsRes.data);
        } catch (error) {
            console.error("Failed to fetch ticket details", error);
        } finally {
            setLoading(false);
        }
    }, [numericId]);

    useEffect(() => {
        fetchTicketDetails();
    }, [fetchTicketDetails]);

    const handlePostComment = async () => {
        if (!comment.trim()) return;
        try {
            await api.post(`/api/communication/tickets/${numericId}/comments`, {
                text: comment,
                is_internal: isInternal
            });

            setComment('');
            setIsInternal(false);

            // Refresh comments
            const commentsRes = await api.get(`/api/communication/tickets/${numericId}/comments`);
            setCommentsList(commentsRes.data);
        } catch (error) {
            console.error("Failed to post comment", error);
            alert("Failed to post comment");
        }
    };

    const handleReopenTicket = () => {
        setIsReopenModalOpen(true);
    };

    const handleConfirmReopen = async (reason) => {
        try {
            await api.post(`/api/tickets/${numericId}/reopen`, {
                reason: reason
            });
            setIsReopenModalOpen(false);
            fetchTicketDetails();
        } catch (error) {
            console.error("Failed to reopen ticket", error);
            alert("Failed to reopen ticket. Please try again.");
        }
    };

    const handleDownloadPDF = async () => {
        if (!ticketRef.current) return;
        try {
            const canvas = await html2canvas(ticketRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Ticket_#TKT-${ticket.id}.pdf`);
        } catch (error) {
            console.error("PDF generation failed", error);
            alert("Failed to generate PDF");
        }
    };

    const handleHoldTicket = async (reason) => {
        try {
            await api.put(`/api/tickets/${numericId}`, { status: 'hold', hold_reason: reason });

            // Add to history
            const history = JSON.parse(ticket.ticket_history || '[]');
            history.push({
                type: 'hold',
                hold_reason: reason,
                user: user.username,
                timestamp: new Date().toISOString()
            });
            await api.put(`/api/tickets/${numericId}`, {
                ticket_history: JSON.stringify(history)
            });

            fetchTicketDetails();
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const handleTicketUpdate = async (updatedData) => {
        try {
            // Mapping back the fields that might differ between modal and API
            const apiData = {
                title: updatedData.subject || updatedData.title, // Handle both potential keys
                description: updatedData.description,
                priority: updatedData.priority,
                category: updatedData.category,
                subcategory: updatedData.subcategory,
                // Attachments are handled as a comma strings in this simple version
                attachments: updatedData.attachments
            };

            await api.put(`/api/tickets/${numericId}`, apiData);

            // Log this edit in history
            const history = JSON.parse(ticket.ticket_history || '[]');
            history.push({
                type: 'edit',
                text: `Ticket details updated by Admin`,
                user: user.full_name || user.username,
                timestamp: new Date().toISOString()
            });
            await api.put(`/api/tickets/${numericId}`, {
                ticket_history: JSON.stringify(history)
            });

            fetchTicketDetails();
            alert("Ticket updated successfully!");
        } catch (error) {
            console.error("Failed to update ticket", error);
            alert("Failed to update ticket. Please try again.");
        }
    };

    const handleAssignTicket = async (staffId) => {
        try {
            await api.put('/api/tickets/bulk-assign', {
                ticket_ids: [ticket.id], // Using db_id implies we need integer ID, but variable 'ticket.id' might be int from DB. 
                // Wait, response.data from detail view likely has integer id as 'id'. 
                // TicketList passes db_id. Here response.data usually maps DB model directly.
                technician_id: parseInt(staffId)
            });

            // Add history log
            const history = JSON.parse(ticket.ticket_history || '[]');
            history.push({
                type: 'status_change', // or 'assign'
                text: `Ticket assigned to staff ID ${staffId}`, // ideally fetch name but ID is okay ensuring partial refresh
                new_status: ticket.status,
                user: user.full_name || user.username,
                timestamp: new Date().toISOString()
            });
            await api.put(`/api/tickets/${numericId}`, {
                ticket_history: JSON.stringify(history)
            });

            fetchTicketDetails();
            setIsAssignModalOpen(false);
            alert("Ticket successfully assigned!");
        } catch (error) {
            console.error("Failed to assign ticket", error);
            alert("Failed to assign ticket.");
        }
    };

    const handleResolveTicket = async () => {
        if (!window.confirm("Are you sure you want to mark this ticket as Resolved?")) return;

        try {
            // Update status
            await api.put(`/api/tickets/${numericId}`, { status: 'resolved' });

            // Add history
            const history = JSON.parse(ticket.ticket_history || '[]');
            history.push({
                type: 'status_change',
                new_status: 'resolved',
                user: user.full_name || user.username,
                timestamp: new Date().toISOString()
            });
            await api.put(`/api/tickets/${numericId}`, {
                ticket_history: JSON.stringify(history)
            });

            fetchTicketDetails();
        } catch (error) {
            console.error("Failed to resolve ticket", error);
            alert("Failed to resolve ticket.");
        }
    };

    const handleTakeToRepair = () => {
        setIsRepairInitModalOpen(true);
    };

    const onRepairInit = async (data) => {
        try {
            await api.put(`/api/tickets/${numericId}/repair/init`, data);
            fetchTicketDetails();
            setIsRepairInitModalOpen(false);
        } catch (error) {
            console.error("Init failed", error);
            alert("Failed to initiate repair workflow");
        }
    };

    const onRepairUpdate = async (data) => {
        try {
            await api.put(`/api/tickets/${numericId}/repair/update`, data);
            fetchTicketDetails();
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update repair status");
        }
    };

    const handlePostFeedback = async (data) => {
        try {
            await api.put(`/api/communication/tickets/${numericId}/feedback`, data);
            fetchTicketDetails();
            alert("Feedback submitted! Thank you.");
        } catch (error) {
            console.error("Failed to submit feedback", error);
            alert("Failed to submit feedback.");
        }
    };

    const handleGetAISuggestion = async () => {
        setAiLoading(true);
        try {
            const res = await api.get(`/api/tickets/${numericId}/ai-suggestion`);
            setAiSuggestionData(res.data);
            setIsAISuggestionModalOpen(true);
        } catch (err) {
            console.error("AI Error", err);
            alert("Failed to generate AI suggestion");
        } finally {
            setAiLoading(false);
        }
    };

    const handleSummarizeHistory = async () => {
        setIsSummarizingHistory(true);
        try {
            const res = await api.post(`/api/tickets/${numericId}/summarize`);
            setAiHistorySummary(res.data.summary);
        } catch (err) {
            console.error("AI Summarization Error", err);
            alert("Failed to generate history summary");
        } finally {
            setIsSummarizingHistory(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Loading Ticket Details...</p>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="text-center">
                    <FiAlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket Not Found</h2>
                    <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 font-bold flex items-center gap-2 mx-auto hover:underline">
                        <FiArrowLeft /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const history = JSON.parse(ticket.ticket_history || '[]');
    const latestReopenEvent = history.slice().reverse().find(e => e.type === 'reopened');

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Top Nav */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl text-gray-600 dark:text-slate-400 font-bold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm group"
                    >
                        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                        Back to List
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Last Sync</p>
                            <p className="text-xs font-bold text-gray-500">Just Now</p>
                        </div>
                        <button className="p-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl text-gray-400 hover:text-indigo-600 transition-colors">
                            <FiRotateCcw onClick={() => fetchTicketDetails()} />
                        </button>
                    </div>
                </div>

                {/* Edit Modal */}
                <CreateTicketModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    initialTicket={ticket}
                    onUpdate={handleTicketUpdate}
                />

                <AssignModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssign={handleAssignTicket}
                />

                <ReopenModal
                    isOpen={isReopenModalOpen}
                    onClose={() => setIsReopenModalOpen(false)}
                    onSubmit={handleConfirmReopen}
                />

                <HoldModal
                    isOpen={isHoldModalOpen}
                    onClose={() => setIsHoldModalOpen(false)}
                    onSubmit={handleHoldTicket}
                />

                <AISuggestionModal
                    isOpen={isAISuggestionModalOpen}
                    onClose={() => setIsAISuggestionModalOpen(false)}
                    data={aiSuggestionData}
                />

                {ticket && (
                    <RepairInitiationModal
                        isOpen={isRepairInitModalOpen}
                        onClose={() => setIsRepairInitModalOpen(false)}
                        ticket={ticket}
                        onInit={onRepairInit}
                    />
                )}

                {/* Main Content Area for PDF */}
                <div ref={ticketRef} className="space-y-6">
                    {/* Duplicate Alert Banner for Technicians */}
                    {(user.role === 'admin' || user.role === 'manager' || user.role === 'technician') && ticket.linked_to_id && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 flex items-center justify-between gap-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                    <FiAlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-amber-900 dark:text-amber-500 uppercase tracking-widest">Potential Duplicate Detected</h3>
                                    <p className="text-xs font-bold text-amber-700/70 dark:text-amber-400/70">This ticket might be part of a larger incident. Linked to Ticket #TKT-{ticket.linked_to_id}.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/dashboard/tickets/${ticket.linked_to_id}`)}
                                className="px-6 py-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                            >
                                View Main Ticket
                            </button>
                        </motion.div>
                    )}

                    {/* Main Header Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-indigo-100/20 dark:shadow-none border border-gray-100 dark:border-slate-800 overflow-hidden p-8 md:p-10"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <StatusBadge status={ticket.status} />
                                    {ticket.sentiment_data?.level === 'High Alert' && (
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-red-500 text-white px-2 py-1 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse">
                                            High Alert
                                        </span>
                                    )}
                                    <span className="text-sm font-mono text-indigo-600 font-black">#TKT-{ticket.id}</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight mb-2">
                                    {ticket.subject}
                                </h1>
                                <p className="text-red-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                    <FiArrowLeft className="rotate-90" /> SLA: Priority Response Overdue
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {(user.role === 'admin' || user?.permissions?.ticket_edit) && (
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200"
                                    >
                                        <FiEdit /> Edit Details
                                    </button>
                                )}
                                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <FiMessageSquare size={32} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Ticket ID</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">#TKT-{ticket.id}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Priority</p>
                                <PriorityBadge priority={ticket.priority} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Category</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{ticket.category}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Reporter</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                        <FiUser size={12} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white uppercase truncate">{ticket.owner?.full_name || ticket.owner?.username}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Assignee</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                        <FiUser size={12} className="text-indigo-600" />
                                    </div>
                                    <p className="text-sm font-bold text-indigo-600 uppercase truncate">{ticket.assignee?.full_name || 'Unassigned'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Created At</p>
                                <p className="text-sm font-bold text-gray-700 dark:text-slate-300">
                                    {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'short', year: 'numeric'
                                    }) : 'N/A'}
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium">
                                    {ticket.created_at ? new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </p>
                            </div>
                        </div>
                    </motion.div>


                    {/* Repair Workflow Section */}
                    {ticket.repair_details && (
                        <>
                            {['admin', 'manager', 'technician'].includes(user.role) ? (
                                <RepairWorkflow ticket={ticket} onUpdate={onRepairUpdate} currentUserId={user.id} />
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 mb-8">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <FiTool size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold dark:text-white">Repairs in Progress</h3>
                                            <p className="text-sm text-gray-500">Your device is currently being serviced by our team.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className={`px-4 py-2 rounded-xl font-bold text-sm ${ticket.status === 'closed' || ticket.repair_details.delivery_time ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white'}`}>
                                            Dispatched for Repair
                                        </div>
                                        {(ticket.status === 'closed' || ticket.repair_details.delivery_time) && (
                                            <div className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm">
                                                Delivered
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* CSAT Section - Show for Owner when ticket is resolved or closed */}
                    {user.id === ticket.user_id && (ticket.status === 'resolved' || ticket.status === 'closed') && (
                        <CSATFeedback ticket={ticket} onSubmit={handlePostFeedback} />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Side: Activity & Details */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Reopen Reason Alert */}
                            {latestReopenEvent && ticket.status === 'reopened' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-orange-50 dark:bg-orange-500/10 rounded-[2rem] border border-orange-100 dark:border-orange-500/20 p-8"
                                >
                                    <div className="flex items-center gap-2 mb-4 text-orange-600">
                                        <FiRotateCcw className="animate-spin-slow" />
                                        <h3 className="text-xs font-black uppercase tracking-widest">Ticket Reopened</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Reason provided by {latestReopenEvent.user}</span>
                                            <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                                "{latestReopenEvent.reason}"
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-orange-400/70 uppercase">
                                            <FiClock />
                                            {latestReopenEvent.timestamp ? new Date(latestReopenEvent.timestamp).toLocaleString() : 'N/A'}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            {/* Description Box */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 p-8"
                            >
                                <div className="flex items-center gap-2 mb-6 text-indigo-600">
                                    <FiAlertCircle />
                                    <h3 className="text-xs font-black uppercase tracking-widest">Initial Issue Report</h3>
                                </div>

                                {ticket.ai_summary && (
                                    <div className="mb-6 p-6 bg-indigo-50 dark:bg-indigo-500/5 border-l-4 border-indigo-500 rounded-r-3xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FiRefreshCw className="text-indigo-600 animate-spin-slow" size={16} />
                                            <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">AI Smart Summary</span>
                                        </div>
                                        <p className="text-sm text-gray-900 dark:text-white font-bold italic leading-relaxed">
                                            "{ticket.ai_summary}"
                                        </p>
                                    </div>
                                )}

                                <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                                    {ticket.description}
                                </p>

                                {ticket.ai_auto_reply && (
                                    <div className="mt-8 p-8 bg-indigo-600 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-indigo-200 dark:shadow-none">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <FiZap size={120} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                                    <FiZap size={18} className="text-white" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Smart Assistant: Suggested Fix</span>
                                            </div>
                                            <p className="text-lg font-bold leading-relaxed mb-6 whitespace-pre-line">
                                                {ticket.ai_auto_reply}
                                            </p>
                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                                Was this helpful? Our technician will still review your ticket soon.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {ticket.status.toLowerCase() === 'hold' && ticket.hold_reason && (
                                    <div className="mt-6 p-6 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-900/30 rounded-3xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FiAlertCircle className="text-amber-600" size={16} />
                                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Ticket Hold Reason</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">
                                            {ticket.hold_reason}
                                        </p>
                                    </div>
                                )}
                            </motion.div>

                            {/* Activity Log */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 overflow-hidden"
                            >
                                <div className="p-8 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Activity Log</h3>
                                        <div className="px-3 py-1 bg-gray-50 dark:bg-slate-800 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {history.length} Events
                                        </div>
                                    </div>

                                    {(user.role === 'admin' || user.role === 'manager' || user.role === 'technician') && (
                                        <button
                                            onClick={handleSummarizeHistory}
                                            disabled={isSummarizingHistory}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 group shadow-sm"
                                        >
                                            <FiCpu className={isSummarizingHistory ? "animate-spin" : "group-hover:rotate-12 transition-transform"} />
                                            {isSummarizingHistory ? "AI Analysing..." : "AI History Summary"}
                                        </button>
                                    )}
                                </div>

                                {aiHistorySummary && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mx-8 mt-8 p-6 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <FiZap size={80} />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                                    <FiCpu size={18} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Brain: Conversation Digest</span>
                                            </div>
                                            <div className="text-sm font-bold leading-relaxed space-y-2">
                                                {aiHistorySummary.split('\n').map((line, i) => (
                                                    <p key={i}>{line}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="p-8">
                                    <div className="space-y-8 relative">
                                        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-50 dark:bg-slate-800"></div>
                                        {history.filter(event => {
                                            if (user.role === 'user' && event.is_internal) return false;
                                            return true;
                                        }).map((event, idx) => (
                                            <div key={idx} className="relative pl-10 group">
                                                <div className={`absolute left-0 w-8 h-8 rounded-xl flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110 ${event.type === 'created' ? 'bg-blue-600 text-white' :
                                                    event.type === 'status_change' ? 'bg-orange-500 text-white' :
                                                        event.type === 'comment' ? 'bg-indigo-600 text-white' :
                                                            event.type === 'hold' ? 'bg-amber-500 text-white' :
                                                                event.type === 'ai_auto_reply' ? 'bg-indigo-500 text-white' :
                                                                    event.type === 'duplicate_alert' ? 'bg-red-500 text-white' :
                                                                        event.type === 'ai_tech_guide' ? 'bg-emerald-600 text-white' :
                                                                            'bg-gray-400 text-white'
                                                    }`}>
                                                    {event.type === 'created' ? <FiPlusCircle size={14} /> :
                                                        event.type === 'status_change' ? <FiRefreshCw size={14} /> :
                                                            event.type === 'comment' ? <FiMessageSquare size={14} /> :
                                                                event.type === 'hold' ? <FiClock size={14} /> :
                                                                    event.type === 'ai_auto_reply' ? <FiZap size={14} /> :
                                                                        event.type === 'duplicate_alert' ? <FiAlertCircle size={14} /> :
                                                                            event.type === 'ai_tech_guide' ? <FiTool size={14} /> :
                                                                                <FiClock size={14} />}
                                                </div>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                                                            {event.type === 'status_change' ? `Status changed to ${event.new_status}` :
                                                                event.type === 'comment' ? `${event.user} posted a comment` :
                                                                    event.type === 'created' ? `Ticket created by ${event.user}` :
                                                                        event.type === 'hold' ? `Ticket placed on hold by ${event.user}` :
                                                                            event.type === 'ai_auto_reply' ? 'AI Assistant Suggestion' :
                                                                                event.type === 'duplicate_alert' ? 'Security Alert: Duplicate Detected' :
                                                                                    event.type === 'ai_tech_guide' ? 'AI Co-Pilot: Technical Guide' :
                                                                                        event.type}
                                                        </p>
                                                        {event.text && (
                                                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 italic font-medium">"{event.text}"</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">
                                                        <FiClock />
                                                        {event.timestamp ? new Date(event.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Comments & Notes Section */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden"
                            >
                                <div className="p-8 border-b border-gray-50 dark:border-slate-800">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Comments & Professional Notes</h3>
                                </div>

                                <div className="p-8 bg-gray-50/50 dark:bg-slate-800/20 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {commentsList.map((c, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`flex gap-5 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative group ${c.is_internal
                                                ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-100/50 dark:border-amber-900/30'
                                                : ''}`}
                                        >
                                            <div className="flex-shrink-0 pt-1">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm ring-4 ring-white dark:ring-slate-950 shadow-sm ${c.is_internal ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'}`}>
                                                    {(c.author?.full_name || c.author?.username || 'S').substring(0, 1).toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                            {c.author?.full_name || c.author?.username || 'Team Proserve'}
                                                        </span>
                                                        {c.is_internal && (
                                                            <span className="flex items-center gap-1.5 text-[9px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-lg uppercase tracking-widest">
                                                                <FiLock size={10} /> Internal
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
                                                        <FiClock size={12} className="text-gray-300" /> {formatTimeAgo(c.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                                                    {c.text}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {commentsList.length === 0 && (
                                        <div className="text-center py-10">
                                            <FiMessageSquare size={40} className="mx-auto text-gray-200 mb-3" />
                                            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No professional notes yet</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 space-y-4">
                                    <div className="relative group">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Write a note</span>
                                            <AIAssistantButton
                                                text={comment}
                                                onPolished={setComment}
                                                contextType="ticket_resolution"
                                                additionalContext={`Ticket: ${ticket.subject}. Current status: ${ticket.status}`}
                                            />
                                        </div>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Add a comment or internal note..."
                                            className="w-full h-32 p-6 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 rounded-[2rem] outline-none transition-all text-sm font-medium resize-none shadow-sm"
                                        />
                                        <div className="absolute right-6 bottom-6 flex items-center gap-3">
                                            {['admin', 'manager', 'technician'].includes(user.role) && (
                                                <label className="flex items-center gap-2 cursor-pointer group/toggle">
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isInternal}
                                                        onChange={() => setIsInternal(!isInternal)}
                                                    />
                                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isInternal ? 'bg-orange-500' : 'bg-gray-300'}`}>
                                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isInternal ? 'translate-x-4' : ''}`}></div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400 group-hover:text-orange-600 transition-colors uppercase tracking-widest">Internal</span>
                                                </label>
                                            )}
                                            <button
                                                onClick={handlePostComment}
                                                disabled={!comment.trim()}
                                                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                                            >
                                                <FiSend /> Post Note
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right Side: Attachments & Actions */}
                        <div className="space-y-6">
                            {/* AI Co-Pilot Technical Guide Card */}
                            {['admin', 'manager', 'technician'].includes(user.role) && ticket.ai_tech_guide && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-emerald-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-emerald-200 dark:shadow-none"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <FiTool size={100} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <FiZap size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-widest">AI Co-Pilot</h3>
                                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-tight text-white whitespace-nowrap">Resolution Blueprint</p>
                                            </div>
                                        </div>

                                        <div
                                            className="text-sm font-medium leading-relaxed space-y-4 prose prose-invert prose-emerald max-w-none 
                                            prose-h3:text-[11px] prose-h3:font-black prose-h3:uppercase prose-h3:tracking-[0.2em] prose-h3:text-emerald-100 prose-h3:mt-6 prose-h3:mb-2
                                            prose-p:mt-0 prose-p:mb-4
                                            prose-ul:my-2 prose-li:my-0 pb-2"
                                            dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(
                                                    (ticket.ai_tech_guide || "")
                                                        .replace(/\n\n/g, '<br/>')
                                                        .replace(/### (.*)/g, '<h3>$1</h3>')
                                                )
                                            }}
                                        />

                                        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-emerald-600 bg-emerald-500 overflow-hidden">
                                                        <FiUser className="w-full h-full p-1 opacity-50" />
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Internal Technical Asset</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            {/* Attachments Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden"
                            >
                                <div className="p-8 border-b border-gray-50 dark:border-slate-800">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Attachments</h3>
                                </div>
                                <div className="p-8 space-y-4">
                                    {ticket.attachments && (typeof ticket.attachments === 'string' ? ticket.attachments.split(',') : ticket.attachments).map((file, i) => {
                                        const cleanFile = file.trim();
                                        const fileUrl = cleanFile.startsWith('http')
                                            ? cleanFile
                                            : `${api.defaults.baseURL}${cleanFile.startsWith('/') ? '' : '/'}${cleanFile}`;

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => window.open(fileUrl, '_blank')}
                                                className="group p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all cursor-pointer flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-colors">
                                                        <FiPaperclip />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-xs font-black text-gray-900 dark:text-white truncate">{cleanFile.split('/').pop()}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Document Asset</p>
                                                    </div>
                                                </div>
                                                <FiDownload className="text-gray-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                                            </div>
                                        );
                                    })}
                                    {(!ticket.attachments || ticket.attachments.length === 0) && (
                                        <div className="text-center py-6 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] italic">
                                            No files attached
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Smart Co-Pilot (Staff Only) */}
                            {['admin', 'manager', 'technician'].includes(user.role) && (
                                <SmartCoPilotCard ticketId={numericId} ticketData={ticket} />
                            )}

                            {/* Quick Actions Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden"
                            >
                                <div className="p-8 border-b border-gray-50 dark:border-slate-800">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Management</h3>
                                </div>
                                <div className="p-8 space-y-3">
                                    {['admin', 'manager', 'technician'].includes(user.role) && (ticket.status.toLowerCase() !== 'resolved' && ticket.status.toLowerCase() !== 'closed') && (
                                        <div className="space-y-3">
                                            <button
                                                onClick={handleResolveTicket}
                                                disabled={ticket.repair_details && !ticket.repair_details.delivery_time}
                                                className={`w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 
                                                ${(ticket.repair_details && !ticket.repair_details.delivery_time)
                                                        ? 'bg-gray-400 cursor-not-allowed opacity-70'
                                                        : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none'}`}
                                                title={(ticket.repair_details && !ticket.repair_details.delivery_time) ? "Complete repair delivery to resolve" : ""}
                                            >
                                                <FiCheckCircle size={16} />
                                                {(ticket.repair_details && !ticket.repair_details.delivery_time) ? "Pending Delivery" : "Resolve Ticket"}
                                            </button>

                                            {ticket.status.toLowerCase() !== 'hold' && (
                                                <button
                                                    onClick={() => setIsHoldModalOpen(true)}
                                                    className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200 dark:shadow-none"
                                                >
                                                    <FiClock size={16} /> Put on Hold
                                                </button>
                                            )}

                                            <button
                                                onClick={handleGetAISuggestion}
                                                disabled={aiLoading}
                                                className="w-full py-4 bg-indigo-50 border-2 border-indigo-100 text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100/10"
                                            >
                                                {aiLoading ? (
                                                    <FiRefreshCw className="animate-spin" size={16} />
                                                ) : (
                                                    <FiRefreshCw size={16} />
                                                )}
                                                {aiLoading ? "Analyzing..." : "Resolved Suggestion"}
                                            </button>
                                        </div>
                                    )}
                                    {['admin', 'manager', 'technician'].includes(user.role) && (
                                        <>
                                            {(ticket.status.toLowerCase() !== 'resolved' && ticket.status.toLowerCase() !== 'closed' && !ticket.repair_details) && (
                                                <button
                                                    onClick={handleTakeToRepair}
                                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                                                >
                                                    <FiTool size={16} /> Take to Repair
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {(ticket.status.toLowerCase() === 'resolved' || ticket.status.toLowerCase() === 'closed') && (
                                        <button
                                            onClick={handleReopenTicket}
                                            className="w-full py-4 bg-white dark:bg-slate-900 border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 group"
                                        >
                                            <FiRotateCcw className="group-hover:rotate-180 transition-transform duration-500" />
                                            Reopen Ticket
                                        </button>
                                    )}
                                    {['admin', 'manager'].includes(user.role) && (
                                        <button
                                            onClick={() => setIsAssignModalOpen(true)}
                                            className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <FiFlag /> Escalate / Assign Ticket
                                        </button>
                                    )}
                                    {user.role === 'admin' && (
                                        <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-4">
                                            Standard SLA Applied
                                        </p>
                                    )}
                                    {(['resolved', 'closed'].includes(ticket.status.toLowerCase())) && (
                                        <button
                                            onClick={handleDownloadPDF}
                                            className="w-full py-4 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 dark:border-indigo-500/20"
                                        >
                                            <FiDownload /> Download Details PDF
                                        </button>
                                    )}
                                </div>
                            </motion.div>

                            {/* AI Smart Co-Pilot (Staff Only) */}
                            {['admin', 'manager', 'technician'].includes(user.role) && (
                                <div className="space-y-6">
                                    <SmartCoPilotCard ticketId={numericId} ticketData={ticket} />
                                    <SentimentAnalysisCard ticket={ticket} />
                                    <SimilarTicketsCard ticketId={numericId} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center py-10 opacity-30">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">
                            &copy; 2025 PROSERVE SYSTEM. ALL RIGHTS RESERVED.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailView;
