import React, { useState, useEffect } from 'react';
import {
    FiCheck, FiX, FiFilter, FiDownload, FiUpload,
    FiFileText, FiCalendar, FiClock, FiMapPin,
    FiTrendingUp, FiAlertCircle, FiArrowRight, FiUser,
    FiChevronLeft, FiChevronRight, FiEdit, FiClipboard,
    FiMessageSquare, FiSettings, FiPlus, FiTrash2,
    FiShield, FiActivity, FiCheckCircle, FiPieChart,
    FiZap, FiPower, FiTarget, FiUsers
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../context/TranslationContext';
import { useAuth } from '../context/AuthContext';
import api, { baseURL } from '../api/axios';
import { jsPDF } from "jspdf";
import AIAssistantButton from '../components/AIAssistantButton';

const LeaveRequestModal = ({ isOpen, onClose, onSubmitted }) => {
    const [formData, setFormData] = useState({
        leave_type: 'Sick Leave',
        start_date: '',
        end_date: '',
        reason: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Log for debugging
            console.log("Submitting Leave:", formData);

            // Format dates properly
            const startStr = formData.start_date.includes('T') ? formData.start_date : `${formData.start_date}T00:00:00`;
            const endStr = formData.end_date.includes('T') ? formData.end_date : `${formData.end_date}T23:59:59`;

            const payload = {
                ...formData,
                start_date: startStr,
                end_date: endStr
            };

            await api.post('/api/attendance/leave-request', payload);
            alert("Leave request submitted successfully");
            onSubmitted();
            onClose();
        } catch (err) {
            console.error("Leave error details:", err.response?.data);
            const detail = err.response?.data?.detail;
            const errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
            alert(errorMsg || "Failed to submit leave request. Please check if dates are valid.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-card border-none bg-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden"
            >
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500/50 via-emerald-500 to-emerald-500/50"></div>
                <div className="p-8 border-b border-card-border/30 flex items-center justify-between bg-emerald-500/5 relative z-10">
                    <div>
                        <h3 className="text-xl font-black text-main tracking-tight">Leave request</h3>
                        <p className="text-[10px] font-bold text-muted leading-none mt-1">Leave submission protocol</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-muted hover:text-main">
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 relative z-10">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted ml-1">Start date</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none hover:border-emerald-500/30"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted ml-1">End date</label>
                            <input
                                type="date"
                                required
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none hover:border-emerald-500/30"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted ml-1">Leave type</label>
                        <select
                            value={formData.leave_type}
                            onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                            className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none appearance-none cursor-pointer hover:border-emerald-500/30"
                        >
                            <option className="bg-slate-900">Sick Leave</option>
                            <option className="bg-slate-900">Casual Leave</option>
                            <option className="bg-slate-900">Earned Leave</option>
                            <option className="bg-slate-900">Work From Home</option>
                            <option className="bg-slate-900">Other</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-bold text-muted">Reason</label>
                            <AIAssistantButton
                                text={formData.reason}
                                onPolished={(val) => setFormData(prev => ({ ...prev, reason: val }))}
                                contextType="leave_request"
                            />
                        </div>
                        <textarea
                            required
                            rows="4"
                            placeholder="State your rationale for deployment recess..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none resize-none hover:border-emerald-500/30"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4.5 rounded-2xl font-black text-[10px] shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? <FiActivity className="animate-spin" /> : <FiUpload />}
                        Submit request
                    </button>
                </form>
            </motion.div>
        </div >
    );
};

const LeaveActionModal = ({ isOpen, onClose, onSubmitted, leaveId, actionType }) => {
    const [adminReason, setAdminReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post(`/api/attendance/leaves/${leaveId}/action`, {
                status: actionType,
                admin_reason: adminReason
            });
            onSubmitted();
            onClose();
        } catch (err) {
            alert(err.response?.data?.detail || "Action failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card border-none bg-white/10 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${actionType === 'Approved' ? 'from-emerald-500/50 via-emerald-500 to-emerald-500/50' : 'from-rose-500/50 via-rose-500 to-rose-500/50'}`}></div>
                <h3 className="text-xl font-black text-main tracking-tight mb-2">
                    {actionType === 'Approved' ? 'Approve leave' : 'Reject leave'}
                </h3>
                <p className="text-[10px] font-bold text-muted mb-8">Approval process</p>
                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-muted">Admin notes</span>
                        <AIAssistantButton
                            text={adminReason}
                            onPolished={setAdminReason}
                            contextType="leave_request"
                        />
                    </div>
                    <textarea
                        required={actionType === 'Rejected'}
                        value={adminReason}
                        onChange={(e) => setAdminReason(e.target.value)}
                        placeholder={actionType === 'Rejected' ? "State the reason for rejection..." : "Optional verification notes..."}
                        className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-4 text-sm font-bold text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none hover:border-primary/30"
                        rows="5"
                    ></textarea>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-4 bg-white/5 border border-card-border/50 text-muted hover:text-main rounded-2xl font-black text-[10px] transition-all active:scale-95">Cancel</button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 px-4 py-4 ${actionType === 'Approved' ? 'bg-emerald-600 shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)]' : 'bg-rose-600 shadow-[0_15px_30px_-10px_rgba(244,63,94,0.5)]'} text-white rounded-2xl font-black text-[10px] transition-all active:scale-95 disabled:opacity-50`}
                        >
                            {isSubmitting ? <FiActivity className="animate-spin mx-auto" /> : `${actionType === 'Approved' ? 'Approve' : 'Reject'}`}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const AdminEditLeaveModal = ({ isOpen, onClose, onSubmitted, leave }) => {
    const [formData, setFormData] = useState({
        leave_type: '',
        start_date: '',
        end_date: '',
        reason: '',
        admin_notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (leave) {
            setFormData({
                leave_type: leave.leave_type,
                start_date: new Date(leave.start_date).toISOString().split('T')[0],
                end_date: new Date(leave.end_date).toISOString().split('T')[0],
                reason: leave.reason,
                admin_notes: leave.admin_notes || ''
            });
        }
    }, [leave]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.put(`/api/attendance/leaves/${leave.id}`, formData);
            onSubmitted();
            onClose();
        } catch (err) {
            alert("Edit failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card border-none bg-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
                <h3 className="text-xl font-black text-main tracking-tight mb-2">Edit leave request</h3>
                <p className="text-[10px] font-bold text-muted mb-10">Administrative access</p>
                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted ml-1">Start date</label>
                            <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted ml-1">End date</label>
                            <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted ml-1">Leave type</label>
                        <select value={formData.leave_type} onChange={e => setFormData({ ...formData, leave_type: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                            <option className="bg-slate-900">Sick Leave</option><option className="bg-slate-900">Casual Leave</option><option className="bg-slate-900">Earned Leave</option><option className="bg-slate-900">Work From Home</option><option className="bg-slate-900">Other</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-bold text-muted">User reason</label>
                            <AIAssistantButton
                                text={formData.reason}
                                onPolished={(val) => setFormData(prev => ({ ...prev, reason: val }))}
                                contextType="leave_request"
                            />
                        </div>
                        <textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main outline-none resize-none" rows="2" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-bold text-primary">Admin notes</label>
                            <AIAssistantButton
                                text={formData.admin_notes}
                                onPolished={(val) => setFormData(prev => ({ ...prev, admin_notes: val }))}
                                contextType="leave_request"
                                additionalContext="Administrative override of a leave request."
                            />
                        </div>
                        <textarea required placeholder="Provide a reason for this administrative edit..." value={formData.admin_notes} onChange={e => setFormData({ ...formData, admin_notes: e.target.value })} className="w-full bg-primary/5 border border-primary/30 rounded-2xl px-5 py-3.5 text-sm font-bold text-main outline-none focus:ring-2 focus:ring-primary/20 transition-all" rows="4" />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-4 bg-white/5 border border-card-border/50 text-muted hover:text-main rounded-2xl font-black text-[10px] transition-all active:scale-95">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-4 bg-primary text-white rounded-2xl font-black text-[10px] transition-all active:scale-95 shadow-[0_15px_30px_-10px_rgba(var(--primary-rgb),0.5)]">Save changes</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const RegularizationModal = ({ isOpen, onClose, onSubmitted }) => {
    const [formData, setFormData] = useState({
        date: '',
        correct_in_time: '09:00',
        correct_out_time: '18:00',
        reason: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                correct_in_time: `${formData.date}T${formData.correct_in_time}:00`,
                correct_out_time: `${formData.date}T${formData.correct_out_time}:00`,
                date: `${formData.date}T00:00:00`
            };
            await api.post('/api/attendance/regularization', payload);
            onSubmitted();
            onClose();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to submit regularization request");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="glass-card border-none bg-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500/50 via-amber-500 to-amber-500/50"></div>
                <div className="p-10 border-b border-card-border/30 flex items-center justify-between bg-amber-500/5 relative z-10">
                    <div>
                        <h3 className="text-xl font-black text-main tracking-tight">Regularization</h3>
                        <p className="text-[10px] font-bold text-muted leading-none mt-1">Attendance correction request</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-muted hover:text-main"><FiX size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-10 space-y-8 relative z-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted ml-1">Date</label>
                        <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-amber-500/20 transition-all outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted ml-1">Check-in time</label>
                            <input type="time" required value={formData.correct_in_time} onChange={(e) => setFormData({ ...formData, correct_in_time: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-amber-500/20 transition-all outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted ml-1">Check-out time</label>
                            <input type="time" required value={formData.correct_out_time} onChange={(e) => setFormData({ ...formData, correct_out_time: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-amber-500/20 transition-all outline-none" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-bold text-muted">Reason</label>
                            <AIAssistantButton
                                text={formData.reason}
                                onPolished={(val) => setFormData(prev => ({ ...prev, reason: val }))}
                            />
                        </div>
                        <textarea required rows="4" placeholder="Brief the reason for regularization request..." value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-amber-500/20 transition-all outline-none resize-none"></textarea>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4.5 rounded-2xl font-black text-[10px] shadow-[0_15px_30px_-10px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95">
                        {isSubmitting ? <FiActivity className="animate-spin" /> : <FiUpload />}
                        Submit request
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const AttendanceCalendarComp = ({ month, year, calendarData, onPrev, onNext }) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const [selectedDay, setSelectedDay] = useState(null);

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
        <div className="glass-card border-none bg-white/5 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:text-primary transition-colors">
                <FiCalendar size={120} />
            </div>
            <div className="flex items-center justify-between mb-10 relative z-10">
                <h3 className="text-xl font-black text-main tracking-tighter flex items-center gap-3">
                    <FiCalendar className="text-primary" />
                    Attendance calendar
                </h3>
                <div className="flex items-center bg-white/5 border border-card-border/30 rounded-2xl p-1 gap-4">
                    <button onClick={onPrev} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-muted hover:text-primary"><FiChevronLeft /></button>
                    <span className="text-[10px] font-black text-main w-32 text-center">{monthName} {year}</span>
                    <button onClick={onNext} className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-muted hover:text-primary"><FiChevronRight /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-3 mb-8 relative z-10">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="text-center text-[10px] font-black text-muted py-2">{d}</div>))}
                {days.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />;
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayData = calendarData[dateStr];
                    let bgColor = "bg-white/5 hover:bg-white/10";
                    let textColor = "text-muted hover:text-main";

                    if (dayData) {
                        if (dayData.status === 'Present' || dayData.status === 'Late') {
                            bgColor = "bg-primary/20 text-primary border border-primary/30";
                        } else if (dayData.status === 'Leave') {
                            bgColor = "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30";
                        } else if (dayData.status === 'Absent') {
                            bgColor = "bg-rose-500/20 text-rose-500 border border-rose-500/30";
                        }
                    }

                    const isSelected = selectedDay === dateStr;

                    return (
                        <motion.div
                            key={day}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                            className={`h-14 flex flex-col items-center justify-center rounded-2xl text-sm font-black transition-all cursor-pointer relative ${bgColor} ${textColor} ${isSelected ? 'ring-2 ring-primary ring-offset-4 ring-offset-slate-900 z-10' : ''}`}
                        >
                            {day}
                            {dayData?.hours > 0 && !isSelected && (
                                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]"></div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            <AnimatePresence>
                {selectedDay && calendarData[selectedDay] && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 overflow-hidden"
                    >
                        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-card-border/50 shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/50"></div>
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-[10px] font-bold text-muted">Log summary for {selectedDay}</p>
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black border ${calendarData[selectedDay].status === 'Present' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>{calendarData[selectedDay].status}</span>
                            </div>
                            <div className="flex items-center gap-12">
                                <div>
                                    <p className="text-[10px] font-bold text-muted mb-2">Check-in/out</p>
                                    <p className="text-xl font-black text-main italic">
                                        {calendarData[selectedDay].check_in || '--:--'} <FiArrowRight className="inline text-primary mx-2" /> {calendarData[selectedDay].check_out || '--:--'}
                                    </p>
                                </div>
                                <div className="text-right ml-auto">
                                    <p className="text-[10px] font-bold text-muted mb-2">Total hours</p>
                                    <p className="text-3xl font-black text-primary">
                                        {calendarData[selectedDay].hours || '0.0'} <span className="text-xs font-bold text-muted">Hrs</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-10 flex items-center justify-center gap-8 border-t border-card-border/30 pt-8">
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"></div><span className="text-[10px] font-bold text-muted">Active</span></div>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div><span className="text-[10px] font-bold text-muted">Breached</span></div>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div><span className="text-[10px] font-bold text-muted">Leave</span></div>
            </div>
        </div>
    );
};

const HolidayConfigModal = ({ isOpen, onClose }) => {
    const [holidays, setHolidays] = useState([]);
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Public Holiday' });

    const fetchHolidays = async () => {
        try { const res = await api.get('/api/attendance/holidays'); setHolidays(res.data); } catch (err) { }
    };

    useEffect(() => { if (isOpen) fetchHolidays(); }, [isOpen]);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/attendance/holidays', newHoliday);
            setNewHoliday({ name: '', date: '', type: 'Public Holiday' });
            fetchHolidays();
        } catch (err) { alert(err.response?.data?.detail || "Failed to add holiday"); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        try { await api.delete(`/api/attendance/holidays/${id}`); fetchHolidays(); } catch (err) { }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card border-none bg-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col relative">
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-500/50 via-rose-500 to-rose-500/50"></div>
                    <div className="p-8 border-b border-card-border/30 flex justify-between items-center bg-rose-500/5">
                        <div>
                            <h3 className="text-2xl font-black text-main tracking-tighter italic">Holiday <span className="text-rose-500">config</span></h3>
                            <p className="text-[10px] font-bold text-muted leading-none mt-1">Operational holiday calendar</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/5 border border-card-border/50 flex items-center justify-center text-muted hover:text-rose-500 transition-all"><FiX size={20} /></button>
                    </div>
                    <div className="overflow-y-auto p-10 space-y-10">
                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end bg-white/5 p-8 rounded-3xl border border-dashed border-card-border/50">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-bold text-muted pl-1">Holiday name</label>
                                <input required type="text" placeholder="e.g. System Override" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-rose-500/20 transition-all outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted pl-1">Date</label>
                                <input required type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} className="w-full bg-white/5 border border-card-border/50 rounded-2xl px-5 py-3.5 text-sm font-bold text-main focus:ring-2 focus:ring-rose-500/20 transition-all outline-none" />
                            </div>
                            <button type="submit" className="bg-rose-600 text-white h-[52px] rounded-2xl font-black text-[10px] hover:bg-rose-700 transition-all shadow-[0_15px_30px_-10px_rgba(244,63,94,0.5)] flex items-center justify-center gap-2 active:scale-95"><FiPlus size={18} /> Add holiday</button>
                        </form>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-bold text-muted flex items-center gap-3">
                                <FiActivity className="text-rose-500" />
                                Scheduled holidays
                            </h4>
                            <div className="space-y-4">
                                {holidays.length === 0 ? (
                                    <div className="text-center py-10 bg-white/5 rounded-3xl border border-card-border/30">
                                        <p className="text-[10px] font-bold text-muted">No holidays found</p>
                                    </div>
                                ) : holidays.map(h => (
                                    <div key={h.id} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-card-border/30 hover:border-primary/50 transition-all group overflow-hidden relative">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex flex-col items-center justify-center text-rose-500 border border-rose-500/20 shadow-inner">
                                                <span className="text-[10px] font-bold leading-none mb-1">{new Date(h.date).toLocaleString('default', { month: 'short' })}</span>
                                                <span className="text-xl font-black leading-none">{new Date(h.date).getDate()}</span>
                                            </div>
                                            <div>
                                                <h5 className="font-black text-main text-sm">{h.name}</h5>
                                                <span className="text-[10px] font-bold text-primary">{h.type}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(h.id)} className="w-10 h-10 rounded-xl bg-white/5 text-muted hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center active:scale-90"><FiTrash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const AttendanceView = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const userRole = user?.role || 'user';
    const [activeTab, setActiveTab] = useState('my_dashboard');

    // States
    const [status, setStatus] = useState({ isCheckedIn: false, isCheckedOut: false, checkInTime: null, checkOutTime: null, status: 'Not Checked In', stats: { todayHours: 0, monthlyPresence: '0%', lateMarks: '00', leavesTaken: '00' } });
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);

    // Admin Leave Action States
    const [leaveActionModal, setLeaveActionModal] = useState({ isOpen: false, leaveId: null, type: null });
    const [editLeaveModal, setEditLeaveModal] = useState({ isOpen: false, leave: null });

    const [calDate, setCalDate] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const [calendarData, setCalendarData] = useState({});
    const [summary, setSummary] = useState({ totalWorkingDays: 0, presentDays: 0, absentDays: 0, leaveDays: 0, avgHours: '0 hours' });
    const [attendanceData, setAttendanceData] = useState([]);
    const [leavesData, setLeavesData] = useState([]);
    const [allLeaves, setAllLeaves] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDateFilter, setSelectedDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [monthlyReportData, setMonthlyReportData] = useState([]);
    const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
    const [reviewStatusFilter, setReviewStatusFilter] = useState('Pending');

    useEffect(() => {
        if (activeTab === 'my_dashboard' || activeTab === 'dashboard') {
            fetchMyStatus(); fetchMyHistory(); fetchCalendarData(); fetchSummary();
        }
        if (activeTab === 'leaves') fetchMyLeaves();
        if (activeTab === 'list' && (userRole === 'admin' || userRole === 'manager')) fetchAllAttendance();
        if (activeTab === 'manage_leaves' && (userRole === 'admin' || userRole === 'manager')) fetchAllLeaves();
        if (activeTab === 'report' && (userRole === 'admin' || userRole === 'manager')) { fetchMonthlyReportData(); fetchMatrixData(); }
    }, [activeTab, calDate, selectedMonth, selectedYear, selectedDateFilter, isHolidayModalOpen]);

    const [matrixData, setMatrixData] = useState([]);

    const fetchMyStatus = async () => { try { const res = await api.get('/api/attendance/status'); setStatus(res.data); } catch (err) { console.error("Status fetch failed", err); } };
    const fetchMyHistory = async () => { try { const res = await api.get('/api/attendance/history'); setHistory(res.data); } catch (err) { } };
    const fetchCalendarData = async () => { try { const res = await api.get(`/api/attendance/calendar-data?month=${calDate.month}&year=${calDate.year}`); setCalendarData(res.data); } catch (err) { } };
    const fetchSummary = async () => { try { const res = await api.get(`/api/attendance/monthly-summary?month=${calDate.month}&year=${calDate.year}`); setSummary(res.data); } catch (err) { } };
    const fetchAllAttendance = async () => { try { const res = await api.get(`/api/attendance/all?date_str=${selectedDateFilter}`); setAttendanceData(res.data); } catch (err) { } };
    const fetchMyLeaves = async () => { try { const res = await api.get('/api/attendance/leave-history'); setLeavesData(res.data); } catch (err) { } };
    const fetchAllLeaves = async () => { try { const res = await api.get(`/api/attendance/leaves/all?month=${selectedMonth}&year=${selectedYear}`); setAllLeaves(res.data); } catch (err) { } };
    const fetchMonthlyReportData = async () => { try { const res = await api.get(`/api/attendance/reports/monthly?month=${selectedMonth}&year=${selectedYear}`); setMonthlyReportData(res.data); } catch (err) { } };
    const fetchMatrixData = async () => { try { const res = await api.get(`/api/attendance/reports/matrix?month=${selectedMonth}&year=${selectedYear}`); setMatrixData(res.data); } catch (err) { } };

    const exportToCSV = () => {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const headers = ["Staff Member", "Department", ...Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const w = new Date(selectedYear, selectedMonth - 1, day).toLocaleString('default', { weekday: 'short' });
            return `${day} (${w})`;
        }), "Present", "Absent", "Late", "On Leave"];

        const csvRows = matrixData.map(row => {
            const daily = Array.from({ length: daysInMonth }, (_, i) => {
                const s = row.daily_status.find(st => st.day === i + 1)?.status || 'Absent';
                if (s === 'Present') return 'P';
                if (s === 'Late') return 'L';
                if (s === 'Holiday') return 'H';
                if (s === 'Weekend') return 'W';
                if (s === 'Leave' || s === 'On Leave') return 'OL';
                return 'A';
            });
            const p = row.daily_status.filter(s => s.status === 'Present').length;
            const a = row.daily_status.filter(s => s.status === 'Absent').length;
            const l = row.daily_status.filter(s => s.status === 'Late').length;
            const ol = row.daily_status.filter(s => s.status === 'Leave' || s.status === 'On Leave').length;
            return [row.full_name, row.department, ...daily, p, a, l, ol].map(v => `"${v}"`).join(",");
        });

        const csvString = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `Attendance_Report_${selectedMonth}_${selectedYear}.csv`);
        a.click();
    };

    const exportToPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(`Monthly Attendance Report - ${selectedMonth}/${selectedYear}`, 14, 15);

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("P: Present | A: Absent | L: Late | H: Holiday | W: Weekend | OL: On Leave", 14, 22);

        let y = 30;
        doc.setFontSize(7);
        doc.setTextColor(0);

        // Simple table logic
        matrixData.forEach((row, i) => {
            if (y > 190) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold");
            doc.text(`${i + 1}. ${row.full_name} (${row.department})`, 14, y);
            y += 5;

            doc.setFont("helvetica", "normal");
            const statusString = row.daily_status.map((s, idx) => {
                const char = s.status === 'Present' ? 'P' : s.status === 'Late' ? 'L' : s.status === 'Holiday' ? 'H' : s.status === 'Weekend' ? 'W' : s.status === 'Leave' || s.status === 'On Leave' ? 'OL' : 'A';
                return `${idx + 1}:${char}`;
            }).join('  ');

            doc.text(statusString, 14, y, { maxWidth: 270 });
            const wrapLines = doc.splitTextToSize(statusString, 270).length;
            y += (wrapLines * 4) + 4;
        });

        doc.save(`Attendance_Report_${selectedMonth}_${selectedYear}.pdf`);
    };

    const handleCheckIn = async () => { setIsLoading(true); try { await api.post('/api/attendance/check-in'); await fetchMyStatus(); fetchMyHistory(); } catch (err) { alert(err.response?.data?.detail || "Check-in failed"); } finally { setIsLoading(false); } };
    const handleCheckOut = async () => { setIsLoading(true); try { await api.post('/api/attendance/check-out'); await fetchMyStatus(); fetchMyHistory(); } catch (err) { alert(err.response?.data?.detail || "Check-out failed"); } finally { setIsLoading(false); } };

    const StatCard = ({ label, value, icon: Icon, color }) => (
        <div className="glass-card border-none bg-white/5 p-8 rounded-[2rem] shadow-sm flex items-center justify-between group hover:shadow-xl transition-all relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-8 opacity-5 text-${color}-500 pointer-events-none group-hover:scale-110 transition-transform`}>
                <Icon size={120} />
            </div>
            <div className="relative z-10">
                <p className="text-[10px] font-bold text-muted mb-3 group-hover:text-main transition-colors">{label}</p>
                <h4 className="text-3xl font-black text-main tracking-tighter italic">{value}</h4>
            </div>
            <div className={`relative z-10 w-16 h-16 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 text-${color}-500 flex items-center justify-center group-hover:bg-${color}-500 group-hover:text-white transition-all shadow-lg`}>
                <Icon size={28} />
            </div>
        </div>
    );

    const MyAttendanceDashboard = () => {
        const checkInTimeDisp = status.checkInTime ? new Date(status.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const checkOutTimeDisp = status.checkOutTime ? new Date(status.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        return (
            <div className="space-y-10 p-2">
                <div className="flex flex-col xl:flex-row gap-8">
                    <div className="flex-1 space-y-10">
                        {/* Conditionally render Punch The Clock section - Hide for admin */}
                        {userRole !== 'admin' && (
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-[1.5] glass-card border-none bg-white/5 rounded-[2.5rem] p-10 text-main relative overflow-hidden shadow-2xl group">
                                    <div className="absolute top-0 right-0 p-12 opacity-5 text-emerald-500 pointer-events-none group-hover:scale-110 transition-transform">
                                        <FiClock size={200} />
                                    </div>
                                    <div className="relative z-10">
                                        <h2 className="text-4xl font-black mb-3 italic tracking-tighter">Status: <span className="text-emerald-500">{status.status}</span></h2>
                                        <p className="text-muted font-bold mb-10 text-sm max-w-md opacity-60">Synchronize your attendance for high-fidelity operations.</p>
                                        <div className="flex flex-wrap gap-5">
                                            {!status.isCheckedIn ? (
                                                <button onClick={handleCheckIn} disabled={isLoading} className="bg-emerald-600 text-white px-10 py-4.5 rounded-2xl font-black text-[10px] hover:bg-emerald-700 transition-all flex items-center gap-3 shadow-[0_15px_30px_-10px_rgba(16,185,129,0.5)] active:scale-95 disabled:opacity-50">
                                                    <FiTarget size={20} /> Check in
                                                </button>
                                            ) : !status.isCheckedOut ? (
                                                <button onClick={handleCheckOut} disabled={isLoading} className="bg-rose-600 text-white px-10 py-4.5 rounded-2xl font-black text-[10px] hover:bg-rose-700 transition-all flex items-center gap-3 shadow-[0_15px_30px_-10px_rgba(225,29,72,0.5)] active:scale-95 disabled:opacity-50">
                                                    <FiPower size={20} /> Check out
                                                </button>
                                            ) : (
                                                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-10 py-4.5 rounded-2xl font-black text-[10px] flex items-center gap-3 shadow-inner">
                                                    <FiShield size={20} /> Shift completed
                                                </div>
                                            )}
                                            <button onClick={() => setIsRegModalOpen(true)} className="bg-white/5 border border-card-border/50 text-main px-8 py-4.5 rounded-2xl font-black text-[10px] hover:bg-white/10 transition-all flex items-center gap-3 active:scale-95">
                                                <FiZap size={18} className="text-amber-500" /> Regularize
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 glass-card border-none bg-white/5 rounded-[2.5rem] p-10 shadow-xl flex flex-col justify-center relative group overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                                    <div className="space-y-8 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-muted mb-2">Check in</p>
                                                <p className="text-2xl font-black text-main italic tracking-tighter">{checkInTimeDisp}</p>
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform">
                                                <FiArrowRight size={24} />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-muted mb-2">Check out</p>
                                                <p className="text-2xl font-black text-main italic tracking-tighter">{checkOutTimeDisp}</p>
                                            </div>
                                        </div>
                                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-card-border/30 p-0.5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: status.isCheckedIn && !status.isCheckedOut ? Math.min((status.stats?.todayHours / 9) * 100, 100) + '%' : status.isCheckedOut ? '100%' : '0%' }}
                                                className="h-full bg-gradient-to-r from-primary via-primary-hover to-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                            ></motion.div>
                                        </div>
                                        <p className="text-center text-[10px] font-bold text-muted">
                                            Shift efficiency: <span className="text-primary italic">
                                                {status.isCheckedIn ? (
                                                    status.stats?.todayHours >= 1
                                                        ? `${status.stats.todayHours} hours output`
                                                        : `${Math.round((status.stats?.todayHours || 0) * 60)} mins duration`
                                                ) : 'Idle'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <AttendanceCalendarComp month={calDate.month} year={calDate.year} calendarData={calendarData} onPrev={() => setCalDate(d => d.month === 1 ? { month: 12, year: d.year - 1 } : { ...d, month: d.month - 1 })} onNext={() => setCalDate(d => d.month === 12 ? { month: 1, year: d.year + 1 } : { ...d, month: d.month + 1 })} />
                    </div>
                    <div className="w-full xl:w-[400px] space-y-8">
                        <div className="glass-card border-none bg-white/5 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 text-primary pointer-events-none group-hover:rotate-12 transition-transform">
                                <FiActivity size={100} />
                            </div>
                            <h3 className="text-xl font-black text-main mb-10 italic tracking-tighter flex items-center gap-3">
                                <FiPieChart className="text-primary" />
                                Statistics
                            </h3>
                            <div className="space-y-8 relative z-10">
                                {[
                                    { label: 'Working days', value: summary.totalWorkingDays, icon: FiClipboard, color: 'primary' },
                                    { label: 'Present', value: summary.presentDays, icon: FiCheck, color: 'emerald' },
                                    { label: 'Absent', value: summary.absentDays, icon: FiX, color: 'rose' },
                                    { label: 'Leave', value: summary.leaveDays, icon: FiCalendar, color: 'indigo' },
                                    { label: 'Efficiency', value: summary.avgHours, icon: FiClock, color: 'amber' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between group/stat">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/10 text-${item.color}-500 flex items-center justify-center group-hover/stat:bg-${item.color}-500 group-hover/stat:text-white transition-all`}>
                                                <item.icon size={20} />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted group-hover/stat:text-main transition-colors">{item.label}</span>
                                        </div>
                                        <span className="text-sm font-black text-main tracking-tighter italic">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const AdminListView = () => (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total staff" value={attendanceData.length} icon={FiUsers} color="primary" />
                <StatCard label="Present" value={attendanceData.filter(l => l.status === 'Present').length} icon={FiCheckCircle} color="emerald" />
                <StatCard label="Absent" value={attendanceData.filter(l => l.status === 'Absent').length} icon={FiAlertCircle} color="rose" />
                <StatCard label="Late" value={attendanceData.filter(l => l.status === 'Late').length} icon={FiClock} color="amber" />
            </div>

            <div className="glass-card border-none bg-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
                <div className="p-8 border-b border-card-border/30 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <FiActivity size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-main tracking-tighter italic">Live attendance stream</h3>
                            <p className="text-[10px] font-bold text-muted">Real-time attendance monitoring</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-[10px] font-bold text-muted">Date filter</label>
                        <input type="date" value={selectedDateFilter} onChange={(e) => setSelectedDateFilter(e.target.value)} className="bg-white/5 border border-card-border/50 rounded-xl text-[10px] font-black text-main px-5 py-2.5 focus:ring-2 focus:ring-primary/20 transition-all outline-none hover:border-primary/50" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-card-border/30 text-left">
                                <th className="px-8 py-6 text-[10px] font-black text-muted">ID</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted">Name</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted">Department</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted">Check-in</th>
                                <th className="px-8 py-6 text-[10px] font-black text-muted">Check-out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-card-border/20">
                            {attendanceData.length === 0 ? (
                                <tr><td colSpan="6" className="px-8 py-20 text-center text-[10px] font-black text-muted">No attendance data found for this date.</td></tr>
                            ) : attendanceData.map((log, idx) => (
                                <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-6 text-sm font-black text-muted/50 font-mono tracking-tighter">{(idx + 1).toString().padStart(2, '0')}</td>
                                    <td className="px-8 py-6 text-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-inner">
                                                {log.full_name?.charAt(0)}
                                            </div>
                                            <span className="font-black text-main italic group-hover:text-primary transition-colors">{log.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-[10px] font-bold text-muted">{log.dept || 'N/A'}</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1 rounded-full text-[10px] font-black border ${log.status === 'Present' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                                            log.status === 'Late' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                                                'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                            }`}>{log.status}</span>
                                    </td>
                                    <td className="px-8 py-6 font-mono text-sm text-main">{log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}</td>
                                    <td className="px-8 py-6 font-mono text-sm text-main">{log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-[1700px] mx-auto space-y-8" >
            <LeaveRequestModal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} onSubmitted={fetchMyLeaves} />
            <RegularizationModal isOpen={isRegModalOpen} onClose={() => setIsRegModalOpen(false)} onSubmitted={fetchMyHistory} />
            <LeaveActionModal isOpen={leaveActionModal.isOpen} leaveId={leaveActionModal.leaveId} actionType={leaveActionModal.type} onClose={() => setLeaveActionModal({ isOpen: false })} onSubmitted={fetchAllLeaves} />
            <AdminEditLeaveModal isOpen={editLeaveModal.isOpen} leave={editLeaveModal.leave} onClose={() => setEditLeaveModal({ isOpen: false })} onSubmitted={fetchAllLeaves} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
                <div>
                    <h2 className="text-4xl font-black text-main tracking-tighter italic">Attendance <span className="text-primary font-black">matrix</span></h2>
                    <p className="text-[10px] font-bold text-muted mt-1">Real-time attendance & tracking</p>
                </div>
                <div className="flex bg-white/5 p-1.5 rounded-[2rem] border border-card-border/30 shadow-xl backdrop-blur-md">
                    {/* Show different tabs based on role */}
                    {userRole !== 'admin' ? (
                        <>
                            <button onClick={() => setActiveTab('my_dashboard')} className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-bold transition-all flex items-center gap-2 ${activeTab === 'my_dashboard' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105 z-10' : 'text-muted hover:text-main hover:bg-white/5'}`}><FiActivity /> Dashboard</button>
                            <button onClick={() => setActiveTab('leaves')} className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-bold transition-all flex items-center gap-2 ${activeTab === 'leaves' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105 z-10' : 'text-muted hover:text-main hover:bg-white/5'}`}><FiCalendar /> Leave history</button>
                        </>
                    ) : null}
                    {(userRole === 'admin' || userRole === 'manager') && (
                        <>
                            <button onClick={() => setActiveTab('list')} className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-bold transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105 z-10' : 'text-muted hover:text-main hover:bg-white/5'}`}><FiUsers /> Staff list</button>
                            <button onClick={() => setActiveTab('report')} className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-bold transition-all flex items-center gap-2 ${activeTab === 'report' ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105 z-10' : 'text-muted hover:text-main hover:bg-white/5'}`}><FiFileText /> Reports</button>
                            <button onClick={() => setActiveTab('manage_leaves')} className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] font-bold transition-all flex items-center gap-2 ${activeTab === 'manage_leaves' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 scale-105 z-10' : 'text-muted hover:text-emerald-500 hover:bg-emerald-500/5'}`}><FiShield /> Leave requests</button>
                            <button onClick={() => setIsHolidayModalOpen(true)} className="px-8 py-3.5 rounded-[1.5rem] text-[10px] font-bold transition-all flex items-center gap-2 text-muted hover:text-rose-500 hover:bg-rose-500/5"><FiCalendar /> Holidays</button>
                        </>
                    )}
                </div>
            </div>

            <HolidayConfigModal isOpen={isHolidayModalOpen} onClose={() => setIsHolidayModalOpen(false)} />

            <div className="transition-all duration-300">
                {activeTab === 'my_dashboard' && <MyAttendanceDashboard />}
                {activeTab === 'list' && <AdminListView />}

                {activeTab === 'manage_leaves' && (
                    <div className="glass-card border-none bg-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/50 via-emerald-500 to-emerald-500/50"></div>
                        <div className="p-8 border-b border-card-border/30 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-emerald-500/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                                    <FiShield size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-main tracking-tighter italic">Leave request list</h3>
                                    <p className="text-[10px] font-bold text-muted">Leave authorization portal</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <select className="bg-white/5 border border-card-border/50 rounded-xl text-[10px] font-black text-main px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none hover:border-emerald-500/50" value={reviewStatusFilter} onChange={(e) => setReviewStatusFilter(e.target.value)}>
                                    <option className="bg-slate-900" value="All">All statuses</option>
                                    <option className="bg-slate-900" value="Pending">Pending approval</option>
                                    <option className="bg-slate-900" value="Approved">Approved</option>
                                    <option className="bg-slate-900" value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-card-border/30 text-left">
                                        <th className="px-8 py-6 text-[10px] font-black text-muted">Request ID</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-muted">Name</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-muted">Duration</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-muted">Reason</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-muted">Status</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-muted">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border/20">
                                    {allLeaves.length === 0 ? (
                                        <tr><td colSpan="6" className="px-8 py-20 text-center text-[10px] font-black text-muted">No pending leave requests found.</td></tr>
                                    ) : allLeaves.map((leave, idx) => (
                                        <tr key={leave.id} className="hover:bg-white/5 transition-all group">
                                            <td className="px-8 py-6 font-mono text-sm text-muted/50 tracking-tighter">REQ-{(idx + 1).toString().padStart(3, '0')}</td>
                                            <td className="px-8 py-6 text-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-card-border/30 flex items-center justify-center text-muted group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all shadow-inner font-black">
                                                        {leave.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-main italic group-hover:text-emerald-500 transition-colors">{leave.full_name}</p>
                                                        <p className="text-[10px] font-bold text-muted">{leave.department}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-emerald-500 text-sm font-black italic">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                                                <p className="text-[10px] font-bold text-muted mt-1">{leave.leave_type}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-muted text-xs font-bold italic line-clamp-1 max-w-[200px] group-hover:line-clamp-none transition-all">"{leave.reason}"</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1 rounded-full text-[10px] font-black border shadow-inner ${leave.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : leave.status === 'Rejected' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-primary/10 border-primary/30 text-primary'}`}>{leave.status}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex gap-3">
                                                    {leave.status === 'Pending' && (
                                                        <>
                                                            <button onClick={() => setLeaveActionModal({ isOpen: true, leaveId: leave.id, type: 'Approved' })} className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-90"><FiCheck size={18} /></button>
                                                            <button onClick={() => setLeaveActionModal({ isOpen: true, leaveId: leave.id, type: 'Rejected' })} className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-90"><FiX size={18} /></button>
                                                        </>
                                                    )}
                                                    <button onClick={() => setEditLeaveModal({ isOpen: true, leave })} className="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-90"><FiEdit size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="glass-card border-none bg-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
                        <div className="p-8 border-b border-card-border/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                    <FiFileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-main tracking-tighter italic">Attendance reports</h3>
                                    <p className="text-[10px] font-bold text-muted">Comprehensive attendance data reports</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <label className="text-[10px] font-bold text-muted">Date filter</label>
                                    <select className="bg-white/5 border border-card-border/50 rounded-xl text-[10px] font-black text-main px-4 py-2.5 outline-none focus:ring-2 focus-ring-primary/20 hover:border-primary/50" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={i + 1} className="bg-slate-900" value={i + 1}>{m}</option>)}
                                    </select>
                                    <select className="bg-white/5 border border-card-border/50 rounded-xl text-[10px] font-black text-main px-4 py-2.5 outline-none focus:ring-2 focus-ring-primary/20 hover:border-primary/50" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                                        {[2024, 2025, 2026].map(y => <option key={y} className="bg-slate-900" value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={exportToCSV} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-95"><FiDownload /> Export CSV</button>
                                    <button onClick={exportToPDF} className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded-xl text-[10px] font-black hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-95"><FiFileText /> Export PDF</button>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-white/5 border-b border-card-border/30 text-[10px] font-black text-muted sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-3 text-left sticky left-0 bg-white/5 border-r border-card-border/30 z-30 min-w-[50px]">S.No</th>
                                        <th className="px-4 py-3 text-left sticky left-[50px] bg-white/5 border-r border-card-border/30 z-20 min-w-[200px]">Employee</th>
                                        {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => i + 1).map(day => {
                                            const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).toLocaleString('default', { weekday: 'short' })[0];
                                            return (
                                                <th key={day} className="px-1 py-3 text-center min-w-[32px] border-r border-dashed border-card-border/10 leading-tight">
                                                    <div>{day}</div>
                                                    <div className="text-[7px] text-muted font-black mt-0.5">{dayOfWeek}</div>
                                                </th>
                                            );
                                        })}
                                        <th className="px-4 py-3 text-center min-w-[80px]">Summary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border/20 text-xs">
                                    {matrixData.map((row, index) => (
                                        <tr key={row.user_id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-3 py-3 sticky left-0 bg-white/5 border-r border-card-border/30 z-10 text-muted/50 font-mono text-[10px]">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </td>
                                            <td className="px-4 py-3 sticky left-[50px] bg-white/5 border-r border-card-border/30 z-10">
                                                <div>
                                                    <div className="font-bold text-main capitalize truncate">{row.full_name}</div>
                                                    <div className="text-[9px] font-bold text-muted truncate">{row.department}</div>
                                                </div>
                                            </td>
                                            {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => {
                                                const dayStatus = row.daily_status.find(s => s.day === i + 1)?.status || 'Absent';
                                                let cellClass = "bg-rose-500/10 text-rose-500 font-bold";
                                                let cellText = "A";

                                                if (dayStatus === 'Present') { cellClass = "bg-emerald-500/10 text-emerald-500 font-bold"; cellText = "P"; }
                                                else if (dayStatus === 'Late') { cellClass = "bg-amber-500/10 text-amber-500 font-bold"; cellText = "L"; }
                                                else if (dayStatus === 'Leave' || dayStatus === 'On Leave') { cellClass = "bg-indigo-500/10 text-indigo-500 font-bold"; cellText = "OL"; }
                                                else if (dayStatus === 'Holiday') { cellClass = "bg-pink-500/10 text-pink-500 font-black"; cellText = "H"; }
                                                else if (dayStatus === 'Weekend') { cellClass = "bg-white/5 text-muted/50"; cellText = "W"; }

                                                return (
                                                    <td key={i} className="p-1 text-center border-r border-dashed border-card-border/10">
                                                        <div className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center text-[10px] ${cellClass}`}>
                                                            {cellText}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1 text-[10px]">
                                                    <span className="text-emerald-500 font-bold">{row.daily_status.filter(s => s.status === 'Present').length}P</span>
                                                    <span className="text-muted/50">/</span>
                                                    <span className="text-rose-500 font-bold">{row.daily_status.filter(s => s.status === 'Absent').length}A</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {matrixData.length === 0 && (<tr><td colSpan={new Date(selectedYear, selectedMonth, 0).getDate() + 2} className="px-8 py-12 text-center text-muted font-bold italic">No attendance records found for this period.</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'leaves' && (
                    <div className="space-y-6">
                        {/* Hide Apply for Leave button for admin */}
                        {userRole !== 'admin' && (
                            <div className="glass-card border-none bg-white/5 rounded-[2.5rem] p-12 text-center shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 text-primary pointer-events-none group-hover:scale-110 transition-transform">
                                    <FiFileText size={120} />
                                </div>
                                <h4 className="text-xl font-black text-main mb-2 italic tracking-tighter">Apply for leave</h4>
                                <p className="text-muted font-bold max-w-sm mx-auto text-[10px] opacity-60">Track your time off and submit new requests easily.</p>
                                <button onClick={() => setIsLeaveModalOpen(true)} className="mt-8 bg-primary text-white px-10 py-4 rounded-2xl font-black text-[10px] shadow-[0_15px_30px_-10px_rgba(var(--primary-rgb),0.5)] hover:bg-primary-hover transition-all group flex items-center gap-3 mx-auto active:scale-95">Apply for leave <FiArrowRight className="group-hover:translate-x-1 transition-transform" /></button>
                            </div>
                        )}
                        <div className="glass-card border-none bg-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
                            <div className="p-8 border-b border-card-border/30 flex items-center justify-between bg-white/5">
                                <h3 className="text-xl font-black text-main tracking-tighter italic flex items-center gap-3"><FiCalendar className="text-primary" /> My leave history</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-card-border/30 text-left">
                                            <th className="px-8 py-6 text-[10px] font-black text-muted">Leave type</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-muted">Duration</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-muted">Reason</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-muted">Admin notes</th>
                                            <th className="px-8 py-6 text-right text-[10px] font-black text-muted">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-card-border/20">
                                        {leavesData.length === 0 ? (
                                            <tr><td colSpan="5" className="px-8 py-20 text-center text-[10px] font-black text-muted">No leave records found.</td></tr>
                                        ) : leavesData.map(leave => (
                                            <tr key={leave.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-8 py-6"><span className="text-sm font-black text-primary italic group-hover:text-primary-hover transition-colors">{leave.leave_type}</span></td>
                                                <td className="px-8 py-6"><span className="text-xs font-bold text-main">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</span></td>
                                                <td className="px-8 py-6 max-w-xs"><p className="text-xs text-muted font-bold italic line-clamp-2">"{leave.reason}"</p></td>
                                                <td className="px-8 py-6 max-w-xs"><p className="text-xs text-emerald-500 font-black italic">{leave.admin_notes || '--'}</p></td>
                                                <td className="px-8 py-6 text-right"><span className={`px-4 py-1 rounded-full text-[10px] font-black border shadow-inner ${leave.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : leave.status === 'Rejected' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-primary/10 border-primary/30 text-primary'}`}>{leave.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default AttendanceView;
