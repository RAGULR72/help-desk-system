import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiShield, FiDatabase, FiEdit2, FiDownload, FiUpload } from 'react-icons/fi';
import api from '../api/axios';
import { motion } from 'framer-motion';

const EditUserPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        location: '',
        department: '',
        role: '',
        status: '',
        is_2fa_enabled: false,
        is_2fa_setup: false,
        has_security_keys: false,
        has_backup_codes: false,
        manager: '',
        job_title: '',
        company: '',
        permissions: {}
    });
    const [potentialManagers, setPotentialManagers] = useState([]);

    useEffect(() => {
        fetchUser();
        fetchPotentialManagers();
    }, [id]);

    const fetchPotentialManagers = async () => {
        try {
            const res = await api.get('/api/admin/users');
            setPotentialManagers(res.data.filter(u => u.role === 'admin' || u.role === 'manager'));
        } catch (error) {
            console.error("Failed to fetch managers", error);
        }
    };

    const fetchUser = async () => {
        try {
            const res = await api.get(`/api/admin/users/${id}`);
            const user = res.data;

            let parsedPermissions = {};
            if (user.permissions) {
                if (typeof user.permissions === 'string') {
                    try {
                        parsedPermissions = JSON.parse(user.permissions);
                    } catch (e) {
                        console.error("Failed to parse permissions", e);
                    }
                } else {
                    parsedPermissions = user.permissions;
                }
            }

            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || '',
                location: user.location || '',
                department: user.department || 'HR',
                role: user.role || 'user',
                status: user.status || 'Active',
                is_2fa_enabled: user.is_2fa_enabled || false,
                is_2fa_setup: user.is_2fa_setup || false,
                has_security_keys: user.has_security_keys || false,
                has_backup_codes: user.has_backup_codes || false,
                manager: user.manager || '',
                job_title: user.job_title || '',
                company: user.company || '',
                permissions: parsedPermissions
            });
        } catch (error) {
            console.error("Failed to fetch user", error);
            alert("Failed to load user data");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...formData,
                permissions: JSON.stringify(formData.permissions)
            };
            await api.put(`/api/admin/users/${id}`, payload);
            navigate('/dashboard/admin');
        } catch (error) {
            console.error("Failed to update user", error);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const togglePermission = (key) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key]
            }
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8 md:p-16 font-sans">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-semibold mb-12 transition-colors"
                >
                    <FiArrowLeft size={20} />
                    <span>Back to Profile</span>
                </button>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-[32px] md:text-[40px] font-bold text-[#0F172A] tracking-tight mb-2">Edit User</h1>
                    <p className="text-base md:text-lg text-slate-400 font-medium">Update user information and permissions</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 md:p-10 mb-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h2 className="text-2xl font-bold text-[#0F172A] mb-8 tracking-tight">Personal Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-5 py-3.5 bg-[#F9FBFF] border border-slate-100 rounded-xl focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.05)] outline-none transition-all text-slate-800 font-medium"
                                placeholder="Emily Brown"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-5 py-3.5 bg-[#F9FBFF] border border-slate-100 rounded-xl focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.05)] outline-none transition-all text-slate-800 font-medium"
                                placeholder="emily.brown@company.com"
                            />
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Phone</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-5 py-3.5 bg-[#F9FBFF] border border-slate-100 rounded-xl focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.05)] outline-none transition-all text-slate-800 font-medium"
                                placeholder="+1 234 567 892"
                            />
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Location</label>
                            <input
                                type="text"
                                list="location-options"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-5 py-3.5 bg-[#F9FBFF] border border-slate-100 rounded-xl focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.05)] outline-none transition-all text-slate-800 font-medium"
                                placeholder="Select or type location..."
                            />
                            <datalist id="location-options">
                                <option value="Default" />
                                <option value="Office" />
                                <option value="Site" />
                                <option value="Remote" />
                            </datalist>
                        </div>

                        {/* Department */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Department</label>
                            <div className="relative">
                                <select
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#F9FBFF] border border-slate-100 rounded-xl focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.05)] outline-none transition-all text-slate-800 font-medium appearance-none cursor-pointer"
                                >
                                    <option value="IT">IT</option>
                                    <option value="IT-Support">IT-Support</option>
                                    <option value="HR">HR</option>
                                    <option value="Accounts">Accounts</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Role</label>
                            <div className="relative">
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#F9FBFF] border border-slate-100 rounded-xl focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.05)] outline-none transition-all text-slate-800 font-medium appearance-none cursor-pointer"
                                >
                                    <option value="user">User</option>
                                    <option value="technician">Technician</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Status</label>
                            <div className="relative">
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#F9FBFF] border border-slate-100 rounded-xl focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.05)] outline-none transition-all text-slate-800 font-medium appearance-none cursor-pointer"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Designation */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Designation</label>
                            <input
                                type="text"
                                value={formData.job_title}
                                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                className="w-full px-5 py-3.5 bg-[#F9FBFF] border border-slate-100 rounded-xl focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.05)] outline-none transition-all text-slate-800 font-medium"
                                placeholder="Senior Manager"
                            />
                        </div>

                        {/* Reporting To */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Reporting To (Manager/Admin)</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    list="manager-select-list"
                                    value={formData.manager}
                                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-[#F9FBFF] border border-slate-100 rounded-xl focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.05)] outline-none transition-all text-slate-800 font-medium group-focus-within:border-blue-500"
                                    placeholder="Select a manager or type custom name..."
                                />
                                <datalist id="manager-select-list">
                                    {potentialManagers
                                        .filter(m => !formData.company || m.company === formData.company)
                                        .map(m => (
                                            <option key={m.id} value={m.full_name || m.username}>
                                                {m.role.toUpperCase()} ({m.company})
                                            </option>
                                        ))}
                                </datalist>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-blue-500 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 ml-1 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                Suggested from Admin/Manager roles or enter custom
                            </p>
                        </div>
                    </div>
                </div>

                {/* Advanced Permissions Card */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 md:p-10 mb-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FiShield size={20} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Advanced Permissions</h2>
                            <p className="text-sm text-slate-400 font-medium">Manage granular access controls for this user</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-violet-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                                    <FiDatabase size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Export Data</p>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Access to CSV/Excel Exports</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => togglePermission('export_data')}
                                className={`relative w-11 h-6 rounded-full transition-colors ${formData.permissions.export_data ? 'bg-violet-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.permissions.export_data ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-violet-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <FiEdit2 size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Edit Tickets</p>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modify Ticket Details</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => togglePermission('ticket_edit')}
                                className={`relative w-11 h-6 rounded-full transition-colors ${formData.permissions.ticket_edit ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.permissions.ticket_edit ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-violet-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <FiDownload size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Export Tickets</p>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Download Ticket Reports</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => togglePermission('ticket_export')}
                                className={`relative w-11 h-6 rounded-full transition-colors ${formData.permissions.ticket_export ? 'bg-emerald-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.permissions.ticket_export ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-violet-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                    <FiUpload size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Import Data</p>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upload Bulk Data</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => togglePermission('import_data')}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${formData.permissions?.import_data ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Security Settings Card */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 md:p-10 mb-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-10">
                        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Two-Factor Authentication</h2>
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${formData.is_2fa_enabled ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-slate-100 text-slate-500'}`}>
                                {formData.is_2fa_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <button
                                onClick={() => setFormData({ ...formData, is_2fa_enabled: !formData.is_2fa_enabled })}
                                className={`w-12 h-6 rounded-full relative transition-all duration-200 ${formData.is_2fa_enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${formData.is_2fa_enabled ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-0">
                        {/* Authenticator App */}
                        <div className="flex items-center justify-between py-6 border-b border-slate-50">
                            <div className="space-y-0.5 text-left">
                                <h3 className="text-[17px] font-semibold text-[#334155]">Authenticator App</h3>
                                <p className="text-xs text-slate-400 font-medium">Use an app like Google Authenticator or Authy</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`text-[14px] font-medium ${formData.is_2fa_setup ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {formData.is_2fa_setup ? 'Configured' : 'Not configured'}
                                </span>
                                <button
                                    onClick={() => setFormData({ ...formData, is_2fa_setup: !formData.is_2fa_setup })}
                                    className="px-6 py-2 bg-white border border-slate-100 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
                                >
                                    {formData.is_2fa_setup ? 'Reset' : 'Set up'}
                                </button>
                            </div>
                        </div>

                        {/* Force 2FA Toggle for Admins */}
                        <div className="flex items-center justify-between py-6 border-b border-slate-50">
                            <div className="space-y-0.5 text-left">
                                <h3 className="text-[17px] font-semibold text-[#334155]">Force 2FA Status</h3>
                                <p className="text-xs text-slate-400 font-medium">Manually enable/disable 2FA for this user (Admin Override)</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`text-[14px] font-medium ${formData.is_2fa_enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {formData.is_2fa_enabled ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                    onClick={() => setFormData({ ...formData, is_2fa_enabled: !formData.is_2fa_enabled })}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.is_2fa_enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.is_2fa_enabled ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Security Keys */}
                        <div className="flex items-center justify-between py-6 border-b border-slate-50">
                            <div className="space-y-0.5 text-left">
                                <h3 className="text-[17px] font-semibold text-[#334155]">Security Keys</h3>
                                <p className="text-xs text-slate-400 font-medium">Use physical security keys like YubiKey</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`text-[14px] font-medium ${formData.has_security_keys ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {formData.has_security_keys ? 'Key added' : 'No keys added'}
                                </span>
                                <button
                                    onClick={() => setFormData({ ...formData, has_security_keys: !formData.has_security_keys })}
                                    className="px-6 py-2 bg-white border border-slate-100 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
                                >
                                    {formData.has_security_keys ? 'Manage' : 'Add'}
                                </button>
                            </div>
                        </div>

                        {/* Backup Codes */}
                        <div className="flex items-center justify-between py-6 border-b border-slate-50">
                            <div className="space-y-0.5 text-left">
                                <h3 className="text-[17px] font-semibold text-[#334155]">Backup Codes</h3>
                                <p className="text-xs text-slate-400 font-medium">Use backup codes if you lose your device</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`text-[14px] font-medium ${formData.has_backup_codes ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {formData.has_backup_codes ? 'Generated' : 'Not generated'}
                                </span>
                                <button
                                    onClick={() => setFormData({ ...formData, has_backup_codes: !formData.has_backup_codes })}
                                    className="px-6 py-2 bg-white border border-slate-100 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
                                >
                                    {formData.has_backup_codes ? 'View' : 'Generate'}
                                </button>
                            </div>
                        </div>

                        {/* Telephone Number */}
                        <div className="flex items-center justify-between py-6 pt-8">
                            <div className="space-y-0.5 text-left">
                                <h3 className="text-[17px] font-semibold text-[#334155]">Telephone Number</h3>
                                <p className="text-xs text-slate-400 font-medium">Use SMS for authentication codes</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`text-[14px] font-medium ${formData.phone ? 'text-slate-700' : 'text-slate-400'}`}>
                                    {formData.phone || 'Not configured'}
                                </span>
                                <button className="px-6 py-2 bg-white border border-slate-100 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95">Edit</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 md:gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 md:px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 md:px-10 py-3.5 bg-[#1D69ED] text-white font-bold rounded-xl hover:bg-blue-700 shadow-[0_15px_30px_-10px_rgba(29,105,237,0.3)] transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <FiSave size={18} />
                        )}
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div >
    );
};

export default EditUserPage;
