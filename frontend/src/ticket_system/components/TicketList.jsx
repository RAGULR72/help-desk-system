import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiSearch, FiFilter, FiPlus, FiChevronDown, FiClock,
    FiCheckCircle, FiAlertCircle, FiUser,
    FiGrid, FiSave, FiX, FiRefreshCw, FiColumns, FiArrowUp, FiArrowDown, FiCalendar,
    FiUsers, FiPaperclip, FiUserPlus, FiFlag, FiTrash2,
    FiCheckSquare, FiEye, FiDownload, FiRotateCcw, FiUserCheck, FiList, FiFile, FiEdit
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useTranslation } from '../../context/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import CreateTicketModal from './CreateTicketModal';
import TicketKanbanBoard from './TicketKanbanBoard';
import api from '../../api/axios';
import { exportToExcel, exportToPDF } from '../../utils/exportUtils';

const SuccessTick = () => (
    <div className="w-48 h-48 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center relative">
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="absolute inset-0 bg-green-100/50 dark:bg-green-800/10 rounded-full"
        />
        <motion.svg
            viewBox="0 0 52 52"
            className="w-24 h-24 text-green-600 dark:text-green-400 relative z-10"
        >
            <motion.circle
                cx="26"
                cy="26"
                r="25"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "circOut" }}
            />
            <motion.path
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l7 7 16-16"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6, ease: "backOut" }}
            />
        </motion.svg>
    </div>
);

const ErrorCross = () => (
    <div className="w-48 h-48 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center relative">
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 bg-red-100/50 dark:bg-red-800/10 rounded-full"
        />
        <motion.svg
            viewBox="0 0 52 52"
            className="w-20 h-20 text-red-600 dark:text-red-400 relative z-10"
        >
            <motion.circle
                cx="26"
                cy="26"
                r="25"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8 }}
            />
            <motion.path
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                d="M16 16l20 20M36 16L16 36"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
            />
        </motion.svg>
    </div>
);

const MessageModal = ({ isOpen, onClose, title, message, type = "success" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-slate-800"
            >
                <div className="p-10 text-center pb-8 flex flex-col items-center">
                    <div className="mb-6">
                        {type === 'success' ? <SuccessTick /> : <ErrorCross />}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                        {title}
                    </h2>
                    <p className="text-base text-slate-500 dark:text-slate-400 font-medium px-2 leading-relaxed">
                        {message}
                    </p>
                </div>
                <div className="p-8 pt-0">
                    <button
                        onClick={onClose}
                        className="w-full py-5 text-base font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-[2rem] transition-all shadow-2xl shadow-indigo-200 dark:shadow-none uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                    >
                        Great!
                    </button>
                </div>
            </motion.div>
        </div>
    );
};











import { baseURL } from '../../api/axios';

const getAttachmentUrl = (file) => {
    if (!file) return '';
    if (file.startsWith('http')) return file;
    if (file.includes('static/')) {
        return `${baseURL}${file.startsWith('/') ? '' : '/'}${file}`;
    }
    return `${baseURL}/static/uploads/${file}`;
};

