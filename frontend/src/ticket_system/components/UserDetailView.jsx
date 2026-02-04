import React, { useState, useEffect } from 'react';
import {
    FiX, FiCheck, FiUser, FiShield, FiLock, FiActivity, FiMail,
    FiPhone, FiBriefcase, FiMapPin, FiCalendar, FiMonitor,
    FiSmartphone, FiCamera, FiAlertTriangle, FiCheckCircle,
    FiStar, FiSettings, FiBell, FiShieldOff, FiTrash2,
    FiBarChart2, FiTrendingUp, FiClock, FiGrid
} from 'react-icons/fi';
import api, { baseURL } from '../../api/axios';
import { useTranslation } from '../../context/TranslationContext';
import { motion, AnimatePresence } from 'framer-motion';
import ImageCropper, { dataURLtoBlob } from './ImageCropper';

const UserDetailView = ({ userId, onClose, onUpdate }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Profile');
    const [user, setUser] = useState(null);
    const [activityData, setActivityData] = useState({
        recent_activity: [],
        login_history: [],
        stats: {
            created: 0,
            resolved: 0,
            active: 0,
            avg_response: '0h',
            this_month: { created: 0, resolved: 0 },
            last_month: { created: 0, resolved: 0 }
        }
    });

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        job_title: '',
        about_me: '',
        role: '',
        status: 'Active',
    });

    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [securitySettings, setSecuritySettings] = useState({
        mfa_enabled: false,
        email_notif: true
    });

    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImage, setTempImage] = useState(null);

    useEffect(() => {
        if (userId) {
            fetchAllData();
        }
    }, [userId]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [userRes, activityRes] = await Promise.all([
                api.get(`/api/admin/users/${userId}`),
                api.get(`/api/admin/users/${userId}/activity`)
            ]);

            const targetUser = userRes.data;
            if (targetUser) {
                setUser(targetUser);
                const nameParts = (targetUser.full_name || '').split(' ');
                setFormData({
                    username: targetUser.username || '',
                    email: targetUser.email || '',
                    first_name: nameParts[0] || '',
                    last_name: nameParts.slice(1).join(' ') || '',
                    phone: targetUser.phone || '',
                    job_title: targetUser.job_title || '',
                    about_me: targetUser.about_me || '',
                    role: targetUser.role || 'user',
                    status: targetUser.status || (targetUser.is_approved ? 'Active' : 'Pending'),
                });
                setSecuritySettings({
                    mfa_enabled: targetUser.is_2fa_enabled || false,
                    email_notif: targetUser.email_notifications_enabled ?? true,
                });
            }

            if (activityRes.data) {
                setActivityData(activityRes.data);
            }
        } catch (error) {
            console.error("Failed to fetch user data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await api.put(`/api/admin/users/${userId}`, {
                ...formData,
                full_name: `${formData.first_name} ${formData.last_name}`.trim(),
                is_2fa_enabled: securitySettings.mfa_enabled,
                email_notifications_enabled: securitySettings.email_notif,
            });
            alert('Profile updated successfully');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update user", error);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!passwordData.new_password) return alert("Enter new password");
        if (passwordData.new_password !== passwordData.confirm_password) return alert("Passwords don't match");

        setResetting(true);
        try {
            await api.put(`/api/admin/users/${userId}/password`, {
                new_password: passwordData.new_password
            });
            alert("Password updated successfully");
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            alert("Failed to reset password: " + (err.response?.data?.detail || err.message));
        } finally {
            setResetting(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempImage(reader.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedArea) => {
        try {
            const blob = dataURLtoBlob(croppedArea);
            const data = new FormData();
            data.append('file', blob, 'avatar.png');

            const res = await api.post(`/api/admin/users/${userId}/avatar`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setUser({ ...user, avatar_url: res.data.avatar_url });
            setShowCropper(false);
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error("Failed to upload avatar", err);
            alert("Failed to upload avatar");
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center min-h-[500px] bg-white rounded-[3rem]">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Initializing Profile...</p>
            </div>
        </div>
    );

    const tabs = [
        { id: 'Profile', icon: <FiUser size={18} /> },
        { id: 'Security', icon: <FiShield size={18} /> },
        { id: 'Performance', icon: <FiBarChart2 size={18} /> }
    ];

    const formatLastLogin = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Navigation Header */}
            <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-md px-10 py-6 border-b border-slate-100 flex justify-between items-center h-[100px] shrink-0">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-bold text-xl overflow-hidden border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                            {user?.avatar_url ? (
                                <img src={`${baseURL}${user.avatar_url}`} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                                user?.username?.charAt(0).toUpperCase()
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer">
                            <FiCamera className="text-white" size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{formData.username}</h2>
                        <p className="text-xs text-slate-500 font-bold mt-1.5 uppercase tracking-widest flex items-center gap-2">
                            System {formData.role} <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                        </p>
                    </div>
                </div>

                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === tab.id
                                ? 'bg-white text-primary shadow-sm scale-[1.02]'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                }`}
                        >
                            {tab.icon}
                            {tab.id}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-95"
                >
                    <FiX size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar-minimal p-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-6xl mx-auto w-full"
                    >
                        {/* PROFILE TAB */}
                        {activeTab === 'Profile' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-8">
                                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 text-primary group-hover:scale-110 transition-transform">
                                            <FiUser size={150} />
                                        </div>
                                        <div className="mb-8">
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Basic Entity Details</h3>
                                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Update core identity information</p>
                                        </div>

                                        <div className="space-y-6 relative z-10">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                                                    <input
                                                        type="text"
                                                        value={formData.first_name}
                                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none font-bold text-slate-900 transition-all text-sm"
                                                        placeholder="First Name"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                                                    <input
                                                        type="text"
                                                        value={formData.last_name}
                                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none font-bold text-slate-900 transition-all text-sm"
                                                        placeholder="Last Name"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none font-bold text-slate-900 transition-all text-sm"
                                                    placeholder="email@example.com"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Designation</label>
                                                <input
                                                    type="text"
                                                    value={formData.job_title}
                                                    onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none font-bold text-slate-900 transition-all text-sm"
                                                    placeholder="e.g. Senior Network Engineer"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 flex items-center justify-between text-white group cursor-pointer overflow-hidden relative">
                                        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                                        <div className="flex items-center gap-6 relative z-10">
                                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform">
                                                <FiTrendingUp size={28} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-lg uppercase tracking-tighter">Operational Rank</h4>
                                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Enhanced System Monitoring</p>
                                            </div>
                                        </div>
                                        <button className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 relative z-10 shadow-lg shadow-black/10">
                                            Manage Authority
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                                        <div className="mb-8">
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Biography & Bio-Data</h3>
                                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">A brief narrative about the entity</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">About the entity</label>
                                                <textarea
                                                    value={formData.about_me}
                                                    onChange={e => setFormData({ ...formData, about_me: e.target.value })}
                                                    rows="8"
                                                    className="w-full px-6 py-5 bg-slate-50 border border-transparent rounded-[2rem] focus:bg-white focus:border-primary/20 outline-none font-bold text-slate-900 transition-all text-sm resize-none custom-scrollbar-minimal"
                                                    placeholder="Tell us about this user..."
                                                />
                                            </div>

                                            <div className="pt-4 flex justify-end">
                                                <button
                                                    onClick={handleSaveProfile}
                                                    disabled={saving}
                                                    className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                                                >
                                                    {saving ? (
                                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> SYNCING...</>
                                                    ) : (
                                                        <><FiCheckCircle /> UPDATE PROFILE</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECURITY TAB */}
                        {activeTab === 'Security' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-7 space-y-8">
                                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                                        <div className="mb-10">
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Credential Management</h3>
                                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Update security authentication protocols</p>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Validation Token</label>
                                                <input
                                                    type="password"
                                                    value={passwordData.old_password}
                                                    onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none font-bold text-slate-900 transition-all text-sm"
                                                    placeholder="Enter Old Password"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Access Key</label>
                                                    <input
                                                        type="password"
                                                        value={passwordData.new_password}
                                                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none font-bold text-slate-900 transition-all text-sm"
                                                        placeholder="New Password"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verify Key</label>
                                                    <input
                                                        type="password"
                                                        value={passwordData.confirm_password}
                                                        onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none font-bold text-slate-900 transition-all text-sm"
                                                        placeholder="Confirm New Password"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4 flex justify-end">
                                                <button
                                                    onClick={handlePasswordChange}
                                                    disabled={resetting}
                                                    className="px-10 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 border border-rose-100"
                                                >
                                                    {resetting ? 'UPDATING...' : <><FiLock /> RESET CREDENTIALS</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                                        <div className="mb-8 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Access Chronicle</h3>
                                                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Last 4 Authentication Events</p>
                                            </div>
                                            <FiActivity className="text-slate-300" size={24} />
                                        </div>

                                        <div className="space-y-4">
                                            {activityData.login_history.slice(0, 4).map((log, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary/20 transition-all">
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${log.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                                            {log.device === 'Mobile' ? <FiSmartphone size={22} /> : <FiMonitor size={22} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-800 tracking-tight">{log.browser} on {log.os}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{log.ip_address} • {log.location}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[11px] font-black text-slate-900 tracking-tighter">{formatLastLogin(log.login_time)}</p>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest mt-1 inline-block px-2 py-0.5 rounded-full ${log.is_active ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                                                            {log.is_active ? 'AUTHORIZED' : 'DENIED'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {activityData.login_history.length === 0 && (
                                                <div className="text-center py-10">
                                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No authentication data detected.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-5 space-y-8">
                                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                                        <div className="absolute -left-10 -bottom-10 p-10 opacity-5 text-emerald-500 group-hover:rotate-12 transition-transform">
                                            <FiShield size={250} />
                                        </div>
                                        <div className="mb-10 text-center">
                                            <div className={`w-24 h-24 mx-auto mb-6 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all ${securitySettings.mfa_enabled ? 'bg-emerald-500 text-white animate-pulse-ring' : 'bg-slate-100 text-slate-400'}`}>
                                                {securitySettings.mfa_enabled ? <FiShield size={40} /> : <FiShieldOff size={40} />}
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Two-Factor Encryption</h3>
                                            <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest px-6">Add a secondary verification layer for mission-critical security.</p>
                                        </div>

                                        <div className="space-y-4 relative z-10">
                                            <button
                                                onClick={() => {
                                                    if (securitySettings.mfa_enabled) {
                                                        const confirmDisable = window.confirm("SECURITY WARNING: Disabling Two-Factor Authentication will make this account significantly less secure. Are you sure you want to proceed?");
                                                        if (!confirmDisable) return;
                                                    }
                                                    setSecuritySettings({ ...securitySettings, mfa_enabled: !securitySettings.mfa_enabled });
                                                }}
                                                className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-4 ${securitySettings.mfa_enabled
                                                    ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200'
                                                    : 'bg-slate-900 text-white'
                                                    }`}
                                            >
                                                {securitySettings.mfa_enabled ? 'ENABLED & SECURED' : 'ACTIVATE PROTECTION'}
                                                {securitySettings.mfa_enabled ? <FiCheckCircle /> : <FiLock />}
                                            </button>

                                            <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                                    Status: <span className={securitySettings.mfa_enabled ? 'text-emerald-500' : 'text-rose-500'}>
                                                        {securitySettings.mfa_enabled ? 'ACTIVE PROTECTION' : 'VULNERABLE'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10">
                                            <FiBell size={80} />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Signal Protocol</h3>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center group cursor-pointer" onClick={() => setSecuritySettings({ ...securitySettings, email_notif: !securitySettings.email_notif })}>
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-tighter">Email Transmissions</p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Automated System Alerts</p>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full relative transition-all ${securitySettings.email_notif ? 'bg-primary' : 'bg-slate-700'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${securitySettings.email_notif ? 'left-7' : 'left-1'}`} />
                                                </div>
                                            </div>
                                            <div className="h-px bg-slate-800 w-full" />
                                            <div className="flex justify-between items-center opacity-40">
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-tighter">Cellular Link (SMS)</p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Emergency Mobile Sync</p>
                                                </div>
                                                <div className="w-12 h-6 bg-slate-700 rounded-full relative">
                                                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PERFORMANCE TAB */}
                        {activeTab === 'Performance' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {[
                                        { label: 'Entity Status', value: formData.status, color: 'text-emerald-500', icon: <FiActivity /> },
                                        { label: 'Active Tasks', value: activityData.stats.active, color: 'text-primary', icon: <FiGrid /> },
                                        { label: 'Resolved Hub', value: activityData.stats.resolved, color: 'text-indigo-600', icon: <FiCheckCircle /> },
                                        { label: 'Operations Success', value: '98%', color: 'text-amber-500', icon: <FiTrendingUp /> }
                                    ].map((stat, idx) => (
                                        <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group hover:scale-[1.02] hover:shadow-md transition-all">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-slate-300 group-hover:text-primary transition-colors">{stat.icon}</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Stat</span>
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                            <h4 className={`text-3xl font-black tracking-tighter ${stat.color}`}>{stat.value}</h4>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                                        <div className="absolute -right-20 -top-20 p-20 opacity-[0.02] text-primary rotate-12">
                                            <FiBarChart2 size={400} />
                                        </div>
                                        <div className="mb-10 flex justify-between items-end">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">System Output (Monthly)</h3>
                                                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Comparative Matrix vs Previous Cycle</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-primary" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previous</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-12 relative z-10">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                                        <FiPlus className="text-primary" /> Tickets Raised
                                                    </p>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-slate-900 tracking-widest">{activityData.stats.this_month?.created} <span className="text-slate-400 ml-1">VS</span> {activityData.stats.last_month?.created}</p>
                                                    </div>
                                                </div>
                                                <div className="h-6 bg-slate-50 rounded-full w-full overflow-hidden flex p-1">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (activityData.stats.this_month?.created / (Math.max(1, (activityData.stats.this_month?.created + activityData.stats.last_month?.created)))) * 100)}%` }}
                                                        className="h-full bg-primary rounded-full shadow-lg"
                                                    />
                                                    <div className="ml-1 h-full bg-slate-200 rounded-full flex-1" />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                                        <FiCheck className="text-emerald-500" /> Resolutions Finalized
                                                    </p>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-slate-900 tracking-widest">{activityData.stats.this_month?.resolved} <span className="text-slate-400 ml-1">VS</span> {activityData.stats.last_month?.resolved}</p>
                                                    </div>
                                                </div>
                                                <div className="h-6 bg-slate-50 rounded-full w-full overflow-hidden flex p-1">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (activityData.stats.this_month?.resolved / (Math.max(1, (activityData.stats.this_month?.resolved + activityData.stats.last_month?.resolved)))) * 100)}%` }}
                                                        className="h-full bg-emerald-500 rounded-full shadow-lg"
                                                    />
                                                    <div className="ml-1 h-full bg-slate-200 rounded-full flex-1" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8 pt-6">
                                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Growth Index</p>
                                                        <p className={`text-xl font-black tracking-tighter ${activityData.stats.this_month?.created >= activityData.stats.last_month?.created ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {activityData.stats.this_month?.created >= activityData.stats.last_month?.created ? '+' : ''}
                                                            {activityData.stats.last_month?.created > 0
                                                                ? ((activityData.stats.this_month?.created - activityData.stats.last_month?.created) / activityData.stats.last_month?.created * 100).toFixed(1)
                                                                : '100'}%
                                                        </p>
                                                    </div>
                                                    <div className={`p-2 rounded-lg ${activityData.stats.this_month?.created >= activityData.stats.last_month?.created ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        <FiTrendingUp size={20} />
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Resolution Efficiency</p>
                                                        <p className="text-xl font-black text-primary tracking-tighter">
                                                            {activityData.stats.this_month?.created > 0
                                                                ? ((activityData.stats.this_month?.resolved / activityData.stats.this_month?.created) * 100).toFixed(0)
                                                                : '0'}%
                                                        </p>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                        <FiClock size={20} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center group">
                                        <div className="w-24 h-24 mb-6 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:bg-primary/5 group-hover:text-primary transition-all group-hover:border-primary/20">
                                            <FiSettings size={40} className="group-hover:rotate-90 transition-transform duration-500" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Advanced Diagnostics</h3>
                                        <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest px-8 leading-relaxed mb-8">Detailed internal data trace and comprehensive permission matrix control.</p>
                                        <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200">
                                            INITIATE AUDIT
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Image Cropper Modal */}
            <AnimatePresence>
                {showCropper && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-[3rem] overflow-hidden max-w-lg w-full shadow-2xl">
                            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-tighter">Bio-Metric Calibration</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Adjust entity visual representation</p>
                                </div>
                                <button onClick={() => setShowCropper(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><FiX size={20} /></button>
                            </div>
                            <div className="h-[400px] bg-slate-50">
                                <ImageCropper imageSrc={tempImage} onCropComplete={handleCropComplete} onCancel={() => setShowCropper(false)} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserDetailView;
