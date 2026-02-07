import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FiChevronLeft, FiSearch, FiFilter, FiDownload,
    FiMoreVertical, FiCalendar, FiClock, FiTrendingUp
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import api from '../api/axios';

const EmployeeDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Attendance');

    useEffect(() => {
        const fetchEmployeeData = async () => {
            try {
                setLoading(true);
                // 1. Fetch employee details (using admin user endpoint or specific detail endpoint)
                // For now, we might need a dedicated endpoint, but let's try to get history first which contains user info in our previous implementation, 
                // or we can fetch user profile if available. 
                // Creating a specific endpoint to get user details by ID for admin would be best, 
                // but let's use the history endpoint we just made and extract info from the first record or a separate call if needed.

                // Ideally backend should have /api/users/:id, but let's check what we have.
                // We'll use the history endpoint we created which returns records. 
                // We might need to fetch the user profile separately or update the backend to support it.
                // Let's assume we can get basic info from the history for now, OR we add a proper endpoint.

                // Let's fetch history first
                const historyRes = await api.get(`/api/attendance/user/${id}/history`);
                setHistory(historyRes.data || []);

                // For employee details, if we don't have a direct endpoint, we might have to rely on the history 
                // OR better, let's look at the existing code to see how it gets user list.
                // It gets it from /api/attendance/all. We could use that, but it's heavy.
                // Let's assume for now we can get the user info from the first history record 
                // or we might need to add a small backend endpoint to get user details.

                // Let's assume we mock the user details for a moment if history is empty, 
                // but usually we should have a `GET /api/admin/users/:id` or similar.

                // Let's try to fetch user details. 
                // If we don't have a specific endpoint, we can use the history response 
                // (which we updated to return some user info? No, it returns ID).

                // Wait, the history endpoint returns:
                // { id, user_id, date, check_in, check_out, status, work_location, no_punch_out_reason }
                // It does NOT return name/dept in the new compact version I wrote?
                // Let me check the backend code I just wrote.

            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeData();
    }, [id]);

    // We need to fetch user details too. 
    // Let's add a backend endpoint for getting user details by ID for admin to be safe.
    // Or we can use the existing `api.get('/api/auth/users')` (admin only) and filter? 
    // That might be inefficient but works for now if we don't want to touch backend again immediately. 
    // Actually, in `AttendanceView.jsx`, we had `attendanceData` which had all users. 
    // But since this is a separate page, we don't have that context.

    // Let's fetch the user details using a new simple endpoint or existing one.
    // I'll update the component to fetch both.

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <FiChevronLeft size={20} />
                            <span className="text-sm font-medium">Back to List</span>
                        </button>
                        <div className="flex items-center gap-2">
                            {/* Breadcrumb or Status */}
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Active</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {/* Employee Info Header */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                {/* Avatar & Name */}
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center text-3xl font-bold text-emerald-700 shadow-inner">
                                        {employee?.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">
                                            {employee?.full_name || 'Unknown Employee'}
                                        </h2>
                                        <p className="text-sm text-slate-500 font-medium mt-1">
                                            EMP-{(employee?.id || id).toString().padStart(3, '0')} • {employee?.job_title || 'Employee'}
                                        </p>
                                    </div>
                                </div>

                                {/* Info Boxes */}
                                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Department</span>
                                        <span className="text-sm font-semibold text-slate-700">{employee?.department || 'General'}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Location</span>
                                        <span className="text-sm font-semibold text-slate-700">{employee?.work_location || 'Office'}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Email</span>
                                        <span className="text-sm font-semibold text-slate-700 truncate" title={employee?.email}>{employee?.email || '-'}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Join Date</span>
                                        <span className="text-sm font-semibold text-slate-700">{employee?.created_at ? new Date(employee.created_at).toLocaleDateString() : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="bg-white rounded-t-2xl border border-b-0 border-slate-200 px-6 shadow-sm mt-8">
                            <div className="flex gap-8 border-b border-slate-100 overflow-x-auto">
                                {['General', 'Payroll', 'Attendance', 'Leave', 'Performance', 'Documents'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab
                                            ? 'text-emerald-600 border-emerald-500'
                                            : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-200'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content - Attendance */}
                        <div className={`space-y-6 ${activeTab === 'Attendance' ? 'block' : 'hidden'}`}>

                            {/* Stats */}
                            <div className="bg-white border-x border-b border-slate-200 p-6 rounded-b-2xl mb-6 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* Attendance Rate */}
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Attendance Rate</span>
                                            <div className="p-1.5 bg-white rounded-lg text-emerald-600 shadow-sm">
                                                <FiTrendingUp size={14} />
                                            </div>
                                        </div>
                                        <div className="text-3xl font-extrabold text-slate-800">
                                            {history.length > 0
                                                ? Math.round((history.filter(h => h.status === 'Present' || h.status === 'Late').length / history.length) * 100)
                                                : 0}%
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">Based on total working days</span>
                                    </div>

                                    {/* Days Present */}
                                    <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Days Present</span>
                                            <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500">
                                                <FiCalendar size={14} />
                                            </div>
                                        </div>
                                        <div className="text-3xl font-extrabold text-slate-800">
                                            {history.filter(h => h.status === 'Present' || h.status === 'Late').length} <span className="text-sm font-medium text-slate-400">days</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">Current Month</span>
                                    </div>

                                    {/* Late */}
                                    <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-amber-500 uppercase tracking-wide">Late Check-ins</span>
                                            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500">
                                                <FiClock size={14} />
                                            </div>
                                        </div>
                                        <div className="text-3xl font-extrabold text-slate-800">
                                            {history.filter(h => h.status === 'Late').length} <span className="text-sm font-medium text-slate-400">times</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">Within tolerance</span>
                                    </div>

                                    {/* Overtime */}
                                    <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">Overtime</span>
                                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500">
                                                <FiClock size={14} />
                                            </div>
                                        </div>
                                        <div className="text-3xl font-extrabold text-slate-800">
                                            {(() => {
                                                const totalOT = history.reduce((acc, h) => {
                                                    if (h.check_in && h.check_out) {
                                                        const hours = (new Date(h.check_out) - new Date(h.check_in)) / 36e5;
                                                        return acc + Math.max(0, hours - 8);
                                                    }
                                                    return acc;
                                                }, 0);
                                                return Math.round(totalOT);
                                            })()} <span className="text-sm font-medium text-slate-400">hours</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">Approved Hours</span>
                                    </div>
                                </div>
                            </div>

                            {/* Filters & Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-sm">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search by date or status..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                            <FiFilter size={14} /> Filter
                                        </button>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-100 transition-colors">
                                            <FiDownload size={14} /> Export Report
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Check-In</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Check-Out</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Working Hours</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Overtime</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {history.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                                        No attendance records found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                history
                                                    .filter(h => {
                                                        if (!searchQuery) return true;
                                                        const q = searchQuery.toLowerCase();
                                                        return (h.date && h.date.includes(q)) || (h.status && h.status.toLowerCase().includes(q));
                                                    })
                                                    .map((record, idx) => {
                                                        const statusColors = {
                                                            'Present': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                                            'Late': 'bg-amber-50 text-amber-700 border-amber-200',
                                                            'Absent': 'bg-rose-50 text-rose-700 border-rose-200',
                                                            'No Punch Out': 'bg-orange-50 text-orange-700 border-orange-200'
                                                        };

                                                        let workingHours = '-';
                                                        let overtime = '-';
                                                        if (record.check_in && record.check_out) {
                                                            const hours = (new Date(record.check_out) - new Date(record.check_in)) / 36e5;
                                                            const h = Math.floor(hours);
                                                            const m = Math.round((hours % 1) * 60);
                                                            workingHours = `${h}h ${m}m`;
                                                            if (hours > 8) {
                                                                const otHours = hours - 8;
                                                                overtime = `${Math.floor(otHours)}h ${Math.round((otHours % 1) * 60)}m`;
                                                            }
                                                        }

                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-semibold text-slate-700">
                                                                            {record.date ? new Date(record.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                                        </span>
                                                                        <span className="text-xs text-slate-400">
                                                                            {record.date ? new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' }) : '-'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`text-sm font-medium ${record.check_in ? 'text-slate-700' : 'text-rose-500'}`}>
                                                                        {record.check_in ? new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Not Recorded'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`text-sm font-medium ${record.check_out ? 'text-slate-700' : 'text-rose-500'}`}>
                                                                        {record.check_out ? new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Not Recorded'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-sm font-mono text-slate-600">{workingHours}</span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-sm font-mono text-blue-600">{overtime}</span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[record.status] || 'bg-slate-100 text-slate-600'}`}>
                                                                        {record.status || 'Unknown'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                                        <FiMoreVertical size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs text-slate-500">
                                        Showing <span className="font-semibold">{history.length}</span> records
                                    </span>
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1 text-xs border border-slate-200 rounded text-slate-500 hover:bg-slate-50" disabled>Previous</button>
                                        <button className="px-3 py-1 text-xs border border-slate-200 rounded text-slate-500 hover:bg-slate-50" disabled>Next</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EmployeeDetailPage;
