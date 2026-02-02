import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit3, FiKey, FiMail, FiPhone, FiMapPin, FiBriefcase, FiShield, FiCalendar, FiLock, FiX, FiCheckCircle, FiDatabase } from 'react-icons/fi';
import api, { baseURL } from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

const AdminUserViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticketCount, setTicketCount] = useState(0);

    // Reset Password States
    const [showResetModal, setShowResetModal] = useState(false);
    const [newPass, setNewPass] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, [id]);

    const fetchUserData = async () => {
        try {
            const res = await api.get(`/api/admin/users/${id}`);
            const userData = res.data;

            // Parse permissions
            let parsedPermissions = {};
            if (userData.permissions) {
                if (typeof userData.permissions === 'string') {
                    try {
                        parsedPermissions = JSON.parse(userData.permissions);
                    } catch (e) {
                        console.error("Failed to parse permissions", e);
                    }
                } else {
                    parsedPermissions = userData.permissions;
                }
            }
            userData.permissions = parsedPermissions;

            setUser(userData);
            setTicketCount(userData.total_tickets || 0);
        } catch (error) {
            console.error("Failed to fetch user", error);
        } finally {
            setLoading(false);
        }
    };

    const confirmReset = async () => {
        if (!newPass || newPass.length < 6) {
            alert("Password must be at least 6 characters long");
            return;
        }
        setResetLoading(true);
        try {
            await api.put(`/api/admin/users/${user.id}/password`, {
                new_password: newPass,
                confirm_password: newPass
            });
            setResetSuccess(true);
            setTimeout(() => {
                setShowResetModal(false);
                setResetSuccess(false);
                setNewPass('');
            }, 2000);
        } catch (error) {
            console.error(error);
            alert("Failed to reset password");
        } finally {
            setResetLoading(false);
        }
    };

    const handleSendResetLink = async () => {
        if (!user?.email) {
            alert("User does not have an email address configured");
            return;
        }
        setResetLoading(true);
        try {
            await api.post(`/api/admin/users/${user.id}/reset-link`);
            setResetSuccess(true);
            setTimeout(() => {
                setShowResetModal(false);
                setResetSuccess(false);
            }, 2000);
        } catch (error) {
            console.error(error);
            alert("Failed to send reset link");
        } finally {
            setResetLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) return <div className="p-20 text-center">User not found</div>;

    const initials = user.full_name
        ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
        : user.username.charAt(0).toUpperCase();

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 lg:p-12 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold mb-8 transition-colors group text-sm"
                >
                    <FiArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Users</span>
                </button>

                {/* Top Header Card */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.01)] p-6 md:p-8 mb-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center text-2xl md:text-3xl font-bold shadow-sm">
                            {user.avatar_url ? (
                                <img src={`${baseURL}${user.avatar_url}`} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                initials
                            )}
                        </div>

                        {/* Name and Badges */}
                        <div className="text-center md:text-left">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                                <h1 className="text-2xl md:text-[28px] font-bold text-[#0F172A] tracking-tight leading-tight">{user.full_name || user.username}</h1>

                                {/* Role Badge */}
                                <span className="px-2.5 py-0.5 bg-[#F1F5F9] text-slate-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                    {user.role || 'user'}
                                </span>

                                {/* Status Badge */}
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                    <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                    {user.status || 'Inactive'}
                                </div>

                                {/* Permissions Badges */}
                                {user.permissions?.export_data && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-violet-50 text-violet-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-violet-100">
                                        <FiDatabase size={10} />
                                        Export Access
                                    </div>
                                )}
                                {user.permissions?.ticket_edit && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                        <FiEdit3 size={10} />
                                        Ticket Edit
                                    </div>
                                )}
                                {user.permissions?.ticket_export && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                        <FiCheckCircle size={10} />
                                        Ticket Export
                                    </div>
                                )}
                            </div>
                            <p className="text-sm md:text-base text-slate-400 font-medium tracking-tight">
                                {user.department || 'HR'} <span className="mx-1">•</span> {user.location || 'Default'}
                            </p>
                        </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate(`/admin/edit-user/${user.id}`)}
                            className="bg-white border border-slate-100 px-5 py-2.5 rounded-xl font-bold text-slate-700 text-sm hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                        >
                            <FiEdit3 size={16} className="text-slate-400" />
                            <span>Edit Profile</span>
                        </button>
                        <button
                            onClick={() => setShowResetModal(true)}
                            className="bg-white border border-slate-100 px-5 py-2.5 rounded-xl font-bold text-slate-700 text-sm hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                        >
                            <FiKey size={16} className="text-slate-400" />
                            <span>Reset Password</span>
                        </button>
                    </div>
                </div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
                    {/* Contact Information */}
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.01)] p-6 md:p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                        <h2 className="text-lg font-bold text-[#0D1425] mb-6 tracking-tight">Contact Information</h2>
                        <div className="space-y-5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-[#F8FAFC] text-slate-400 border border-slate-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <FiMail size={16} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                                    <p className="text-[15px] font-semibold text-slate-800 truncate">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-[#F8FAFC] text-slate-400 border border-slate-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <FiPhone size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phone</p>
                                    <p className="text-[15px] font-semibold text-slate-800">{user.phone || '+1 234 567 892'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-[#F8FAFC] text-slate-400 border border-slate-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <FiMapPin size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Location</p>
                                    <p className="text-[15px] font-semibold text-slate-800">{user.location || 'Default'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Work Information */}
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.01)] p-6 md:p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                        <h2 className="text-lg font-bold text-[#0D1425] mb-6 tracking-tight">Work Information</h2>
                        <div className="space-y-5">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-[#F8FAFC] text-slate-400 border border-slate-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <FiBriefcase size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Department</p>
                                    <p className="text-[15px] font-semibold text-slate-800">{user.department || 'General'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-[#F8FAFC] text-slate-400 border border-slate-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <FiBriefcase size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Designation</p>
                                    <p className="text-[15px] font-semibold text-slate-800">{user.job_title || 'Team Member'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-[#F8FAFC] text-slate-400 border border-slate-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <FiCheckCircle size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Employee ID</p>
                                    <p className="text-[15px] font-semibold text-slate-800">{user.employee_id || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-[#F8FAFC] text-slate-400 border border-slate-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <FiShield size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Role</p>
                                    <p className="text-[15px] font-semibold text-slate-800 capitalize">{user.role || 'User'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-[#F8FAFC] text-slate-400 border border-slate-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <FiUsers size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reporting To</p>
                                    <p className="text-[15px] font-semibold text-slate-800">{user.manager || 'None'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-[#F8FAFC] text-slate-400 border border-slate-50 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                    <FiCalendar size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Join Date</p>
                                    <p className="text-[15px] font-semibold text-slate-800">{formatDate(user.created_at) || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3.5 pt-2 border-t border-slate-50">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${user.is_2fa_enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    <FiShield size={16} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dual-Factor (2FA)</p>
                                    <p className={`text-[13px] font-bold uppercase tracking-tight ${user.is_2fa_enabled ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {user.is_2fa_enabled ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Card */}
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.01)] p-6 md:p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col">
                        <h2 className="text-lg font-bold text-[#0D1425] mb-8 tracking-tight">Activity</h2>
                        <div className="flex-1 flex flex-col items-center justify-center text-center pb-4">
                            <p className="text-[48px] font-bold text-[#1D69ED] leading-none mb-2">{ticketCount}</p>
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-8">Total Tickets</p>

                            <button
                                onClick={() => navigate(`/dashboard/admin?user_filter=${user.id}`)}
                                className="w-full py-3.5 bg-[#F8FAFC] border border-slate-50 text-slate-800 font-bold rounded-xl text-sm hover:bg-slate-100 transition-all active:scale-[0.98] shadow-sm tracking-tight"
                            >
                                View Tickets
                            </button>
                        </div>
                    </div>
                </div>

                {/* Password Reset Modal */}
                <AnimatePresence>
                    {showResetModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden"
                            >
                                <div className="p-8">
                                    {resetSuccess ? (
                                        <div className="py-8 text-center" key="success">
                                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <FiCheckCircle size={40} />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Updated!</h3>
                                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                                Credentials synchronized successfully.
                                            </p>
                                        </div>
                                    ) : (
                                        <div key="form">
                                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                                                <FiLock size={28} />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Reset Password</h3>
                                            <p className="text-xs text-slate-400 font-bold mb-8 uppercase tracking-widest">
                                                Updating access for <span className="text-slate-900">{user?.full_name || user?.username}</span>
                                            </p>

                                            <div className="space-y-6 mb-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New password</label>
                                                    <input
                                                        type="password"
                                                        value={newPass}
                                                        onChange={e => setNewPass(e.target.value)}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-blue-500/20 outline-none font-bold text-slate-900 transition-all text-sm"
                                                        placeholder="Minimum 6 characters"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4 py-2">
                                                    <div className="h-px flex-1 bg-slate-100" />
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">or</span>
                                                    <div className="h-px flex-1 bg-slate-100" />
                                                </div>

                                                <button
                                                    onClick={handleSendResetLink}
                                                    disabled={resetLoading}
                                                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 text-blue-600 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-blue-50 transition-all border border-blue-100/50 group"
                                                >
                                                    <FiMail size={16} className="group-hover:scale-110 transition-transform" />
                                                    Send reset link via email
                                                </button>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setShowResetModal(false)}
                                                    disabled={resetLoading}
                                                    className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={confirmReset}
                                                    disabled={resetLoading}
                                                    className="flex-[2] py-4 px-6 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                                                >
                                                    {resetLoading ? 'Processing...' : 'Save New Password'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminUserViewPage;
