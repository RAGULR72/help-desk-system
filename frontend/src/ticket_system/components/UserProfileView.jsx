import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiCamera, FiX, FiCheck, FiMonitor, FiSmartphone,
    FiShield, FiLock, FiBell, FiUser, FiUsers,
    FiActivity, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api, { baseURL } from '../../api/axios';
import ImageCropper, { dataURLtoBlob } from './ImageCropper';

const UserProfileView = () => {
    const navigate = useNavigate();
    const { user, updateUser, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('personal');
    const [profileImage, setProfileImage] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [activityData, setActivityData] = useState({
        recent_activity: [],
        stats: { created: 0, resolved: 0, active: 0, avg_response: '0h' },
        login_history: []
    });

    const fetchActivity = async () => {
        try {
            const res = await api.get('/api/auth/profile/activity');
            setActivityData(res.data);
        } catch (err) {
            console.error("Failed to fetch activity", err);
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await api.get('/api/auth/sessions');
            setSessions(res.data);
        } catch (err) {
            console.error("Failed to fetch sessions", err);
        }
    };

    useEffect(() => {
        fetchActivity();
        refreshUser();
    }, []);

    useEffect(() => {
        if (activeTab === 'security' || activeTab === 'activity') {
            fetchSessions();
            fetchActivity();
        }
    }, [activeTab]);

    const handleRevokeSession = async (sessionId) => {
        if (!window.confirm("Are you sure you want to log out of this device?")) return;
        try {
            await api.delete(`/api/auth/sessions/${sessionId}`);
            setSessions(sessions.filter(s => s.id !== sessionId));
        } catch (err) {
            alert("Failed to revoke session");
        }
    };

    const [security, setSecurity] = useState({
        mfa: false,
        emailNotif: true,
        smsNotif: false
    });

    useEffect(() => {
        if (user) {
            setSecurity({
                mfa: user.is_2fa_enabled || false,
                emailNotif: user.email_notifications_enabled ?? true,
                smsNotif: user.sms_notifications_enabled ?? false
            });
        }
    }, [user]);

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwStatus, setPwStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        if (user?.must_change_password) {
            setActiveTab('security');
        }
    }, [user]);

    const handleDisable2FA = async () => {
        const confirmed = window.confirm("SECURITY WARNING: Disabling Two-Factor Authentication will make your account significantly less secure. Are you sure you want to proceed?");
        if (confirmed) {
            try {
                const res = await api.post('/api/auth/2fa/disable');
                if (res.data) {
                    setSecurity({ ...security, mfa: false });
                    refreshUser();
                    alert("Security Warning: Two-Factor Authentication has been disabled. Your account is now less secure.");
                }
            } catch (err) {
                console.error("Failed to disable 2FA", err);
                alert("Failed to disable 2FA. Please try again.");
            }
        }
    };

    const handlePwSubmit = async (e) => {
        e.preventDefault();
        setPwStatus({ type: '', message: '' });

        if (passwords.new !== passwords.confirm) {
            setPwStatus({ type: 'error', message: 'New passwords do not match' });
            return;
        }

        if (passwords.new.length < 6) {
            setPwStatus({ type: 'error', message: 'Password must be at least 6 characters' });
            return;
        }

        setPwLoading(true);
        try {
            await api.post('/api/auth/change-password', {
                old_password: passwords.current,
                new_password: passwords.new
            });
            setPwStatus({ type: 'success', message: 'Password updated successfully!' });
            setPasswords({ current: '', new: '', confirm: '' });
            await refreshUser();
        } catch (err) {
            setPwStatus({ type: 'error', message: err.response?.data?.detail || 'Failed to update password' });
        } finally {
            setPwLoading(false);
        }
    };

    const getFullAvatarUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseURL}${normalizedPath}`;
    };

    const [formData, setFormData] = useState({
        fullName: '',
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        phone: '',
        jobTitle: '',
        department: '',
        dateOfBirth: '',
        country: '',
        address: '',
        userRole: '',
        accountStatus: 'Active',
        reportingTo: ''
    });



    useEffect(() => {
        if (user) {
            const nameParts = (user.full_name || user.fullName || user.username || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            setFormData(prev => ({
                ...prev,
                fullName: user.full_name || user.fullName || user.username || '',
                firstName: firstName,
                lastName: lastName,
                email: user.email || '',
                username: user.username || '',
                phone: user.phone || '',
                jobTitle: user.job_title || user.jobTitle || '',
                department: user.department || '',
                dateOfBirth: user.date_of_birth || user.dateOfBirth || '',
                country: user.country || '',
                address: user.address || user.office_address || '',
                userRole: user.role || '',
                accountStatus: user.status || 'Active',
                reportingTo: user.manager || ''
            }));
            if (user.avatar_url) {
                setProfileImage(getFullAvatarUrl(user.avatar_url));
            }

        }
    }, [user]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setTempImage(reader.result);
                setShowCropper(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedImg) => {
        setProfileImage(croppedImg);
        setShowCropper(false);
    };

    const handleRemoveImage = () => {
        setProfileImage(null);
    };



    const handleSave = async () => {
        let avatar_url = user.avatar_url;
        if (profileImage && profileImage.startsWith('data:')) {
            try {
                const blob = dataURLtoBlob(profileImage);
                const formDataFile = new FormData();
                formDataFile.append('file', blob, 'avatar.jpg');
                const uploadRes = await api.post('/api/auth/me/avatar', formDataFile, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                avatar_url = uploadRes.data.avatar_url;
            } catch (err) {
                console.error("Avatar upload failed", err);
                alert("Failed to upload profile picture.");
                return;
            }
        }

        const success = await updateUser({
            full_name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            username: formData.username,
            phone: formData.phone,
            job_title: formData.jobTitle,
            department: formData.department,
            date_of_birth: formData.dateOfBirth,
            country: formData.country,
            address: formData.address,
            role: formData.userRole,
            status: formData.accountStatus,
            permissions: user.permissions, // Keep existing permissions
            avatar_url: avatar_url,
            is_2fa_enabled: security.mfa,
            email_notifications_enabled: security.emailNotif,
            sms_notifications_enabled: security.smsNotif
        });
        if (success) {
            alert('Profile updated successfully!');
        } else {
            alert('Failed to update profile. Please try again.');
        }
    };

    const tabs = [
        { id: 'personal', label: 'Personal Information', icon: <FiUser size={18} /> },
        { id: 'permissions', label: 'Integration Preferences', icon: <FiUsers size={18} /> },
        { id: 'notifications', label: 'Notification Settings', icon: <FiBell size={18} /> },
        { id: 'security', label: 'Security Settings', icon: <FiLock size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="mb-6">

                <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
            </div>

            {/* Main Content */}
            <div className="flex gap-8">
                {/* Left Sidebar */}
                <div className="w-64 flex-shrink-0">
                    <div className="space-y-2">
                        {tabs.filter(tab => {
                            if (tab.id === 'permissions') {
                                return user?.role === 'admin' || user?.role === 'manager';
                            }
                            return true;
                        }).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-full text-sm font-semibold transition-all ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 bg-white rounded-3xl shadow-sm p-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'personal' && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Personal Information</h2>

                                    {/* Profile Picture Section */}
                                    <div className="mb-10">
                                        <div className="flex items-center gap-6">
                                            <div className="relative">
                                                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                                                    {profileImage ? (
                                                        <img
                                                            src={profileImage}
                                                            alt="Profile"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <img
                                                            src={`https://ui-avatars.com/api/?name=${formData.fullName}&background=ec4899&color=fff&size=128`}
                                                            alt="Profile"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <label className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full text-sm font-semibold cursor-pointer hover:shadow-lg transition-all">
                                                    Upload
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={handleFileChange}
                                                    />
                                                </label>
                                                <button
                                                    onClick={handleRemoveImage}
                                                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-full text-sm font-semibold hover:bg-gray-50 transition-all"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Fields */}
                                    <div className="space-y-6">
                                        {/* First Name & Last Name */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    First Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.firstName}
                                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                    placeholder="First Name"
                                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Last Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.lastName}
                                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                    placeholder="Last Name"
                                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* Email & Username */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="email@example.com"
                                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Username <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.username}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                    placeholder="username"
                                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* Date of Birth */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Date of Birth <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.dateOfBirth}
                                                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>

                                        {/* Country & Phone Number */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Country <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={formData.country}
                                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                                >
                                                    <option value="">Select Country</option>
                                                    <option value="India">India</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Phone Number <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="+91 00000 00000"
                                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* Reporting To */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Reporting To
                                            </label>
                                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-0 rounded-xl">
                                                <FiUsers className="text-indigo-500" size={18} />
                                                <span className="text-sm text-gray-900 font-medium">
                                                    {formData.reportingTo || 'Not Assigned'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-1.5 ml-1 italic">
                                                * This is managed by your system administrator.
                                            </p>
                                        </div>

                                        {/* Address */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Address <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="Enter your full address"
                                                rows={3}
                                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                            />
                                        </div>

                                        {/* Additional Fields for Admins/Managers */}
                                        {(user?.role === 'admin' || user?.role === 'manager') && (
                                            <>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                            Job Title
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.jobTitle}
                                                            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                                            placeholder="Software Engineer"
                                                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Department
                                                    </label>
                                                    <select
                                                        value={formData.department}
                                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                                    >
                                                        <option value="">Select Department</option>
                                                        <option value="IT">IT</option>
                                                        <option value="IT-Support">IT-Support</option>
                                                        <option value="HR">HR</option>
                                                        <option value="Accounts">Accounts</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {/* Save Button */}
                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={handleSave}
                                                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full font-semibold hover:shadow-lg transition-all"
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'permissions' && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Integration Preferences</h2>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">User Role</label>
                                                <select
                                                    value={formData.userRole}
                                                    onChange={(e) => setFormData({ ...formData, userRole: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                >
                                                    <option value="admin">System Administrator</option>
                                                    <option value="manager">IT Manager</option>
                                                    <option value="technician">IT Technician</option>
                                                    <option value="user">End User</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Account Status</label>
                                                <select
                                                    value={formData.accountStatus}
                                                    onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value })}
                                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="Inactive">Inactive</option>
                                                    <option value="Suspended">Suspended</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={handleSave}
                                                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full font-semibold hover:shadow-lg transition-all"
                                            >
                                                Save Preferences
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Notification Settings</h2>
                                    <div className="space-y-4">
                                        {[
                                            { id: 'emailNotif', label: 'Email Notifications', desc: 'Receive email updates for ticket changes' },
                                            { id: 'smsNotif', label: 'SMS Notifications', desc: 'Receive SMS alerts for urgent tickets' }
                                        ].map(notif => (
                                            <div
                                                key={notif.id}
                                                className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                                            >
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">{notif.label}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">{notif.desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => setSecurity({ ...security, [notif.id]: !security[notif.id] })}
                                                    className={`relative w-14 h-7 rounded-full transition-colors ${security[notif.id] ? 'bg-indigo-500' : 'bg-gray-300'
                                                        }`}
                                                >
                                                    <span
                                                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${security[notif.id] ? 'translate-x-7' : 'translate-x-0'
                                                            }`}
                                                    />
                                                </button>
                                            </div>
                                        ))}

                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={handleSave}
                                                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full font-semibold hover:shadow-lg transition-all"
                                            >
                                                Save Settings
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Security Settings</h2>

                                    {/* Password Change Section */}
                                    <div className="mb-8">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password</h3>
                                        <form onSubmit={handlePwSubmit} className="space-y-4">
                                            {pwStatus.message && (
                                                <div
                                                    className={`p-4 rounded-xl flex items-center gap-3 ${pwStatus.type === 'success'
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-red-50 text-red-700'
                                                        }`}
                                                >
                                                    {pwStatus.type === 'success' ? <FiCheckCircle size={20} /> : <FiAlertCircle size={20} />}
                                                    <span className="text-sm font-semibold">{pwStatus.message}</span>
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                                                <input
                                                    type="password"
                                                    value={passwords.current}
                                                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                                    placeholder="••••••••••••"
                                                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.new}
                                                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                                        placeholder="••••••••••••"
                                                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                                                    <input
                                                        type="password"
                                                        value={passwords.confirm}
                                                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                                        placeholder="••••••••••••"
                                                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={pwLoading}
                                                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                                                >
                                                    {pwLoading ? 'Updating...' : 'Update Password'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* 2FA Section */}
                                    <div className="mb-8 p-6 bg-gray-50 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Add an extra layer of security to your account
                                                </p>
                                                <p className={`text-sm font-semibold mt-2 ${security.mfa ? 'text-green-600' : 'text-gray-500'}`}>
                                                    Status: {security.mfa ? 'Enabled' : 'Disabled'}
                                                </p>
                                            </div>
                                            {security.mfa ? (
                                                <button
                                                    onClick={handleDisable2FA}
                                                    className="px-6 py-2.5 bg-red-50 text-red-600 rounded-full font-semibold hover:bg-red-100 transition-all flex items-center gap-2"
                                                >
                                                    <FiAlertCircle size={14} /> Disable 2FA
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => navigate('/setup-2fa')}
                                                    className="px-6 py-2.5 bg-green-50 text-green-600 rounded-full font-semibold hover:bg-green-100 transition-all"
                                                >
                                                    Enable 2FA
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Active Sessions */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-gray-900">Active Sessions</h3>
                                            <button
                                                onClick={fetchSessions}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <FiActivity size={18} className="text-gray-600" />
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {sessions.map((session, index) => (
                                                <div
                                                    key={session.id}
                                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                                            {session.device === 'Mobile' ? (
                                                                <FiSmartphone size={20} className="text-indigo-600" />
                                                            ) : (
                                                                <FiMonitor size={20} className="text-indigo-600" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                                {session.browser} / {session.os}
                                                                {index === 0 && (
                                                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full font-semibold">
                                                                        Current
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {session.location} • {session.ip_address}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {index !== 0 && (
                                                        <button
                                                            onClick={() => handleRevokeSession(session.id)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <FiX size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Image Cropper Modal */}
            {showCropper && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-2xl w-full h-[600px] flex flex-col">
                        <ImageCropper imageSrc={tempImage} onCropComplete={handleCropComplete} onCancel={() => setShowCropper(false)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileView;