const PriorityBadge = ({ priority }) => {
    const { t } = useTranslation();
    const normalizedPriority = priority ? priority.toLowerCase().replace(' ', '_') : 'low';

    // Premium semantic colors matching SLAMonitoring
    const styles = {
        critical: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
        high: 'text-orange-500 bg-orange-500/10 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]',
        medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        normal: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    };

    const style = styles[normalizedPriority] || styles.medium;
    const label = t(`tickets.values.${normalizedPriority}`);

    return (
        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-wider border ${style} backdrop-blur-sm whitespace-nowrap`}>
            {label}
        </span>
    );
};

const StatusBadge = ({ status }) => {
    const { t } = useTranslation();
    let normalizedStatus = status ? status.toLowerCase().replace(' ', '_') : 'open';
    if (normalizedStatus === 'closed') normalizedStatus = 'resolved';

    const styles = {
        open: 'text-primary bg-primary/10 border-primary/20 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]',
        in_progress: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        pending: 'text-slate-500 bg-slate-100 border-slate-200',
        resolved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
        closed: 'text-gray-500 bg-gray-100 border-gray-200',
        repairing: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
        hold: 'text-amber-600 bg-amber-600/10 border-amber-600/20 shadow-[0_0_10px_rgba(217,119,6,0.15)]'
    };

    const style = styles[normalizedStatus] || styles.pending;
    const label = t(`tickets.values.${normalizedStatus}`);

    return (
        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-wider border ${style} backdrop-blur-sm whitespace-nowrap`}>
            {label}
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
                    const response = await api.get('/api/tickets/technicians');
                    if (isMounted) {
                        setLocalStaff(response.data || []);
                    }
                } catch (error) {
                    console.error("Staff fetch failed", error);
                    if (isMounted) {
                        const detail = error.response?.data?.detail;
                        const msg = typeof detail === 'string'
                            ? detail
                            : detail ? JSON.stringify(detail) : "Could not load staff list";
                        setStaffError(msg);
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
                        <h2 className="text-xl font-bold text-gray-900">Assign Ticket</h2>
                        <p className="text-sm text-gray-500">Pick a staff member to handle this ticket</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Select Staff Member</label>
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
                                {staffError || "No staff found. Please ensure users are approved."}
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



const SLACountdown = ({ createdAt, status, slaDeadline, className = "" }) => {
    const [timeLeftData, setTimeLeftData] = useState(() => calculateDetailedTimeRemaining(createdAt, status, slaDeadline));

    useEffect(() => {
        const s = status?.toLowerCase();
        if (s === 'resolved' || s === 'closed' || timeLeftData.label === 'MET') return;

        const timer = setInterval(() => {
            setTimeLeftData(calculateDetailedTimeRemaining(createdAt, status, slaDeadline));
        }, 1000);
        return () => clearInterval(timer);
    }, [createdAt, status, slaDeadline, timeLeftData.label]);

    if (timeLeftData.label === 'MET') {
        return (
            <div className={`flex items-center gap-1.5 text-emerald-500 font-bold opacity-80 ${className}`}>
                <FiCheckCircle size={12} className="shrink-0" />
                <span className="text-[10px] uppercase tracking-widest font-black">SLA Met</span>
            </div>
        );
    }

    if (timeLeftData.label === 'Expired') {
        return (
            <div className={`flex items-center gap-1.5 text-rose-500 font-black px-2 py-1 rounded-lg bg-rose-500/5 border border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] ${className}`}>
                <FiAlertCircle size={12} className="shrink-0 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest">Breached</span>
            </div>
        );
    }

    const { urgency, label } = timeLeftData;

    let colorClasses = "text-slate-400";
    if (urgency === 'critical') {
        colorClasses = "text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)] font-black";
    } else if (urgency === 'warning') {
        colorClasses = "text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)] font-bold";
    }

    return (
        <div className={`flex items-center gap-2 transition-all duration-300 ${colorClasses} ${className} ${urgency === 'critical' ? 'animate-pulse scale-105' : ''}`}>
            <FiClock size={12} className={`${urgency === 'critical' ? 'animate-spin-slow' : ''}`} />
            <span className="tabular-nums font-mono text-[11px] tracking-tighter">
                {label}
            </span>
        </div>
    );
};

const calculateDetailedTimeRemaining = (createdAt, status, slaDeadline) => {
    const s = status?.toLowerCase();
    if (s === 'resolved' || s === 'closed') return { label: 'MET', urgency: 'none' };

    const now = new Date();
    let deadline;

    if (slaDeadline) {
        deadline = new Date(slaDeadline);
    } else if (createdAt) {
        deadline = new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000);
    } else {
        return { label: '48h 0m 0s', urgency: 'none' };
    }

    const diff = deadline - now;

    if (diff <= 0) return { label: 'Expired', urgency: 'breached' };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let urgency = 'none';
    if (hours < 2) urgency = 'critical';
    else if (hours < 24) urgency = 'warning';

    return {
        label: `${hours}h ${minutes}m ${seconds}s`,
        urgency
    };
};

const TicketList = ({ userRole, currentUserId }) => {
    const { t } = useTranslation();
    const { checkPermission, user } = useAuth();
    const navigate = useNavigate();

    // 1. Hooks (State) first
    const [tickets, setTickets] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [messageConfig, setMessageConfig] = useState(null);
    const [activePopover, setActivePopover] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [dateFilter, setDateFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'
    const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });
    const [exportFormat, setExportFormat] = useState('excel');
    const [showActiveSLA, setShowActiveSLA] = useState(() => {
        const saved = localStorage.getItem('showActiveSLA');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const filterOptions = ['Subject', 'Rating', 'Ticket Split From', 'Key', 'Raised By (Email)', 'SLA Status', 'Feedback (Extra)', 'Total Hold Time'];

    // 2. Fetching logic


    const fetchTicketsData = React.useCallback(async () => {
        try {
            const response = await api.get(`/api/tickets/?t=${new Date().getTime()}`);
            return response.data.map(t => ({
                id: t.custom_id || `#TKT-${t.id}`,
                db_id: t.id,
                title: t.subject || 'No Subject',
                priority: t.priority ? (t.priority.charAt(0).toUpperCase() + t.priority.slice(1)) : 'Medium',
                status: t.status ? (t.status.charAt(0).toUpperCase() + t.status.slice(1)) : 'Open',
                requester: t.owner?.full_name || t.owner?.username || 'Unknown',
                technician_name: t.assignee?.full_name || t.assignee?.username || 'Unassigned',
                technician_phone: t.assignee?.phone || 'N/A',
                customer_name: t.owner?.full_name || t.owner?.username || 'Unknown',
                customer_phone: t.owner?.phone || 'N/A',
                category: t.category || 'Other',
                subcategory: t.subcategory,
                description: t.description || '',
                attachments: t.attachments ? t.attachments.split(',') : [],
                assignedTo: t.assigned_to,
                owner_id: t.user_id,
                created_at: t.created_at,
                sla_deadline: t.sla_deadline,
                updated_at: t.updated_at,
                ai_summary: t.ai_summary,
                sentiment: t.sentiment,
                sentiment_data: t.sentiment_data ? JSON.parse(t.sentiment_data) : null,
                ai_auto_reply: t.ai_auto_reply,
                linked_to_id: t.linked_to_id
            }));
        } catch (error) {
            console.error("Failed to fetch tickets", error);
            return [];
        }
    }, []);

    const refreshTickets = React.useCallback(async () => {
        setIsRefreshing(true);
        const data = await fetchTicketsData();
        setTickets(data);
        setTimeout(() => setIsRefreshing(false), 500); // Visual feedback
    }, [fetchTicketsData]);

    // 3. Effects
    useEffect(() => {
        localStorage.setItem('showActiveSLA', JSON.stringify(showActiveSLA));
    }, [showActiveSLA]);

    useEffect(() => {
        let isMounted = true;
        fetchTicketsData().then(data => {
            if (isMounted) setTickets(data);
        });
        return () => { isMounted = false; };
    }, [userRole, fetchTicketsData]);



    const handleBulkResolve = async () => {
        try {
            const dbIds = selectedTickets.map(id => {
                const t = tickets.find(ticket => ticket.id === id);
                return t ? t.db_id : null;
            }).filter(id => id !== null);

            if (dbIds.length === 0) return;

            await api.put('/api/tickets/bulk-update-status', {
                ticket_ids: dbIds,
                status: 'resolved'
            });
            await refreshTickets();
            setSelectedTickets([]);
            setMessageConfig({ title: "Bulk Succcess", message: `Successfully resolved ${dbIds.length} tickets!`, icon: FiCheckCircle, type: 'success' });
        } catch (error) {
            console.error("Failed to bulk resolve tickets", error);
            setMessageConfig({ title: "Bulk Error", message: "Failed to update ticket statuses.", icon: FiAlertCircle, type: 'error' });
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedTickets.length} tickets? This action cannot be undone.`)) return;
        try {
            const dbIds = selectedTickets.map(id => {
                const t = tickets.find(ticket => ticket.id === id);
                return t ? t.db_id : null;
            }).filter(id => id !== null);

            if (dbIds.length === 0) return;

            await api.delete('/api/tickets/bulk/delete', {
                data: { ticket_ids: dbIds }
            });
            await refreshTickets();
            setSelectedTickets([]);
            setMessageConfig({ title: "Bulk Delete Success", message: `Successfully deleted ${dbIds.length} tickets!`, icon: FiTrash2, type: 'success' });
        } catch (error) {
            console.error("Failed to bulk delete tickets", error);
            setMessageConfig({ title: "Delete Error", message: "Failed to delete tickets. Please check permissions.", icon: FiAlertCircle, type: 'error' });
        }
    };

    const handleSingleDelete = async (ticketId, dbId) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY delete ticket ${ticketId}? This action cannot be undone.`)) return;
        try {
            await api.delete(`/api/tickets/${dbId}`);
            await refreshTickets();
            setSelectedTicketId(null);
            setMessageConfig({ title: "Ticket Deleted", message: `Successfully removed ticket ${ticketId}`, icon: FiTrash2, type: 'success' });
        } catch (error) {
            console.error("Failed to delete ticket", error);
            setMessageConfig({ title: "Delete Error", message: "Failed to delete ticket.", icon: FiAlertCircle, type: 'error' });
        }
    };

    const handleExport = () => {
        // Filter tickets based on export date range if provided
        let ticketsToExport = tickets;

        if (exportDateRange.start) {
            const startDate = new Date(exportDateRange.start);
            startDate.setHours(0, 0, 0, 0);
            ticketsToExport = ticketsToExport.filter(t => new Date(t.created_at) >= startDate);
        }

        if (exportDateRange.end) {
            const endDate = new Date(exportDateRange.end);
            endDate.setHours(23, 59, 59, 999);
            ticketsToExport = ticketsToExport.filter(t => new Date(t.created_at) <= endDate);
        }

        const dataToExport = ticketsToExport.map(t => ({
            ID: t.id,
            Title: t.title,
            Status: t.status,
            Priority: t.priority,
            Requester: t.requester,
            Assignee: t.technician_name || 'Unassigned',
            Category: t.category,
            Created: new Date(t.created_at).toLocaleString(),
            Updated: new Date(t.updated_at).toLocaleString(),
            SLA_Deadline: t.sla_deadline ? new Date(t.sla_deadline).toLocaleString() : 'N/A'
        }));

        if (exportFormat === 'excel') {
            exportToExcel(dataToExport, `Tickets_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else if (exportFormat === 'pdf') {
            exportToPDF(
                ['ID', 'Title', 'Status', 'Priority', 'Requester', 'Assignee', 'Category'],
                dataToExport.map(t => [t.ID, t.Title, t.Status, t.Priority, t.Requester, t.Assignee, t.Category]),
                'Ticket System Report',
                `Tickets_Report_${new Date().toISOString().split('T')[0]}.pdf`
            );
        }
        setActivePopover(null);
        // Reset range after export if desired, or keep it.
        // setExportDateRange({ start: '', end: '' });
    };

    const handleKanbanStatusUpdate = async (id, newStatus) => {
        const ticket = tickets.find(t => t.id === id);
        if (!ticket) return;

        let hold_reason = null;
        if (newStatus === 'hold') {
            hold_reason = window.prompt("Please provide a reason for placing this ticket on hold:");
            if (hold_reason === null) return; // User cancelled
            if (!hold_reason.trim()) {
                alert("Hold reason is mandatory.");
                return;
            }
        }

        try {
            await api.put(`/api/tickets/${ticket.db_id}`, { status: newStatus, hold_reason: hold_reason || undefined });
            // Optimistic update
            setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, hold_reason: hold_reason || t.hold_reason } : t));

            setMessageConfig({ title: "Status Updated", message: `Ticket moved to ${newStatus}`, icon: FiCheckCircle, type: 'success' });
            setTimeout(refreshTickets, 1000);
        } catch (error) {
            console.error("Failed to update status", error);
            setMessageConfig({ title: "Update Failed", message: "Could not update status", icon: FiAlertCircle, type: 'error' });
            refreshTickets(); // Revert
        }
    };






    // 4. Memos
    const [currentSort, setCurrentSort] = useState({ field: 'ID', direction: 'asc' });

    const filteredMockData = useMemo(() => {
        let data = [...tickets];

        if (userRole === 'technician') {
            data = data.filter(t => Number(t.assignedTo) === Number(currentUserId));
        } else if (userRole === 'user') {
            // User only sees their own
            data = data.filter(t => t.owner_id === currentUserId);
        }

        // Apply Sorting
        data.sort((a, b) => {
            let fieldA, fieldB;

            switch (currentSort.field) {
                case 'Last Modified':
                    fieldA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    fieldB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    break;
                case 'Created':
                    fieldA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    fieldB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    break;
                case 'Priority':
                    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'normal': 2, 'low': 1 };
                    fieldA = priorityOrder[String(a.priority).toLowerCase()] || 0;
                    fieldB = priorityOrder[String(b.priority).toLowerCase()] || 0;
                    break;
                case 'Status':
                    fieldA = (a.status || '').toLowerCase();
                    fieldB = (b.status || '').toLowerCase();
                    break;
                case 'ID':
                    // Extract number from #TKT-123
                    fieldA = parseInt((a.id || '').replace(/\D/g, '')) || 0;
                    fieldB = parseInt((b.id || '').replace(/\D/g, '')) || 0;
                    break;
                case 'Due Date':
                    fieldA = a.sla_deadline ? new Date(a.sla_deadline).getTime() : 0;
                    fieldB = b.sla_deadline ? new Date(b.sla_deadline).getTime() : 0;
                    break;
                default:
                    fieldA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    fieldB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            }

            if (currentSort.direction === 'asc') {
                return fieldA > fieldB ? 1 : -1;
            } else {
                return fieldA < fieldB ? 1 : -1;
            }
        });

        return data;
    }, [tickets, userRole, currentUserId, currentSort]);

    const filteredByDate = useMemo(() => {
        if (dateFilter === 'all') return filteredMockData;
        const now = new Date();
        return filteredMockData.filter(t => {
            const ticketDate = new Date(t.created_at);
            if (dateFilter === 'weekly') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return ticketDate >= oneWeekAgo;
            }
            if (dateFilter === 'monthly') {
                return ticketDate.getMonth() === now.getMonth() && ticketDate.getFullYear() === now.getFullYear();
            }
            if (dateFilter === 'yearly') {
                return ticketDate.getFullYear() === now.getFullYear();
            }
            if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
                const start = new Date(customDateRange.start);
                const end = new Date(customDateRange.end);
                end.setHours(23, 59, 59, 999);
                return ticketDate >= start && ticketDate <= end;
            }
            return true;
        });
    }, [filteredMockData, dateFilter, customDateRange]);

    const slaTickets = useMemo(() => {
        const now = new Date();
        return tickets
            .filter(t => t.status.toLowerCase() !== 'resolved' && t.status.toLowerCase() !== 'closed')
            .map(t => {
                let deadline;
                if (t.sla_deadline) {
                    deadline = new Date(t.sla_deadline);
                } else if (t.created_at) {
                    deadline = new Date(new Date(t.created_at).getTime() + 48 * 60 * 60 * 1000);
                } else {
                    return null;
                }
                const diff = deadline - now;
                return { ...t, msRemaining: diff };
            })
            .filter(t => t !== null)
            .sort((a, b) => a.msRemaining - b.msRemaining)
            .slice(0, 3);
    }, [tickets]);

    const sortOptions = ['Last Modified', 'Created', 'Priority', 'Status', 'Due Date', 'ID'];
    const columnOptions = [
        { id: 'id', label: 'ID', visible: true },
        { id: 'subject', label: 'Subject', visible: true },
        { id: 'status', label: 'Status', visible: true },
        { id: 'first_response', label: 'First response', visible: false },
        { id: 'resolution', label: 'Resolution', visible: false },
        { id: 'assigned_to', label: 'Assigned To', visible: true },
        { id: 'customer', label: 'Customer', visible: true },
        { id: 'priority', label: 'Priority', visible: true },
    ];
    const [activeColumns] = useState(columnOptions);

    const togglePopover = (popoverName) => {
        setActivePopover(activePopover === popoverName ? null : popoverName);
    };

    // Calculate Counts using current time
    const counts = {
        all: filteredByDate.length,
        my_tickets: filteredByDate.filter(t =>
            Number(t.owner_id) === Number(currentUserId) || Number(t.assignedTo) === Number(currentUserId)
        ).length,
        unassigned: filteredByDate.filter(t => !t.assignedTo).length,
        high_priority: filteredByDate.filter(t => ['Critical', 'High'].includes(t.priority)).length,
        sla_risk: filteredByDate.filter(t => {
            const tr = calculateDetailedTimeRemaining(t.created_at, t.status, t.sla_deadline);
            return ['critical', 'breached'].includes(tr.urgency);
        }).length,
        pending_approval: filteredByDate.filter(t => t.status === 'Pending').length
    };

    const getDisplayedTickets = () => {
        let tickets = filteredByDate;

        // Tab Filter
        if (activeTab === 'my_tickets') {
            tickets = tickets.filter(t =>
                Number(t.owner_id) === Number(currentUserId) || Number(t.assignedTo) === Number(currentUserId)
            );
        } else if (activeTab === 'unassigned') {
            tickets = tickets.filter(t => !t.assignedTo);
        } else if (activeTab === 'high_priority') {
            tickets = tickets.filter(t => ['Critical', 'High'].includes(t.priority));
        } else if (activeTab === 'sla_risk') {
            tickets = tickets.filter(t => {
                const tr = calculateDetailedTimeRemaining(t.created_at, t.status, t.sla_deadline);
                return ['critical', 'breached'].includes(tr.urgency);
            });
        } else if (activeTab === 'pending_approval') {
            tickets = tickets.filter(t => t.status === 'Pending');
        }

        // Search Filter
        if (searchQuery) {
            tickets = tickets.filter(t =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.requester.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return tickets;
    };

    const finalFilteredTickets = getDisplayedTickets();
    const totalPages = Math.ceil(finalFilteredTickets.length / itemsPerPage);
    const displayedTickets = finalFilteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [dateFilter, searchQuery, activeTab, itemsPerPage]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedTickets(displayedTickets.map(t => t.id));
        } else {
            setSelectedTickets([]);
        }
    };

    // Close popovers on click outside (simple implementation for now)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activePopover && !event.target.closest('button') && !event.target.closest('.absolute')) {
                // This is a bit too aggressive, usually we'd use refs, but for this mock level it's okay-ish
                // or just rely on the user re-clicking the button or clicking inside.
                // Better: dont auto-close here to avoid complexity without refs.
                // We'll rely on toggle.
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activePopover]);

    const handleSelectOne = (id) => {
        if (selectedTickets.includes(id)) {
            setSelectedTickets(selectedTickets.filter(tid => tid !== id));
        } else {
            setSelectedTickets([...selectedTickets, id]);
        }
    };

    return (
        <>
            <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-300 overflow-hidden">

                {/* Premium Stats Summary Bar */}
                {userRole !== 'user' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        {[
                            { label: 'Total Tickets', value: counts.all, icon: <FiList size={18} />, gradient: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-500/5 dark:bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400' },
                            { label: 'Unassigned', value: counts.unassigned, icon: <FiUserPlus size={18} />, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/5 dark:bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
                            { label: 'High Priority', value: counts.high_priority, icon: <FiFlag size={18} />, gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-500/5 dark:bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400' },
                            { label: 'SLA Breached', value: counts.sla_risk, icon: <FiAlertCircle size={18} />, gradient: 'from-red-600 to-rose-600', bg: 'bg-red-500/5 dark:bg-red-500/10', border: 'border-red-500/20', text: 'text-red-600 dark:text-red-400', pulse: counts.sla_risk > 0 },
                        ].map((stat, idx) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.07, duration: 0.4 }}
                                className={`relative overflow-hidden rounded-2xl ${stat.bg} border ${stat.border} p-4 group hover:scale-[1.02] transition-all duration-300 cursor-default`}
                            >
                                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.gradient} opacity-[0.06] rounded-full -translate-y-6 translate-x-6 group-hover:opacity-[0.12] transition-opacity`} />
                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-1">{stat.label}</p>
                                        <p className={`text-2xl font-black ${stat.text} tabular-nums tracking-tight ${stat.pulse ? 'animate-pulse' : ''}`}>{stat.value}</p>
                                    </div>
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all`}>
                                        {stat.icon}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Redesigned Tabs */}
                <div className="flex items-center justify-between gap-1 mb-4 border-b border-card-border/50 transition-colors">
                    <div className="flex items-center gap-0.5">
                        {[
                            { id: 'all', label: 'All Tickets', count: counts.all },
                            { id: 'my_tickets', label: t('tickets.filters.my_tickets'), count: counts.my_tickets },
                            { id: 'unassigned', label: t('tickets.filters.unassigned'), count: counts.unassigned },
                            { id: 'high_priority', label: t('tickets.filters.high_priority'), count: counts.high_priority },
                            { id: 'sla_risk', label: 'SLA Breached', count: counts.sla_risk },
                        ].filter(tab => {
                            if (userRole === 'user') {
                                return !['high_priority', 'my_tickets', 'unassigned'].includes(tab.id);
                            }
                            if (userRole === 'technician') {
                                return !['unassigned', 'my_tickets'].includes(tab.id);
                            }
                            return true;
                        }).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 rounded-t-lg ${activeTab === tab.id
                                    ? 'text-primary bg-primary/5'
                                    : 'text-slate-500 hover:text-main hover:bg-white/5'
                                    }`}
                            >
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={`text-[9px] min-w-[20px] text-center px-1.5 py-0.5 rounded-full font-bold transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-card-border/50 text-slate-500'}`}>
                                        {tab.count}
                                    </span>
                                )}
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-gradient-to-r from-primary to-primary-hover rounded-full"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>


                </div>

                {/* Toolbar */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.03] dark:bg-white/[0.02] rounded-2xl p-3 border border-card-border/20">
                    {/* Left: Filter Group + Search */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        {/* Search Bar */}
                        <div className="relative flex-1 min-w-[180px] max-w-sm group">
                            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted group-focus-within:text-primary group-focus-within:scale-110 transition-all text-xs" />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-field pl-10 pr-4 py-2.5 text-[11px] bg-white dark:bg-slate-900 border-card-border/30 focus:border-primary/50 rounded-xl focus:shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.1)] transition-all"
                            />
                        </div>

                        {/* Date Filters */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-card-border/50 p-1 rounded-[1.25rem] shadow-inner overflow-hidden">
                            {['all', 'weekly', 'monthly', 'yearly'].map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setDateFilter(period)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${dateFilter === period
                                        ? 'bg-primary text-white shadow-xl shadow-primary/40 brightness-110'
                                        : 'text-muted hover:text-main hover:bg-white/10'
                                        }`}
                                >
                                    {period}
                                </button>
                            ))}
                            <button
                                onClick={() => setDateFilter('custom')}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${dateFilter === 'custom'
                                    ? 'bg-primary text-white shadow-xl shadow-primary/40 brightness-110'
                                    : 'text-muted hover:text-main hover:bg-white/10'
                                    }`}
                            >
                                <FiCalendar size={12} />
                                Custom
                            </button>
                        </div>

                        {/* Custom Date Inputs */}
                        <AnimatePresence>
                            {dateFilter === 'custom' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-card-border/50"
                                >
                                    <input
                                        type="date"
                                        value={customDateRange.start}
                                        onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                                        className="bg-transparent border-none rounded-lg px-2 py-1 text-[10px] font-black text-main focus:ring-0 w-28 uppercase"
                                    />
                                    <span className="text-muted text-[10px] font-black px-1 opacity-40">→</span>
                                    <input
                                        type="date"
                                        value={customDateRange.end}
                                        onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                                        className="bg-transparent border-none rounded-lg px-2 py-1 text-[10px] font-black text-main focus:ring-0 w-28 uppercase"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-visible relative">
                        {/* Export Button */}
                        {(userRole === 'admin' || user?.permissions?.ticket_export) && (
                            <div className="relative">
                                <button
                                    onClick={() => togglePopover('export')}
                                    className={`p-2.5 rounded-xl transition-all border shadow-sm ${activePopover === 'export' ? 'bg-primary text-white border-primary shadow-primary/20' : 'bg-white dark:bg-slate-900 border-card-border/50 text-muted hover:text-main hover:bg-white/10'}`}
                                    title="Export Data"
                                >
                                    <FiDownload size={18} />
                                </button>
                                {activePopover === 'export' && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setActivePopover(null)}></div>
                                        <div className="absolute top-full right-0 mt-3 w-64 glass-card p-4 z-50 animate-in fade-in zoom-in-95 duration-200 border border-white/10 shadow-2xl">
                                            <h4 className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">Export Data Range</h4>

                                            <div className="space-y-3 mb-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-gray-500 uppercase">Start Date</label>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            value={exportDateRange.start}
                                                            onChange={(e) => setExportDateRange({ ...exportDateRange, start: e.target.value })}
                                                            className="w-full bg-white dark:bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-main focus:border-primary/50 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-gray-500 uppercase">End Date</label>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            value={exportDateRange.end}
                                                            onChange={(e) => setExportDateRange({ ...exportDateRange, end: e.target.value })}
                                                            className="w-full bg-white dark:bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-main focus:border-primary/50 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg mb-4">
                                                <button
                                                    onClick={() => setExportFormat('excel')}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wide transition-all ${exportFormat === 'excel' ? 'bg-emerald-500 text-white shadow-lg' : 'text-muted hover:text-main'}`}
                                                >
                                                    <FiGrid size={12} /> Excel
                                                </button>
                                                <button
                                                    onClick={() => setExportFormat('pdf')}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wide transition-all ${exportFormat === 'pdf' ? 'bg-red-500 text-white shadow-lg' : 'text-muted hover:text-main'}`}
                                                >
                                                    <FiFile size={12} /> PDF
                                                </button>
                                            </div>

                                            <button
                                                onClick={handleExport}
                                                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <FiDownload size={14} />
                                                Done
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Refresh */}
                        <button
                            onClick={refreshTickets}
                            disabled={isRefreshing}
                            className="p-2.5 text-muted hover:text-primary hover:bg-white/10 rounded-xl transition-all border border-card-border/50 bg-white dark:bg-slate-900 shadow-sm active:scale-95 disabled:opacity-50"
                            title="Refresh"
                        >
                            <FiRefreshCw size={18} className={isRefreshing ? 'animate-spin text-primary' : ''} />
                        </button>

                        {/* View Toggle */}
                        {userRole !== 'user' && (
                            <div className="flex items-center bg-white dark:bg-slate-900 border border-card-border/50 p-1 rounded-xl shadow-inner">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-main'}`}
                                    title="List View"
                                >
                                    <FiList size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('board')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-primary text-white shadow-lg' : 'text-muted hover:text-main'}`}
                                    title="Kanban Board"
                                >
                                    <FiColumns size={18} />
                                </button>
                            </div>
                        )}

                        {/* Filter Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => togglePopover('filter')}
                                className={`flex items-center gap-3 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border shadow-sm transition-all ${activePopover === 'filter' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-card-border/50 text-main hover:bg-white/10'}`}
                            >
                                <FiFilter size={14} />
                                <span>Filter</span>
                            </button>

                            {activePopover === 'filter' && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setActivePopover(null)}></div>
                                    <div className="absolute top-full right-0 mt-3 w-80 glass-card p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Advance Search</div>
                                        <div className="relative mb-4 group">
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Search fields..."
                                                className="input-field py-2.5 pl-10 pr-4 text-[10px] bg-white dark:bg-slate-900 border-card-border focus:border-primary/50"
                                            />
                                            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors text-sm" />
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                            {filterOptions.map(opt => (
                                                <button key={opt} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-main hover:bg-primary/10 hover:text-primary rounded-lg transition-all border border-transparent hover:border-primary/20">
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sort Dropdown */}
                        {userRole !== 'user' && (
                            <div className="relative flex items-center bg-white dark:bg-slate-900 border border-card-border/50 rounded-xl shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setCurrentSort(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                    className="px-3 py-3 text-muted hover:text-primary hover:bg-white/10 border-r border-card-border/50 transition-all"
                                    title={currentSort.direction === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                                >
                                    {currentSort.direction === 'asc' ? <FiArrowUp size={16} /> : <FiArrowDown size={16} />}
                                </button>
                                <button
                                    onClick={() => togglePopover('sort')}
                                    className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${activePopover === 'sort' ? 'text-primary bg-primary/10' : 'text-main hover:bg-white/10'}`}
                                >
                                    <span>{currentSort.field}</span>
                                    <FiChevronDown className={`transition-transform duration-300 ${activePopover === 'sort' ? 'rotate-180' : ''}`} />
                                </button>

                                {activePopover === 'sort' && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setActivePopover(null)}></div>
                                        <div className="absolute top-full right-0 mt-3 w-64 glass-card p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex items-center justify-between px-3 py-2 border-b border-card-border/30 mb-2">
                                                <span className="text-[10px] font-black text-muted uppercase tracking-widest">Sort By</span>
                                                <span className="text-[8px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                    {currentSort.direction}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                {sortOptions.map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => { setCurrentSort(prev => ({ ...prev, field: opt })); setActivePopover(null); }}
                                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex justify-between items-center ${currentSort.field === opt ? 'bg-primary text-white shadow-lg' : 'text-main hover:bg-white/10'}`}
                                                    >
                                                        {opt}
                                                        {currentSort.field === opt && <FiCheckCircle size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Columns Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => togglePopover('columns')}
                                className={`flex items-center gap-3 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border shadow-sm transition-all ${activePopover === 'columns' ? 'bg-primary text-white border-primary' : 'bg-white/5 border-card-border/50 text-main hover:bg-white/10'}`}
                            >
                                <FiColumns size={14} />
                                <span>Columns</span>
                            </button>

                            {activePopover === 'columns' && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setActivePopover(null)}></div>
                                    <div className="absolute top-full right-0 mt-3 w-64 glass-card p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex items-center justify-between px-2 py-2 mb-2">
                                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Display Layout</span>
                                            <button className="text-[10px] font-black text-primary hover:underline">Reset</button>
                                        </div>
                                        <div className="px-2 mb-2">
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-colors cursor-pointer group" onClick={() => setShowActiveSLA(!showActiveSLA)}>
                                                <span className="text-[10px] font-bold text-main">Active SLAs Widget</span>
                                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${showActiveSLA ? 'bg-primary' : 'bg-gray-600'}`}>
                                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${showActiveSLA ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="max-h-72 overflow-y-auto space-y-1 custom-scrollbar">
                                            {activeColumns.map(col => (
                                                <button
                                                    key={col.id}
                                                    className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-main hover:bg-white/5 rounded-lg transition-all flex items-center justify-between group border border-transparent hover:border-card-border/50"
                                                >
                                                    <span className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full shadow-lg ${col.visible ? 'bg-primary shadow-primary/40' : 'bg-muted opacity-20'}`}></div>
                                                        {col.label}
                                                    </span>
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 text-muted">
                                                        <FiGrid size={12} className="cursor-move" />
                                                        <FiPlus style={{ transform: 'rotate(45deg)' }} size={12} className="hover:text-red-500" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* New Ticket Button */}
                        {checkPermission('Tickets', 'create') && (
                            <motion.button
                                onClick={() => setIsCreateTicketOpen(true)}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                className="btn-primary px-5 py-2.5 flex items-center gap-2.5 relative overflow-hidden group ml-2 shadow-[0_10px_25px_-8px_rgba(var(--primary-rgb),0.5)] rounded-xl"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                <FiPlus className="relative z-10" size={15} />
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] relative z-10">{t('tickets.filters.new')}</span>
                            </motion.button>
                        )}
                    </div>
                </div>

                <div className="flex h-screen flex-row overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 relative">

                    {userRole !== 'user' && (
                        <div className={`transition-all duration-300 ease-in-out ${!showActiveSLA ? 'w-0 opacity-0 overflow-hidden pointer-events-none' : 'w-72'} flex-shrink-0 space-y-4 lg:block hidden`}>
                            {/* SLA Widget */}
                            <div className="glass-card p-6 border-none bg-white dark:bg-slate-900 relative overflow-hidden group">
                                {/* Close Button */}
                                <button
                                    onClick={() => setShowActiveSLA(false)}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/10 text-muted hover:text-white hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 z-20"
                                    title="Hide Widget"
                                >
                                    <FiX size={12} />
                                </button>
                                {/* Decorative Background Element */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>

                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <FiClock className="animate-pulse" size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Active SLAs</span>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse"></div>
                                </div>

                                <div className="space-y-8 relative z-10">
                                    {slaTickets.length > 0 ? slaTickets.map((t) => (
                                        <motion.button
                                            key={t.id}
                                            whileHover={{ x: 6 }}
                                            onClick={() => setSelectedTicketId(t.id)}
                                            className="w-full text-left group block"
                                        >
                                            <div className="flex justify-between items-center mb-3">
                                                <span className={`text-[10px] font-black font-mono px-2.5 py-1 rounded-md tracking-wider ${t.msRemaining < 3600000 ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                                                    {t.id}
                                                </span>
                                                <SLACountdown
                                                    createdAt={t.created_at}
                                                    status={t.status}
                                                    slaDeadline={t.sla_deadline}
                                                    className="text-lg font-black tracking-tighter"
                                                />
                                            </div>
                                            <div className="text-[11px] text-muted group-hover:text-main transition-colors font-bold truncate leading-tight mb-3">
                                                {t.title}
                                            </div>
                                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.max(5, Math.min(100, (1 - t.msRemaining / (48 * 3600000)) * 100))}%` }}
                                                    className={`h-full rounded-full transition-all duration-1000 ${t.msRemaining < 3600000 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-primary to-primary-hover'}`}
                                                />
                                            </div>
                                        </motion.button>
                                    )) : (
                                        <div className="py-10 text-center space-y-4">
                                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                                <FiCheckCircle size={32} className="text-emerald-500/50" />
                                            </div>
                                            <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em] leading-relaxed">System Stable<br /><span className="text-emerald-500/50">All SLAs compliant</span></p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setActiveTab('high_priority')}
                                    className="w-full mt-10 py-4 bg-white/5 hover:bg-white/10 border border-card-border/50 rounded-[1.25rem] text-[9px] font-black uppercase tracking-[0.2em] text-muted hover:text-main transition-all active:scale-95 group"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        Analyze Risks <FiArrowUp size={12} className="rotate-45 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Main Content - Ticket List */}
                    <div className="flex-1 flex gap-6 min-w-0">
                        {viewMode === 'board' && userRole !== 'user' ? (
                            <div className="flex-1 h-full overflow-hidden">
                                <TicketKanbanBoard
                                    tickets={displayedTickets}
                                    onStatusChange={handleKanbanStatusUpdate}
                                    onTicketClick={(id) => navigate(`/dashboard/tickets/${id}`)}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 glass-card border-none bg-white dark:bg-slate-900 flex flex-col overflow-hidden transition-colors shadow-xl shadow-black/5 relative">
                                {/* Gradient top accent */}
                                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                                <div className="lg:hidden overflow-y-auto flex-1 p-4 space-y-4 custom-scrollbar">
                                    {displayedTickets.map((ticket) => {
                                        const slaInfo = calculateDetailedTimeRemaining(ticket.created_at, ticket.status, ticket.sla_deadline);
                                        const isCritical = slaInfo.urgency === 'critical';

                                        return (
                                            <motion.div
                                                key={ticket.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                onClick={() => setSelectedTicketId(ticket.id)}
                                                className={`glass-card p-4 border-none bg-white dark:bg-slate-900 transition-all active:scale-[0.98] shadow-lg group hover:bg-white/10 cursor-pointer border-l-[3px] ${isCritical ? 'ring-2 ring-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] !bg-rose-500/[0.05] !border-l-rose-500'
                                                    : ticket.priority === 'High' ? 'border-l-orange-500'
                                                        : ticket.priority === 'Critical' ? 'border-l-rose-500'
                                                            : ticket.priority === 'Medium' ? 'border-l-amber-400'
                                                                : 'border-l-primary/30'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="text-[9px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md tracking-wider whitespace-nowrap"
                                                        >
                                                            {ticket.id}
                                                        </span>
                                                        <StatusBadge status={ticket.status} />
                                                    </div>
                                                    <PriorityBadge priority={ticket.priority} />
                                                </div>

                                                <h3 className="font-black text-main text-xs mb-2 line-clamp-2 leading-relaxed">
                                                    {ticket.title}
                                                </h3>

                                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-3 border-t border-card-border/30">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[9px] text-muted font-black uppercase tracking-[0.15em]">Requester</p>
                                                        <p className="text-[11px] font-bold text-main truncate opacity-80">{ticket.requester}</p>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[9px] text-muted font-black uppercase tracking-[0.15em]">Engineer</p>
                                                        <p className="text-[11px] font-bold text-main truncate opacity-80">{ticket.technician_name || 'Unassigned'}</p>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[9px] text-muted font-black uppercase tracking-[0.15em]">Launch Date</p>
                                                        <p className="text-[11px] font-bold text-main opacity-80">
                                                            {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-[9px] text-muted font-black uppercase tracking-[0.15em]">SLA Tempo</p>
                                                        <SLACountdown createdAt={ticket.created_at} status={ticket.status} slaDeadline={ticket.sla_deadline} />
                                                    </div>
                                                </div>

                                                <div className="mt-6 flex gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedTicketId(ticket.id); }}
                                                        className="flex-1 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all"
                                                    >
                                                        Full Analysis
                                                    </button>
                                                    {userRole !== 'user' && (
                                                        <div className="flex items-center px-4 bg-white/5 border border-card-border/50 rounded-2xl">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-card-border bg-transparent text-primary focus:ring-primary/20"
                                                                checked={selectedTickets.includes(ticket.id)}
                                                                onChange={(e) => { e.stopPropagation(); handleSelectOne(ticket.id); }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                                    <table className="w-full min-w-full border-separate border-spacing-y-1.5 px-3 pb-12">
                                        <thead className="sticky top-0 z-20 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                                            <tr>
                                                <th className="bg-gradient-to-r from-slate-50 to-white dark:from-[#0f1014] dark:to-[#0f1014]/95 backdrop-blur-xl p-3 first:rounded-l-xl last:rounded-r-xl border-y border-white/5 text-center w-12 shadow-sm">
                                                    {userRole !== 'user' && (
                                                        <input
                                                            type="checkbox"
                                                            className="w-3.5 h-3.5 rounded border-card-border bg-transparent text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                                            onChange={handleSelectAll}
                                                            checked={displayedTickets.length > 0 && selectedTickets.length === displayedTickets.length}
                                                        />
                                                    )}
                                                </th>
                                                <th className="bg-gradient-to-r from-white to-slate-50/80 dark:from-[#0f1014]/95 dark:to-[#0f1014]/90 backdrop-blur-xl p-3 border-y border-white/5 text-left w-20 shadow-sm">{t('tickets.table.id')}</th>
                                                <th className="bg-gradient-to-r from-slate-50/80 to-white dark:from-[#0f1014]/90 dark:to-[#0f1014]/85 backdrop-blur-xl p-3 border-y border-white/5 text-left shadow-sm">{t('tickets.table.title')}</th>
                                                <th className="bg-gradient-to-r from-white to-slate-50/80 dark:from-[#0f1014]/85 dark:to-[#0f1014]/80 backdrop-blur-xl p-3 border-y border-white/5 text-center w-32 shadow-sm">{t('tickets.table.status')}</th>
                                                <th className="bg-gradient-to-r from-slate-50/80 to-white dark:from-[#0f1014]/80 dark:to-[#0f1014]/75 backdrop-blur-xl p-3 border-y border-white/5 text-center w-32 shadow-sm font-bold text-primary">SLA Countdown</th>
                                                <th className="bg-gradient-to-r from-white to-slate-50/80 dark:from-[#0f1014]/75 dark:to-[#0f1014]/70 backdrop-blur-xl p-3 border-y border-white/5 text-left w-40 shadow-sm">{t('tickets.table.requester')}</th>
                                                <th className="bg-gradient-to-r from-slate-50/80 to-white dark:from-[#0f1014]/70 dark:to-[#0f1014]/65 backdrop-blur-xl p-3 border-y border-white/5 text-left w-48 shadow-sm">{t('tickets.table.assigned_to')}</th>
                                                {userRole !== 'user' && <th className="bg-gradient-to-r from-white to-slate-50/80 dark:from-[#0f1014]/65 dark:to-[#0f1014]/60 backdrop-blur-xl p-3 border-y border-white/5 text-left w-40 shadow-sm">{t('tickets.table.customer')}</th>}
                                                <th className="bg-gradient-to-r from-slate-50/80 to-white dark:from-[#0f1014]/60 dark:to-[#0f1014]/55 backdrop-blur-xl p-3 border-y border-white/5 text-center w-32 shadow-sm">{t('tickets.table.created_at')}</th>
                                                <th className="bg-gradient-to-r from-white to-slate-50 dark:from-[#0f1014]/55 dark:to-[#0f1014]/50 backdrop-blur-xl p-3 border-y border-white/5 text-right w-32 shadow-sm">{t('tickets.table.last_update')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedTickets.length > 0 ? (
                                                displayedTickets.map((ticket, ticketIdx) => {
                                                    const slaInfo = calculateDetailedTimeRemaining(ticket.created_at, ticket.status, ticket.sla_deadline);
                                                    const isCritical = slaInfo.urgency === 'critical';
                                                    const priorityAccent = {
                                                        'Critical': 'hover:border-l-rose-500',
                                                        'High': 'hover:border-l-orange-500',
                                                        'Medium': 'hover:border-l-amber-400',
                                                        'Normal': 'hover:border-l-blue-400',
                                                        'Low': 'hover:border-l-emerald-400',
                                                    }[ticket.priority] || 'hover:border-l-primary';

                                                    return (
                                                        <motion.tr
                                                            key={ticket.id}
                                                            initial={{ opacity: 0, x: -8 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: ticketIdx * 0.02, duration: 0.3 }}
                                                            onClick={() => setSelectedTicketId(ticket.id)}
                                                            className={`group transition-all duration-200 cursor-pointer border-l-[3px] border-l-transparent ${priorityAccent} ${selectedTickets.includes(ticket.id) ? 'bg-primary/5 border-l-primary' : 'bg-white dark:bg-slate-900 hover:bg-white/[0.08]'
                                                                } ${isCritical ? 'relative after:absolute after:inset-0 after:rounded-xl after:shadow-[0_0_20px_rgba(239,68,68,0.15)] after:pointer-events-none after:animate-pulse !bg-rose-500/[0.03] !border-l-rose-500' : ''}`}
                                                        >
                                                            <td className={`p-2.5 first:rounded-l-xl border-y border-l ${isCritical ? 'border-rose-500/20' : 'border-white/5'} group-hover:border-primary/20 ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}>
                                                                <div className="flex items-center justify-center">
                                                                    {userRole !== 'user' && (
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-3.5 h-3.5 rounded border-white/10 bg-black/20 text-primary focus:ring-primary/20 focus:ring-offset-0 transition-all checked:bg-primary checked:border-primary cursor-pointer"
                                                                            checked={selectedTickets.includes(ticket.id)}
                                                                            onChange={(e) => { e.stopPropagation(); handleSelectOne(ticket.id); }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className={`p-2.5 border-y border-white/5 group-hover:border-primary/20 ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}
                                                                onClick={(e) => { e.stopPropagation(); setSelectedTicketId(ticket.id); }}>
                                                                <span className="font-mono text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded tracking-wider whitespace-nowrap">
                                                                    {ticket.id.replace('#', '')}
                                                                </span>
                                                            </td>
                                                            <td className={`p-2.5 border-y border-white/5 group-hover:border-primary/20 ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}>
                                                                <div className="font-bold text-main text-[11px] truncate mb-1 group-hover:text-primary transition-colors leading-tight max-w-md" title={ticket.title}>{ticket.title}</div>
                                                                <div className="flex items-center gap-2">
                                                                    <PriorityBadge priority={ticket.priority} />
                                                                    {ticket.sentiment_data?.level === 'High Alert' && (
                                                                        <span className="text-[8px] font-black uppercase tracking-widest bg-red-500 text-white px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                                                                            High Alert
                                                                        </span>
                                                                    )}
                                                                    {ticket.linked_to_id && (
                                                                        <span className="text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/30">
                                                                            Duplicate
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[8px] text-muted font-black uppercase tracking-[0.15em] opacity-60 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                                        {ticket.category ? t(`tickets.categories.${ticket.category.toLowerCase().split(' ')[0]}`) : 'N/A'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className={`p-2.5 border-y border-white/5 group-hover:border-primary/20 text-center ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}>
                                                                <StatusBadge status={ticket.status} />
                                                            </td>
                                                            <td className={`p-2.5 border-y border-white/5 group-hover:border-primary/20 text-center ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}>
                                                                <SLACountdown createdAt={ticket.created_at} status={ticket.status} slaDeadline={ticket.sla_deadline} />
                                                            </td>
                                                            <td className={`p-2.5 border-y border-white/5 group-hover:border-primary/20 ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white shadow-sm flex-shrink-0">
                                                                        {ticket.requester.charAt(0)}
                                                                    </div>
                                                                    <span className="text-[9px] font-black text-main uppercase tracking-widest truncate">{ticket.requester.split(' ')[0]}</span>
                                                                </div>
                                                            </td>
                                                            <td className={`p-2.5 border-y border-white/5 group-hover:border-primary/20 ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}>
                                                                {ticket.technician_name !== 'Unassigned' ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></div>
                                                                        <div className="min-w-0">
                                                                            <div className="font-bold text-main truncate text-[10px]">{ticket.technician_name}</div>
                                                                            <div className="text-muted font-black text-[7px] uppercase tracking-widest opacity-50">Active</div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 opacity-50">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                                                                        <span className="text-[9px] font-black text-muted uppercase tracking-widest">Pending</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            {userRole !== 'user' && (
                                                                <td className={`p-2.5 border-y border-white/5 group-hover:border-primary/20 ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}>
                                                                    <span className="text-[9px] font-black text-muted/60 uppercase tracking-widest truncate block">{ticket.customer_name}</span>
                                                                </td>
                                                            )}
                                                            <td className={`p-2.5 border-y border-white/5 group-hover:border-primary/20 text-center ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}>
                                                                <div className="inline-block px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-black text-muted uppercase tracking-wide">
                                                                    {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString(undefined, {
                                                                        day: '2-digit', month: 'short'
                                                                    }) : '-'}
                                                                </div>
                                                            </td>
                                                            <td className={`p-2.5 last:rounded-r-xl border-y border-r border-white/5 group-hover:border-primary/20 text-right ${selectedTickets.includes(ticket.id) ? 'border-primary/30' : ''}`}>
                                                                <div className="text-[9px] font-black text-main uppercase tracking-widest opacity-80">
                                                                    {ticket.updated_at ? new Date(ticket.updated_at).toLocaleTimeString(undefined, {
                                                                        hour: '2-digit', minute: '2-digit'
                                                                    }) : '-'}
                                                                </div>
                                                                <div className="text-[7px] font-black text-muted uppercase tracking-widest opacity-40 mt-0.5">Today</div>
                                                            </td>
                                                        </motion.tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="100" className="opacity-50 h-64 relative">
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                            <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-violet-500/10 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                                                                <FiList size={28} className="text-primary/50" />
                                                            </div>
                                                            <h3 className="text-sm font-black text-main uppercase tracking-widest mb-1">No Tickets Found</h3>
                                                            <p className="text-[10px] text-muted font-bold">Try adjusting your filters or search query</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div> {/* Desktop Table View end */}
                                {/* Pagination Footer */}
                                <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-white/5 via-white/[0.07] to-white/5 backdrop-blur-md rounded-b-[2.5rem]">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-muted uppercase tracking-[0.1em]">Show</span>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-[11px] font-black text-main focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer outline-none transition-all hover:bg-white/20 hover:border-primary/30"
                                            >
                                                {[5, 10, 20].map(val => (
                                                    <option key={val} value={val} className="bg-white text-gray-900 dark:bg-slate-800 dark:text-white">{val} items</option>
                                                ))}
                                            </select>
                                        </div>
                                        <p className="text-[10px] font-black text-muted uppercase tracking-[0.1em]">
                                            <span className="text-main">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, finalFilteredTickets.length)}</span> / <span className="text-main">{finalFilteredTickets.length}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 bg-white/10 p-1 rounded-2xl border border-white/20">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95"
                                        >
                                            <FiChevronDown className="rotate-90" size={18} />
                                        </button>

                                        <div className="flex items-center px-2 gap-1">
                                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all active:scale-90 ${currentPage === pageNum
                                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                            : 'text-muted hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95"
                                        >
                                            <FiChevronDown className="-rotate-90" size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Right Side - Ticket Preview */}
                        <AnimatePresence>
                            {selectedTicketId && (() => {
                                const selectedTicket = tickets.find(t => t.id === selectedTicketId);
                                if (!selectedTicket) return null;

                                return (
                                    <motion.div
                                        key="ticket-preview"
                                        initial={{ x: 400, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 400, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="w-96 glass-card border-none bg-white dark:bg-slate-900 flex flex-col overflow-hidden relative shadow-2xl shadow-primary/5"
                                    >
                                        {/* Gradient accent bar at top */}
                                        <div className="h-1 w-full bg-gradient-to-r from-primary via-violet-500 to-primary-hover" />
                                        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

                                        {/* Preview Header */}
                                        <div className="p-6 border-b border-card-border/30 relative z-10">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <StatusBadge status={selectedTicket.status} />
                                                        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg tracking-wider shadow-sm">{selectedTicket.id}</span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight tracking-tight">{selectedTicket.title}</h3>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedTicketId(null)}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:rotate-90 duration-300"
                                                >
                                                    <FiX size={20} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <PriorityBadge priority={selectedTicket.priority} />
                                                <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-60">
                                                    {selectedTicket.category}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Preview Body - Scrollable */}
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
                                            {/* AI Summary */}
                                            {selectedTicket.ai_summary && (
                                                <div className="glass-card p-5 border-none bg-indigo-500/10 space-y-3 border-l-4 border-indigo-500">
                                                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <FiRefreshCw className="animate-spin-slow" /> AI Smart Summary
                                                    </h4>
                                                    <p className="text-sm text-main/90 leading-relaxed font-bold italic">
                                                        "{selectedTicket.ai_summary}"
                                                    </p>
                                                </div>
                                            )}

                                            {/* Description */}
                                            <div className="glass-card p-5 border-none bg-white/5 space-y-3">
                                                <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Brief Overview</h4>
                                                <p className="text-sm text-main/80 leading-relaxed font-bold">
                                                    {selectedTicket.description || 'No detailed briefing provided.'}
                                                </p>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="glass-card p-4 border-none bg-white/5">
                                                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Requester</p>
                                                    <p className="text-xs font-bold text-main truncate">{selectedTicket.requester}</p>
                                                </div>
                                                <div className="glass-card p-4 border-none bg-white/5">
                                                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Engineer</p>
                                                    <p className="text-xs font-bold text-main truncate">{selectedTicket.technician_name || 'Standby'}</p>
                                                </div>
                                                <div className="glass-card p-4 border-none bg-white/5">
                                                    <p className="text-[9px] font-black text-muted uppercase tracking-[0.15em] mb-1">Deployed</p>
                                                    <p className="text-xs font-black text-main">
                                                        {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleDateString('en-GB') : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="glass-card p-4 border-none bg-white/5">
                                                    <p className="text-[9px] font-black text-muted uppercase tracking-[0.15em] mb-1">Last Sync</p>
                                                    <p className="text-xs font-black text-main">
                                                        {selectedTicket.updated_at ? new Date(selectedTicket.updated_at).toLocaleDateString('en-GB') : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Attachments */}
                                            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                                                <div className="glass-card p-5 border-none bg-white/5">
                                                    <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                        <FiPaperclip size={14} />
                                                        Secure Assets ({selectedTicket.attachments.length})
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {selectedTicket.attachments.map((file, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-card-border/30 hover:border-primary/50 transition-all group">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                                        <FiPaperclip size={16} className="text-primary" />
                                                                    </div>
                                                                    <span className="text-[11px] font-black text-main truncate max-w-[150px]" title={file}>{file}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => window.open(getAttachmentUrl(file), '_blank')}
                                                                        className="p-2 hover:bg-white/10 rounded-lg text-muted hover:text-primary transition-all"
                                                                        title="Preview"
                                                                    >
                                                                        <FiEye size={16} />
                                                                    </button>
                                                                    <a
                                                                        href={getAttachmentUrl(file)}
                                                                        download
                                                                        className="p-2 hover:bg-white/10 rounded-lg text-muted hover:text-primary transition-all"
                                                                        title="Download"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        <FiDownload size={16} />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Preview Footer - Actions */}
                                        <div className="p-6 border-t border-card-border/30 bg-white/5 relative z-10 space-y-4">
                                            {/* Action Buttons Grid */}
                                            <div className="grid grid-cols-2 gap-3 mb-2">
                                                {(selectedTicket.status === 'closed' || selectedTicket.status === 'resolved') && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm("Are you sure you want to reopen this ticket?")) return;
                                                            try {
                                                                await api.put(`/api/tickets/${selectedTicket.db_id}`, { status: 'open' });
                                                                refreshTickets();
                                                                setSelectedTicketId(null);
                                                                alert("Ticket successfully reactivated.");
                                                            } catch (err) {
                                                                console.error("Failed to reopen ticket", err);
                                                                alert("Failed to reactivate ticket.");
                                                            }
                                                        }}
                                                        className="col-span-2 py-3.5 bg-orange-500/10 border border-orange-500/30 text-orange-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-orange-500/10"
                                                    >
                                                        <FiRotateCcw size={16} /> Reopen Ticket
                                                    </button>
                                                )}

                                                {(userRole === 'admin' || userRole === 'manager') && (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    if (!currentUserId) {
                                                                        alert("User session expired. Pls login again.");
                                                                        return;
                                                                    }
                                                                    await api.put('/api/tickets/bulk-assign', {
                                                                        ticket_ids: [selectedTicket.db_id],
                                                                        technician_id: parseInt(currentUserId)
                                                                    });
                                                                    refreshTickets();
                                                                    alert("You have taken ownership of this operation!");
                                                                } catch (err) {
                                                                    console.error("Failed to take ownership", err);
                                                                    alert("Failed to take ownership.");
                                                                }
                                                            }}
                                                            className="col-span-1 py-3.5 bg-white/5 border border-card-border/50 text-main rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2 active:scale-95"
                                                            title="Assign to yourself"
                                                        >
                                                            <FiUserCheck size={16} /> Take Me
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedTickets([selectedTicket.id]);
                                                                setIsAssignModalOpen(true);
                                                            }}
                                                            className="col-span-1 py-3.5 bg-white/5 border border-card-border/50 text-main rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2 active:scale-95"
                                                            title="Assign to a technician"
                                                        >
                                                            <FiUserPlus size={16} /> Assign
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            {(userRole === 'admin' || user?.permissions?.ticket_edit) && (
                                                <button
                                                    onClick={() => navigate(`/dashboard/tickets/${selectedTicket.db_id}`)}
                                                    className="w-full py-3.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95"
                                                >
                                                    <FiEdit size={16} /> Edit Ticket Details
                                                </button>
                                            )}

                                            <button
                                                onClick={() => navigate(`/dashboard/tickets/${selectedTicket.db_id}`)}
                                                className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-[0_15px_30px_-10px_rgba(var(--primary-rgb),0.5)] group"
                                            >
                                                <FiGrid size={18} className="group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Full Operations View</span>
                                            </button>

                                            {(userRole === 'admin' || userRole === 'manager') && (
                                                <button
                                                    onClick={() => handleSingleDelete(selectedTicket.id, selectedTicket.db_id)}
                                                    className="w-full py-3.5 bg-rose-500/5 border border-rose-500/20 text-rose-500/70 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all flex items-center justify-center gap-2 active:scale-95 mb-2"
                                                >
                                                    <FiTrash2 size={16} /> Delete Ticket Permanently
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setSelectedTicketId(null)}
                                                className="w-full py-4 bg-white/5 border border-card-border/50 text-slate-400 hover:text-main rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                                            >
                                                Terminate Preview
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })()}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Bulk Actions Floating Bar */}
                <AnimatePresence>
                    {
                        selectedTickets.length > 0 && (userRole === 'admin' || userRole === 'manager') && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
                            >
                                <div className="glass-card rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] border border-primary/20 p-2.5 flex items-center gap-2 min-w-[600px] bg-white dark:bg-slate-900 backdrop-blur-2xl relative overflow-hidden">
                                    {/* Top gradient border */}
                                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                                    {/* Bottom gradient border */}
                                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-primary via-violet-500 to-primary" />

                                    <div className="px-5 py-3 border-r border-card-border/30 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white shadow-lg shadow-primary/30">
                                            <FiCheckSquare size={18} />
                                        </div>
                                        <div>
                                            <span className="text-sm font-black text-main block leading-none mb-0.5">{selectedTickets.length} Selected</span>
                                            <span className="text-[8px] font-bold text-muted uppercase tracking-widest">Bulk Actions</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 px-3">
                                        <button
                                            onClick={() => setIsAssignModalOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-main bg-white/5 border border-card-border/30 rounded-xl hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                                        >
                                            <FiUserPlus size={14} />
                                            Assign
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-main bg-white/5 border border-card-border/30 rounded-xl hover:bg-primary hover:text-white hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
                                            <FiFlag size={14} />
                                            Priority
                                        </button>
                                        <button
                                            onClick={handleBulkResolve}
                                            className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95"
                                        >
                                            <FiCheckCircle size={14} />
                                            Resolve
                                        </button>
                                        <button
                                            onClick={handleBulkDelete}
                                            className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 transition-all active:scale-95"
                                        >
                                            <FiTrash2 size={14} />
                                            Delete
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setSelectedTickets([])}
                                        className="ml-auto p-2.5 text-muted hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                        title="Clear selection"
                                    >
                                        <FiX size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                <CreateTicketModal
                    isOpen={isCreateTicketOpen}
                    onClose={() => setIsCreateTicketOpen(false)}
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

                            // Refresh list
                            refreshTickets();
                        } catch (error) {
                            console.error("Failed to create ticket", error);
                            alert("Failed to create ticket. Please try again.");
                        }
                    }}
                />



                <AssignModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssign={async (techId) => {
                        try {
                            const ticketIds = selectedTickets.map(id => {
                                // Extract the numeric ID from the string (e.g., "#TKT-12" -> 12)
                                const ticket = tickets.find(t => t.id === id);
                                return ticket?.db_id;
                            }).filter(Boolean);

                            await api.put('/api/tickets/bulk-assign', {
                                ticket_ids: ticketIds,
                                technician_id: parseInt(techId)
                            });

                            refreshTickets();
                            setSelectedTickets([]);
                            setIsAssignModalOpen(false);
                            alert("Tickets successfully assigned!");
                        } catch (error) {
                            console.error("Failed to assign tickets", error);
                            alert("Failed to assign tickets. Please try again.");
                        }
                    }}
                />



                <MessageModal
                    isOpen={!!messageConfig}
                    onClose={() => setMessageConfig(null)}
                    {...messageConfig}
                />



            </div>
        </>
    );
};

export default TicketList;
