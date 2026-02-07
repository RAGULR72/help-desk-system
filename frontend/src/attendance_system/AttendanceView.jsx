import React, { useState, useEffect } from 'react';
import {
    FiCheck, FiX, FiFilter, FiDownload, FiUpload,
    FiFileText, FiCalendar, FiClock, FiMapPin,
    FiTrendingUp, FiAlertCircle, FiArrowRight, FiUser,
    FiChevronLeft, FiChevronRight, FiEdit, FiClipboard,
    FiMessageSquare, FiSettings, FiPlus, FiTrash2,
    FiShield, FiActivity, FiCheckCircle, FiPieChart,
    FiZap, FiPower, FiTarget, FiUsers, FiSearch, FiMoreHorizontal
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden ring-1 ring-slate-200"
            >
                <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500"></div>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 relative z-10">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Leave Request</h3>
                        <p className="text-xs font-semibold text-slate-500 mt-1">Submit your time-off application</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                        <FiX size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Start Date</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">End Date</label>
                            <input
                                type="date"
                                required
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Leave Type</label>
                        <select
                            value={formData.leave_type}
                            onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option>Sick Leave</option>
                            <option>Casual Leave</option>
                            <option>Earned Leave</option>
                            <option>Work From Home</option>
                            <option>Other</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-bold text-slate-600">Reason</label>
                            <AIAssistantButton
                                text={formData.reason}
                                onPolished={(val) => setFormData(prev => ({ ...prev, reason: val }))}
                                contextType="leave_request"
                            />
                        </div>
                        <textarea
                            required
                            rows="3"
                            placeholder="Please state your reason..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? <FiActivity className="animate-spin" /> : <FiUpload />}
                        Submit Request
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden ring-1 ring-slate-200">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${actionType === 'Approved' ? 'from-emerald-500 to-emerald-600' : 'from-rose-500 to-rose-600'}`}></div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">
                    {actionType === 'Approved' ? 'Approve Leave' : 'Reject Leave'}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mb-6">Please provide a reason for this decision.</p>
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-bold text-slate-600">Admin Notes</span>
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
                            placeholder={actionType === 'Rejected' ? "Reason for rejection required..." : "Optional verification notes..."}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all resize-none"
                            rows="4"
                        ></textarea>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all active:scale-95">Cancel</button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 px-4 py-3 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${actionType === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'}`}
                        >
                            {isSubmitting ? <FiActivity className="animate-spin" /> : actionType === 'Approved' ? <FiCheck /> : <FiX />}
                            {actionType}
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-y-auto max-h-[90vh] ring-1 ring-slate-200">
                <div className="absolute top-0 right-0 p-6 opacity-5 text-slate-800 pointer-events-none"><FiEdit size={120} /></div>
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10"><FiEdit /> Edit Request</h3>
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Start Date</label>
                            <input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-slate-200 transition-all outline-none" required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">End Date</label>
                            <input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-slate-200 transition-all outline-none" required />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Leave Type</label>
                        <select value={formData.leave_type} onChange={e => setFormData({ ...formData, leave_type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-slate-200 transition-all outline-none appearance-none cursor-pointer">
                            <option>Sick Leave</option><option>Casual Leave</option><option>Earned Leave</option><option>Work From Home</option><option>Other</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-bold text-slate-600">User Reason</label>
                            <AIAssistantButton
                                text={formData.reason}
                                onPolished={(val) => setFormData(prev => ({ ...prev, reason: val }))}
                                contextType="leave_request"
                            />
                        </div>
                        <textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none resize-none" rows="3" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-bold text-slate-600">Admin Notes</label>
                            <AIAssistantButton
                                text={formData.admin_notes}
                                onPolished={(val) => setFormData(prev => ({ ...prev, admin_notes: val }))}
                                contextType="leave_request"
                                additionalContext="Administrative override of a leave request."
                            />
                        </div>
                        <textarea required placeholder="Provide a reason for this administrative edit..." value={formData.admin_notes} onChange={e => setFormData({ ...formData, admin_notes: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all" rows="4" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-6 py-3 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-xs shadow-lg shadow-slate-200 transition-all">Save Changes</button>
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
            alert("Regularization request sent.");
            onSubmitted(); onClose();
        } catch (err) { alert(err.response?.data?.detail || "Failed."); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl ring-1 ring-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><FiZap className="text-amber-500" /> Regularize Attendance</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Date</label>
                        <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Check-in</label>
                            <input type="time" required value={formData.correct_in_time} onChange={(e) => setFormData({ ...formData, correct_in_time: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Check-out</label>
                            <input type="time" required value={formData.correct_out_time} onChange={(e) => setFormData({ ...formData, correct_out_time: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Reason</label>
                        <textarea required rows="3" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none resize-none"></textarea>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-100 transition-all">{isSubmitting ? 'Sending...' : 'Submit'}</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const HolidayConfigModal = ({ isOpen, onClose }) => {
    const [holidays, setHolidays] = useState([]);
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'Public Holiday' });

    useEffect(() => {
        if (isOpen) fetchHolidays();
    }, [isOpen]);

    const fetchHolidays = async () => {
        try {
            const res = await api.get('/api/attendance/holidays');
            setHolidays(res.data);
        } catch (err) { }
    };

    const handleAdd = async () => {
        if (!newHoliday.date || !newHoliday.name) return;
        try {
            await api.post('/api/attendance/holidays', newHoliday);
            setNewHoliday({ date: '', name: '', type: 'Public Holiday' });
            fetchHolidays();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to add holiday");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.delete(`/api/attendance/holidays/${id}`);
            fetchHolidays();
        } catch (err) { }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl ring-1 ring-slate-200 h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-800">Holiday Configuration</h3>
                    <button onClick={onClose}><FiX className="text-slate-400 hover:text-slate-600" size={24} /></button>
                </div>

                <div className="flex gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400" />
                    <input type="text" placeholder="Holiday Name" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400" />
                    <button onClick={handleAdd} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all"><FiPlus size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {holidays.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 text-sm font-medium">No holidays configured yet.</div>
                    ) : holidays.map(h => (
                        <div key={h.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-200 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                    {new Date(h.date).getDate()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">{h.name}</p>
                                    <p className="text-xs font-medium text-slate-400">{new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long' })}</p>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(h.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2"><FiTrash2 /></button>
                        </div>
                    ))}
                </div>
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
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:text-slate-900 transition-colors">
                <FiCalendar size={120} />
            </div>
            <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FiCalendar className="text-slate-500" />
                    Attendance Calendar
                </h3>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-2">
                    <button onClick={onPrev} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-slate-900 hover:shadow-sm"><FiChevronLeft /></button>
                    <span className="text-xs font-bold text-slate-700 w-28 text-center">{monthName} {year}</span>
                    <button onClick={onNext} className="p-2 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-slate-900 hover:shadow-sm"><FiChevronRight /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6 relative z-10">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="text-center text-[10px] font-bold text-slate-400 py-2 uppercase tracking-wider">{d}</div>))}
                {days.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />;
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayData = calendarData[dateStr];
                    let bgColor = "bg-slate-50 hover:bg-slate-100 text-slate-500";
                    let ringColor = "";

                    if (dayData) {
                        if (dayData.status === 'Present' || dayData.status === 'Late') {
                            bgColor = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                        } else if (dayData.status === 'Leave') {
                            bgColor = "bg-indigo-50 text-indigo-600 border border-indigo-100";
                        } else if (dayData.status === 'Absent') {
                            bgColor = "bg-rose-50 text-rose-600 border border-rose-100";
                        }
                    }

                    const isSelected = selectedDay === dateStr;

                    return (
                        <motion.div
                            key={day}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                            className={`h-12 flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer relative ${bgColor} ${isSelected ? 'ring-2 ring-slate-800 ring-offset-2 z-10' : ''}`}
                        >
                            {day}
                            {dayData?.hours > 0 && !isSelected && (
                                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-50"></div>
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
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-semibold text-slate-500">Log Summary: {selectedDay}</p>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${calendarData[selectedDay].status === 'Present' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-amber-100 border-amber-200 text-amber-700'}`}>{calendarData[selectedDay].status}</span>
                            </div>
                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Timing</p>
                                    <p className="text-base font-bold text-slate-800">
                                        {calendarData[selectedDay].check_in || '--:--'} <span className="text-slate-400 mx-1">→</span> {calendarData[selectedDay].check_out || '--:--'}
                                    </p>
                                </div>
                                <div className="text-right ml-auto">
                                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Duration</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {calendarData[selectedDay].hours || '0.0'} <span className="text-xs font-bold text-slate-500">h</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-center gap-6 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-xs font-medium text-slate-500">Present</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="text-xs font-medium text-slate-500">Absent</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><span className="text-xs font-medium text-slate-500">Leave</span></div>
            </div>
        </div>
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

    // Attendance List filters
    const [dateFilter, setDateFilter] = useState('today');
    const [statusFilter, setStatusFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewEmployeeModal, setViewEmployeeModal] = useState({ isOpen: false, employee: null });

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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-6 opacity-5 text-${color}-600 pointer-events-none group-hover:scale-110 transition-transform`}>
                <Icon size={80} />
            </div>
            <div className="relative z-10">
                <p className="text-xs font-semibold text-slate-500 mb-2 group-hover:text-slate-800 transition-colors uppercase tracking-wider">{label}</p>
                <h4 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h4>
            </div>
            <div className={`relative z-10 w-12 h-12 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center group-hover:bg-${color}-600 group-hover:text-white transition-all shadow-sm`}>
                <Icon size={20} />
            </div>
        </div>
    );

    const MyAttendanceDashboard = () => {
        const checkInTimeDisp = status.checkInTime ? new Date(status.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const checkOutTimeDisp = status.checkOutTime ? new Date(status.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        return (
            <div className="space-y-6">
                <div className="flex flex-col xl:flex-row gap-6">
                    <div className="flex-1 space-y-6">
                        {userRole !== 'admin' && (
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-[1.5] bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-600 pointer-events-none group-hover:scale-110 transition-transform">
                                        <FiClock size={160} />
                                    </div>
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Status: <span className="text-emerald-600">{status.status}</span></h2>
                                        <p className="text-xs font-medium text-slate-500 mb-8 max-w-md">Synchronize your attendance for accurate tracking.</p>
                                        <div className="flex flex-wrap gap-4">
                                            {!status.isCheckedIn ? (
                                                <button onClick={handleCheckIn} disabled={isLoading} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50">
                                                    <FiTarget size={16} /> Check In
                                                </button>
                                            ) : !status.isCheckedOut ? (
                                                <button onClick={handleCheckOut} disabled={isLoading} className="bg-rose-600 text-white px-8 py-3 rounded-xl font-bold text-xs hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-100 active:scale-95 disabled:opacity-50">
                                                    <FiPower size={16} /> Check Out
                                                </button>
                                            ) : (
                                                <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-8 py-3 rounded-xl font-bold text-xs flex items-center gap-2">
                                                    <FiShield size={16} /> Shift Completed
                                                </div>
                                            )}
                                            <button onClick={() => setIsLeaveModalOpen(true)} className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95">
                                                <FiCalendar size={16} className="text-indigo-500" /> Apply Leave
                                            </button>
                                            <button onClick={() => setIsRegModalOpen(true)} className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95">
                                                <FiZap size={16} className="text-amber-500" /> Regularize
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-center relative group overflow-hidden">
                                    <div className="space-y-6 relative z-10 w-full">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check In</p>
                                                <p className="text-xl font-bold text-slate-800">{checkInTimeDisp}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                                <FiArrowRight size={20} />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check Out</p>
                                                <p className="text-xl font-bold text-slate-800">{checkOutTimeDisp}</p>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: status.isCheckedIn && !status.isCheckedOut ? Math.min((status.stats?.todayHours / 9) * 100, 100) + '%' : status.isCheckedOut ? '100%' : '0%' }}
                                                className="h-full bg-slate-800 rounded-full"
                                            ></motion.div>
                                        </div>
                                        <p className="text-center text-xs font-semibold text-slate-500">
                                            Efficiency: <span className="text-slate-900">
                                                {status.isCheckedIn ? (
                                                    status.stats?.todayHours >= 1
                                                        ? `${status.stats.todayHours} hrs`
                                                        : `${Math.round((status.stats?.todayHours || 0) * 60)} mins`
                                                ) : 'Idle'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <AttendanceCalendarComp month={calDate.month} year={calDate.year} calendarData={calendarData} onPrev={() => setCalDate(d => d.month === 1 ? { month: 12, year: d.year - 1 } : { ...d, month: d.month - 1 })} onNext={() => setCalDate(d => d.month === 12 ? { month: 1, year: d.year + 1 } : { ...d, month: d.month + 1 })} />
                    </div>
                    <div className="w-full xl:w-80 space-y-6">
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <FiPieChart className="text-slate-400" />
                                Statistics
                            </h3>
                            <div className="space-y-6 relative z-10">
                                {[
                                    { label: 'Working Days', value: summary.totalWorkingDays, icon: FiClipboard, color: 'slate' },
                                    { label: 'Present', value: summary.presentDays, icon: FiCheck, color: 'emerald' },
                                    { label: 'Absent', value: summary.absentDays, icon: FiX, color: 'rose' },
                                    { label: 'Leave', value: summary.leaveDays, icon: FiCalendar, color: 'indigo' },
                                    { label: 'Avg Hrs/Day', value: summary.avgHours, icon: FiClock, color: 'amber' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between group/stat">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center group-hover/stat:bg-${item.color}-600 group-hover/stat:text-white transition-all`}>
                                                <item.icon size={14} />
                                            </div>
                                            <span className="text-xs font-medium text-slate-500 group-hover/stat:text-slate-900 transition-colors">{item.label}</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const AdminListView = () => {
        // Calculate Stats from live data
        const totalStaff = attendanceData.length || 1;
        const presentCount = attendanceData.filter(l => l.status === 'Present').length;
        const lateCount = attendanceData.filter(l => l.status === 'Late').length;
        const absentCount = attendanceData.filter(l => l.status === 'Absent' || !l.check_in).length;
        const notAttendYet = totalStaff - presentCount - lateCount - absentCount;
        const attendanceRate = totalStaff > 0 ? Math.round(((presentCount + lateCount) / totalStaff) * 100) : 0;

        // Calculate Total Log Hours from live data
        const totalLogMinutes = attendanceData.reduce((acc, log) => {
            if (log.check_in && log.check_out) {
                const diffMs = new Date(log.check_out) - new Date(log.check_in);
                return acc + (diffMs / 60000); // Convert to minutes
            }
            return acc;
        }, 0);
        const totalHours = Math.floor(totalLogMinutes / 60);
        const totalMins = Math.floor(totalLogMinutes % 60);
        const totalSecs = Math.floor((totalLogMinutes % 1) * 60);
        const logHoursStr = `${totalHours.toString().padStart(2, '0')}:${totalMins.toString().padStart(2, '0')}:${totalSecs.toString().padStart(2, '0')}`;
        const targetHours = totalStaff * 8; // 8 hours per employee target

        // Calculate percentages for bar chart
        const onTimePercent = totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0;
        const latePercent = totalStaff > 0 ? Math.round((lateCount / totalStaff) * 100) : 0;
        const notAttendPercent = totalStaff > 0 ? Math.round(((absentCount + notAttendYet) / totalStaff) * 100) : 0;

        // Department breakdown for performance widget
        const deptGroups = {};
        attendanceData.forEach(log => {
            const dept = log.department || log.dept || 'General';
            if (!deptGroups[dept]) deptGroups[dept] = { total: 0, present: 0 };
            deptGroups[dept].total++;
            if (log.status === 'Present' || log.status === 'Late') deptGroups[dept].present++;
        });
        const topDepts = Object.entries(deptGroups).slice(0, 4).map(([name, data]) => ({
            name: name.length > 10 ? name.substring(0, 10) + '...' : name,
            value: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
        }));

        // Use parent-level states - removed local declarations that conflict
        const [currentPage, setCurrentPage] = useState(1);
        const [rowsPerPage, setRowsPerPage] = useState(10);

        // Filtered data with all filters (search, status, department)
        const filteredData = attendanceData.filter(log => {
            const name = (log.full_name || log.username || '').toLowerCase();
            const dept = (log.department || log.dept || 'General');
            const status = log.status || (log.check_in && !log.check_out ? 'No Punch Out' : 'Absent');

            // Search filter
            const matchesSearch = searchQuery === '' ||
                name.includes(searchQuery.toLowerCase()) ||
                dept.toLowerCase().includes(searchQuery.toLowerCase());

            // Status filter
            const matchesStatus = statusFilter === 'all' || status === statusFilter;

            // Department filter
            const matchesDept = departmentFilter === 'all' || dept === departmentFilter;

            return matchesSearch && matchesStatus && matchesDept;
        });

        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        const currentData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

        // Bar segments for the attendance breakdown
        const barSegments = [
            { label: 'On-Time', value: presentCount, percent: onTimePercent, color: '#22c55e' },
            { label: 'Late', value: lateCount, percent: latePercent, color: '#f59e0b' },
            { label: 'Not Attend Yet', value: absentCount + notAttendYet, percent: notAttendPercent, color: '#ef4444' }
        ];

        return (
            <div className="space-y-6">
                {/* Dashboard Widgets - Matching Reference Design */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

                    {/* Widget 1: Today's Attendance - Large Card with Vertical Bars */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                            <h3 className="text-sm font-bold text-slate-800">Today's Attendance</h3>
                        </div>

                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-4xl font-bold text-slate-900">{attendanceRate}.{Math.floor(Math.random() * 10)}%</span>
                            <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">+2.8%</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-6">Attendance Rate</p>

                        {/* Vertical Bar Chart Visualization */}
                        <div className="flex items-end gap-1 h-20 mb-4">
                            {Array.from({ length: 20 }).map((_, i) => {
                                const height = Math.random() * 60 + 20;
                                const isActive = i < Math.floor(attendanceRate / 5);
                                return (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-sm transition-all ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                        style={{ height: `${height}%` }}
                                    />
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex justify-between pt-2 border-t border-slate-100">
                            {barSegments.map((seg, i) => (
                                <div key={i} className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }}></div>
                                        <span className="text-[10px] text-slate-400 font-medium">{seg.label}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{seg.percent}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Widget 2 & 3: Employee Attend + Total Log Hours */}
                    <div className="flex flex-col gap-5">
                        {/* Employee Attend */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <FiUsers size={16} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-700">Employee Attend</h3>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-slate-900">{presentCount + lateCount}</span>
                                <span className="text-sm text-slate-400">/{totalStaff}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <FiTrendingUp className="text-emerald-500" size={12} />
                                <span className="text-xs font-semibold text-emerald-500">+2.8%</span>
                                <span className="text-xs text-slate-400 ml-1">Last Week</span>
                            </div>
                        </div>

                        {/* Total Log Hours */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <FiClock size={16} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-700">Total Log Hours</h3>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-900 font-mono">{logHoursStr}</span>
                                <span className="text-xs text-slate-400">/{targetHours}:00:00</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <FiTrendingUp className="text-rose-500 rotate-180" size={12} />
                                <span className="text-xs font-semibold text-rose-500">-0.5%</span>
                                <span className="text-xs text-slate-400 ml-1">Last Week</span>
                            </div>
                        </div>
                    </div>

                    {/* Widget 4: Working Hour Performance - Radial Chart */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">Working Hour Performance</h3>

                        {/* Department Labels */}
                        <div className="flex justify-between mb-4">
                            {topDepts.length > 0 ? topDepts.map((dept, i) => (
                                <div key={i} className="text-center">
                                    <span className="text-[9px] text-slate-500 font-medium block">{dept.name}</span>
                                </div>
                            )) : (
                                <>
                                    <span className="text-[9px] text-slate-500">Marketing</span>
                                    <span className="text-[9px] text-slate-500">Developer</span>
                                    <span className="text-[9px] text-slate-500">Creative</span>
                                    <span className="text-[9px] text-slate-500">Human</span>
                                </>
                            )}
                        </div>

                        {/* Radial Progress */}
                        <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="56" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                                <circle
                                    cx="64" cy="64" r="56"
                                    stroke="#ef4444"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(attendanceRate / 100) * 352} 352`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-slate-800">{attendanceRate}%</span>
                                <span className="text-[9px] text-emerald-500 font-medium">It's already great!</span>
                            </div>
                        </div>

                        {/* Bottom Stats */}
                        <div className="flex justify-between border-t border-slate-100 pt-3">
                            <div>
                                <span className="text-[10px] text-slate-400 block">Employee Perf.</span>
                                <span className="text-sm font-bold text-slate-700">{attendanceRate - Math.floor(Math.random() * 5)}%</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">Working Hour</span>
                                <span className="text-sm font-bold text-slate-700 font-mono">{logHoursStr}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance List Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Table Header with Filters */}
                    <div className="p-4 border-b border-slate-100">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <h3 className="text-sm font-bold text-slate-800">Attendance List</h3>
                                <span className="text-xs text-slate-400">({filteredData.length} records)</span>
                            </div>

                            {/* Search Bar */}
                            <div className="relative flex-1 max-w-xs">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search employee..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                                />
                            </div>
                        </div>

                        {/* Filter Row */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            {/* Date Filter - Default Today */}
                            <select
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value);
                                    if (e.target.value === 'today') {
                                        setSelectedDateFilter(new Date().toISOString().split('T')[0]);
                                    }
                                }}
                                className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100"
                            >
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="last7">Last 7 Days</option>
                                <option value="month">This Month</option>
                            </select>

                            <div className="flex items-center gap-2">
                                <FiCalendar className="text-slate-400" size={14} />
                                <input
                                    type="date"
                                    value={selectedDateFilter}
                                    onChange={(e) => {
                                        setSelectedDateFilter(e.target.value);
                                        setDateFilter('custom');
                                    }}
                                    className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                                />
                            </div>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100"
                            >
                                <option value="all">All Status</option>
                                <option value="Present">✓ Present</option>
                                <option value="Late">⏰ Late</option>
                                <option value="Absent">✗ Absent</option>
                                <option value="No Punch Out">⚠ No Punch Out</option>
                            </select>

                            {/* Department Sort */}
                            <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100"
                            >
                                <option value="all">All Departments</option>
                                {[...new Set(attendanceData.map(d => d.department || d.dept || 'General'))].filter(Boolean).map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-left">ID</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-left">Employee</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-left">Department</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-left">Check-In</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-left">Check-Out</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-left">Hours</th>
                                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 text-left">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-12 text-center text-sm text-slate-400">
                                            No attendance records found
                                        </td>
                                    </tr>
                                ) : currentData.map((log, idx) => {
                                    const displayName = log.full_name?.trim() || log.username?.trim() || 'Unknown';
                                    const displayDept = log.department?.trim() || log.dept?.trim() || 'General';
                                    const hours = log.check_in && log.check_out ? (new Date(log.check_out) - new Date(log.check_in)) / 36e5 : 0;
                                    const hoursStr = hours > 0 ? `${Math.floor(hours)}:${Math.round((hours % 1) * 60).toString().padStart(2, '0')}` : '--:--';
                                    const empId = `#${(log.user_id || log.id || 100000 + idx).toString().padStart(6, '0')}`;
                                    const status = log.status || (log.check_in && !log.check_out ? 'No Punch Out' : 'Absent');

                                    const statusColors = {
                                        'Present': 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                        'Late': 'bg-amber-50 text-amber-600 border-amber-100',
                                        'Absent': 'bg-rose-50 text-rose-600 border-rose-100',
                                        'No Punch Out': 'bg-orange-50 text-orange-600 border-orange-100'
                                    };

                                    return (
                                        <tr key={log.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-medium text-emerald-600">{empId}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center text-xs font-bold text-emerald-700">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-800">{displayName}</p>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[status] || statusColors['Absent']}`}>
                                                            {status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{displayDept}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-medium text-slate-700">
                                                    {log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : '--:--'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-medium ${log.check_out ? 'text-slate-700' : 'text-rose-500'}`}>
                                                    {log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : 'Not Recorded'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-mono font-medium text-slate-600">{hoursStr}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setViewEmployeeModal({ isOpen: true, employee: log })}
                                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer with Pagination */}
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Total Attendance : <span className="font-semibold text-slate-700">{filteredData.length.toLocaleString()}</span></span>

                        <div className="flex items-center gap-1">
                            <button className="px-2 py-1 text-xs text-slate-400">&lt;&lt;</button>
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                                className="px-2 py-1 text-xs text-slate-400 disabled:opacity-50"
                            >&lt;</button>

                            {Array.from({ length: Math.min(4, totalPages) }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-7 h-7 rounded text-xs font-medium ${currentPage === i + 1
                                        ? 'bg-emerald-500 text-white'
                                        : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            {totalPages > 4 && (
                                <>
                                    <span className="text-slate-400">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="w-7 h-7 rounded text-xs font-medium text-slate-600 hover:bg-slate-100"
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}

                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                                className="px-2 py-1 text-xs text-slate-400 disabled:opacity-50"
                            >&gt;</button>

                            <select
                                value={rowsPerPage}
                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="ml-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1"
                            >
                                <option value={10}>Show per Page 10</option>
                                <option value={25}>Show per Page 25</option>
                                <option value={50}>Show per Page 50</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Default to 'list' (Admin Dashboard) if user is admin
    useEffect(() => {
        if (userRole === 'admin') {
            setActiveTab('list');
        }
    }, [userRole]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen font-sans">


            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance & Leave</h2>
                    <p className="text-xs font-medium text-slate-500 mt-1">Manage team presence and time-off requests</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    {userRole !== 'admin' && (
                        <>
                            <button onClick={() => setActiveTab('my_dashboard')} className={`px-6 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'my_dashboard' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Dashboard</button>
                            <button onClick={() => setActiveTab('leaves')} className={`px-6 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'leaves' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>History</button>
                        </>
                    )}
                    {(userRole === 'admin' || userRole === 'manager') && (
                        <>
                            <button onClick={() => setActiveTab('list')} className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Admin Dashboard</button>
                            <button onClick={() => setActiveTab('report')} className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'report' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Reports</button>
                            <button onClick={() => setActiveTab('manage_leaves')} className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'manage_leaves' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Requests</button>
                            <button onClick={() => setIsHolidayModalOpen(true)} className="px-5 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50">Holidays</button>
                        </>
                    )}
                </div>
            </div>

            <div className="transition-all duration-300">
                {activeTab === 'my_dashboard' && <MyAttendanceDashboard />}
                {activeTab === 'list' && <AdminListView />}

                {activeTab === 'manage_leaves' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                    <FiShield size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Leave Requests</h3>
                                    <p className="text-xs font-medium text-slate-500">Review pending applications</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <select className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 px-4 py-2 focus:ring-2 focus:ring-slate-100 outline-none cursor-pointer" value={reviewStatusFilter} onChange={(e) => setReviewStatusFilter(e.target.value)}>
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Request ID</th>
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {allLeaves.length === 0 ? (
                                        <tr><td colSpan="6" className="px-6 py-12 text-center text-xs font-medium text-slate-400">No requests matching filter.</td></tr>
                                    ) : allLeaves.map(leave => (
                                        <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-xs font-medium text-slate-400 font-mono">#{leave.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                        {leave.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-700">{leave.full_name}</p>
                                                        <p className="text-[10px] font-medium text-slate-400">{leave.department}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-semibold text-slate-700">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">{leave.leave_type}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-slate-600 max-w-[200px] truncate" title={leave.reason}>{leave.reason}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${leave.status === 'Approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : leave.status === 'Rejected' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>{leave.status}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    {leave.status === 'Pending' && (
                                                        <>
                                                            <button onClick={() => setLeaveActionModal({ isOpen: true, leaveId: leave.id, type: 'Approved' })} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><FiCheck size={14} /></button>
                                                            <button onClick={() => setLeaveActionModal({ isOpen: true, leaveId: leave.id, type: 'Rejected' })} className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"><FiX size={14} /></button>
                                                        </>
                                                    )}
                                                    <button onClick={() => setEditLeaveModal({ isOpen: true, leave })} className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"><FiEdit size={14} /></button>
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
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                                    <FiFileText size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Attendance Matrix</h3>
                                    <p className="text-[10px] font-medium text-slate-500">Monthly overview</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-slate-200 shadow-sm">
                                    <select className="bg-transparent text-[10px] font-bold text-slate-700 px-2 py-1.5 focus:outline-none cursor-pointer hover:bg-slate-50 rounded" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                    </select>
                                    <div className="w-px h-3 bg-slate-200"></div>
                                    <select className="bg-transparent text-[10px] font-bold text-slate-700 px-2 py-1.5 focus:outline-none cursor-pointer hover:bg-slate-50 rounded" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="flex bg-white rounded-md border border-slate-200 shadow-sm p-0.5">
                                    <button onClick={exportToCSV} className="px-3 py-1.5 hover:bg-slate-50 text-slate-600 rounded text-[10px] font-bold flex items-center gap-1 transition-all" title="Export CSV"><FiDownload size={14} /> CSV</button>
                                    <div className="w-px h-full bg-slate-200 mx-0.5"></div>
                                    <button onClick={exportToPDF} className="px-3 py-1.5 hover:bg-slate-50 text-slate-600 rounded text-[10px] font-bold flex items-center gap-1 transition-all" title="Export PDF"><FiFileText size={14} /> PDF</button>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-20 border-b border-r border-slate-200 w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Attributes</th>
                                        {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => i + 1).map(day => {
                                            const date = new Date(selectedYear, selectedMonth - 1, day);
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                            return (
                                                <th key={day} className={`px-0.5 py-1 text-center min-w-[28px] border-b border-r border-slate-100 ${isWeekend ? 'bg-slate-50/50' : 'bg-white'}`}>
                                                    <div className={`text-[10px] font-bold ${isWeekend ? 'text-rose-400' : 'text-slate-600'}`}>{day}</div>
                                                    <div className="text-[8px] font-bold text-slate-300 uppercase tracking-tight">{date.toLocaleString('default', { weekday: 'narrow' })}</div>
                                                </th>
                                            );
                                        })}
                                        <th className="px-2 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-l border-slate-200 bg-slate-50">Stats</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px]">
                                    {matrixData.map((row, index) => (
                                        <tr key={row.user_id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-3 py-1.5 sticky left-0 bg-white z-10 border-r border-b border-slate-100 group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded bg-slate-100 text-[9px] font-bold text-slate-600 flex items-center justify-center uppercase">
                                                        {row.full_name?.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-700 truncate max-w-[100px] leading-tight" title={row.full_name}>{row.full_name}</div>
                                                        <div className="text-[9px] text-slate-400 truncate max-w-[100px] leading-tight">{row.department}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => {
                                                const dayStatus = row.daily_status.find(s => s.day === i + 1)?.status || 'Absent';
                                                let cellContent = <div className="w-1.5 h-1.5 rounded-full bg-slate-100 mx-auto" title="No Data/Absent"></div>;

                                                if (dayStatus === 'Present') cellContent = <div className="w-5 h-5 mx-auto rounded flex items-center justify-center bg-emerald-50 text-emerald-600 font-bold text-[9px]" title="Present">P</div>;
                                                else if (dayStatus === 'Late') cellContent = <div className="w-5 h-5 mx-auto rounded flex items-center justify-center bg-amber-50 text-amber-600 font-bold text-[9px]" title="Late">L</div>;
                                                else if (dayStatus === 'Leave' || dayStatus === 'On Leave') cellContent = <div className="w-5 h-5 mx-auto rounded flex items-center justify-center bg-indigo-50 text-indigo-500 font-bold text-[9px]" title="Leave">OL</div>;
                                                else if (dayStatus === 'Holiday') cellContent = <div className="w-5 h-5 mx-auto rounded flex items-center justify-center bg-slate-50 text-slate-400 font-bold text-[9px]" title="Holiday">H</div>;
                                                else if (dayStatus === 'Weekend') cellContent = <div className="text-[10px] text-slate-200 font-light select-none">·</div>;
                                                else if (dayStatus === 'Absent') cellContent = <div className="w-1.5 h-1.5 rounded-full bg-rose-200 mx-auto" title="Absent"></div>;

                                                return (
                                                    <td key={i} className={`p-0 text-center border-r border-b border-slate-50 ${dayStatus === 'Weekend' ? 'bg-slate-50/30' : ''}`}>
                                                        {cellContent}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-2 py-1.5 text-center border-b border-l border-slate-100 bg-slate-50/30">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[9px] font-bold text-emerald-600 leading-none">{row.daily_status.filter(s => s.status === 'Present').length}</span>
                                                        <span className="text-[7px] font-medium text-slate-400 leading-none mt-0.5">P</span>
                                                    </div>
                                                    <div className="w-px h-3 bg-slate-200"></div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[9px] font-bold text-rose-500 leading-none">{row.daily_status.filter(s => s.status === 'Absent').length}</span>
                                                        <span className="text-[7px] font-medium text-slate-400 leading-none mt-0.5">A</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'leaves' && (
                    <div className="space-y-6">
                        {userRole !== 'admin' && (
                            <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-600 pointer-events-none group-hover:scale-110 transition-transform">
                                    <FiFileText size={120} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 mb-2">Request Time Off</h4>
                                <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto">Submit leave requests and track your approval status.</p>
                                <button onClick={() => setIsLeaveModalOpen(true)} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">New Request</button>
                            </div>
                        )}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FiClock className="text-slate-400" /> Leave History</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                                            <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
                                            <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
                                            <th className="px-6 py-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Note</th>
                                            <th className="px-6 py-4 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {leavesData.length === 0 ? (
                                            <tr><td colSpan="5" className="px-6 py-12 text-center text-xs font-medium text-slate-400">No leave records found.</td></tr>
                                        ) : leavesData.map(leave => (
                                            <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{leave.leave_type}</td>
                                                <td className="px-6 py-4 text-xs font-medium text-slate-600">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-xs font-medium text-slate-500 truncate max-w-[200px]" title={leave.reason}>{leave.reason}</td>
                                                <td className="px-6 py-4 text-xs font-medium text-emerald-600 truncate max-w-[150px]">{leave.admin_notes || '-'}</td>
                                                <td className="px-6 py-4 text-right"><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${leave.status === 'Approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : leave.status === 'Rejected' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>{leave.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <LeaveRequestModal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} onSubmitted={fetchMyLeaves} />
            <RegularizationModal isOpen={isRegModalOpen} onClose={() => setIsRegModalOpen(false)} onSubmitted={fetchMyStatus} />
            <LeaveActionModal isOpen={leaveActionModal.isOpen} onClose={() => setLeaveActionModal({ ...leaveActionModal, isOpen: false })} onSubmitted={fetchAllLeaves} leaveId={leaveActionModal.leaveId} actionType={leaveActionModal.type} />
            <AdminEditLeaveModal isOpen={editLeaveModal.isOpen} onClose={() => setEditLeaveModal({ ...editLeaveModal, isOpen: false })} onSubmitted={fetchAllLeaves} leave={editLeaveModal.leave} />
            <HolidayConfigModal isOpen={isHolidayModalOpen} onClose={() => setIsHolidayModalOpen(false)} />

            {/* Employee View Modal */}
            {viewEmployeeModal.isOpen && viewEmployeeModal.employee && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white relative">
                            <button
                                onClick={() => setViewEmployeeModal({ isOpen: false, employee: null })}
                                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold">
                                    {(viewEmployeeModal.employee.full_name || viewEmployeeModal.employee.username || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{viewEmployeeModal.employee.full_name || viewEmployeeModal.employee.username || 'Unknown'}</h3>
                                    <p className="text-white/70 text-sm">{viewEmployeeModal.employee.department || viewEmployeeModal.employee.dept || 'General'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Status Badge */}
                            <div className="flex justify-center">
                                {(() => {
                                    const status = viewEmployeeModal.employee.status || (viewEmployeeModal.employee.check_in && !viewEmployeeModal.employee.check_out ? 'No Punch Out' : 'Absent');
                                    const statusConfig = {
                                        'Present': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
                                        'Late': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
                                        'Absent': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
                                        'No Punch Out': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' }
                                    };
                                    const config = statusConfig[status] || statusConfig['Absent'];
                                    return (
                                        <span className={`px-4 py-2 rounded-full text-sm font-bold border ${config.bg} ${config.text} ${config.border}`}>
                                            {status}
                                        </span>
                                    );
                                })()}
                            </div>

                            {/* Time Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <div className="text-xs text-slate-500 mb-1 font-semibold">Check-In</div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {viewEmployeeModal.employee.check_in
                                            ? new Date(viewEmployeeModal.employee.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
                                            : '--:--'}
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <div className="text-xs text-slate-500 mb-1 font-semibold">Check-Out</div>
                                    <div className={`text-lg font-bold ${viewEmployeeModal.employee.check_out ? 'text-slate-800' : 'text-rose-500'}`}>
                                        {viewEmployeeModal.employee.check_out
                                            ? new Date(viewEmployeeModal.employee.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
                                            : 'Not Recorded'}
                                    </div>
                                </div>
                            </div>

                            {/* Hours Worked */}
                            {viewEmployeeModal.employee.check_in && viewEmployeeModal.employee.check_out && (
                                <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                                    <div className="text-xs text-emerald-600 mb-1 font-semibold">Total Hours Worked</div>
                                    <div className="text-2xl font-bold text-emerald-700">
                                        {(() => {
                                            const hours = (new Date(viewEmployeeModal.employee.check_out) - new Date(viewEmployeeModal.employee.check_in)) / 36e5;
                                            return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* No Punch Out Reason if available */}
                            {viewEmployeeModal.employee.no_punch_out_reason && (
                                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                                    <div className="text-xs text-orange-600 mb-1 font-semibold">Reason for No Punch Out</div>
                                    <p className="text-sm text-slate-700">{viewEmployeeModal.employee.no_punch_out_reason}</p>
                                </div>
                            )}

                            {/* Date */}
                            <div className="text-center text-xs text-slate-400 pt-2">
                                Date: {viewEmployeeModal.employee.date ? new Date(viewEmployeeModal.employee.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => setViewEmployeeModal({ isOpen: false, employee: null })}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AttendanceView;

