import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api, { baseURL } from '../../api/axios';
import { FiSearch, FiFilter, FiDownload, FiPlus, FiMoreHorizontal, FiEdit2, FiTrash2, FiCheck, FiX, FiShield, FiUser, FiGrid, FiList, FiLayout, FiSliders, FiEye, FiLock, FiPower, FiUserX, FiCheckCircle, FiAlertCircle, FiMail, FiZap, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import UserDetailView from './UserDetailView';
import AddUserModal from './AddUserModal';

const UserManagementView = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { checkPermission, user } = useAuth();
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'table', 'board', 'list'

    // Additional Filter States
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showTwoFAFilter, setShowTwoFAFilter] = useState(false);
    const [twoFAFilter, setTwoFAFilter] = useState('all');

    // Delete Confirmation States
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [deleteSuccess, setDeleteSuccess] = useState(false);

    // Column Customization State
    const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);

    // Load initial visible columns from localStorage or default
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const saved = localStorage.getItem('userTableVisibleColumns');
        return saved ? JSON.parse(saved) : ['full_name', 'email', 'role', 'designation', 'status', 'joined_date', '2fa'];
    });

    const [tableColumns, setTableColumns] = useState(() => {
        const saved = localStorage.getItem('userTableAllColumns');
        if (saved) return JSON.parse(saved);
        return [
            { id: 'full_name', label: 'Full Name' },
            { id: 'email', label: 'Email' },
            { id: 'username', label: 'Username' },
            { id: 'phone', label: 'Phone' },
            { id: 'company', label: 'Company' },
            { id: 'location', label: 'Location' },
            { id: 'department', label: 'Department' },
            { id: 'team', label: 'Team' },
            { id: 'designation', label: 'Designation' },
            { id: 'reporting', label: 'Reporting To' },
            { id: 'role', label: 'Role' },
            { id: 'status', label: 'Status' },
            { id: 'tech_level', label: 'Tech Level' },
            { id: 'specialization', label: 'Specialization' },
            { id: 'last_activity', label: 'Last Activity' },
            { id: 'joined_date', label: 'Joined Date' },
            { id: '2fa', label: '2FA Status' },
        ];
    });

    // Persist customization
    useEffect(() => {
        localStorage.setItem('userTableVisibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        localStorage.setItem('userTableAllColumns', JSON.stringify(tableColumns));
    }, [tableColumns]);

    // Reset Password States
    const [showResetModal, setShowResetModal] = useState(false);
    const [userForReset, setUserForReset] = useState(null);
    const [newPass, setNewPass] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    // Approval States
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [userToApprove, setUserToApprove] = useState(null);
    const [approveRole, setApproveRole] = useState('user');
    const [approveLoading, setApproveLoading] = useState(false);

    const [newColumnLabel, setNewColumnLabel] = useState('');

    const handleAddCustomColumn = () => {
        if (!newColumnLabel.trim()) return;
        const newId = `custom_${Date.now()}`;
        const newCol = { id: newId, label: newColumnLabel.trim() };
        setTableColumns(prev => [...prev, newCol]);
        setVisibleColumns(prev => [...prev, newId]);
        setNewColumnLabel('');
    };

    // Pagination (mock for now as API might not support it yet, implementing client-side)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/users');
            setAllUsers(res.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = (user) => {
        setUserToDelete(user);
        setDeleteError('');
        setDeleteSuccess(false);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setDeleteLoading(true);
        setDeleteError('');
        try {
            await api.delete(`/api/admin/users/${userToDelete.id}`);
            setDeleteSuccess(true);
            setAllUsers(prev => prev.filter(u => u.id !== userToDelete.id));

            setTimeout(() => {
                setShowDeleteConfirm(false);
                setUserToDelete(null);
                setDeleteSuccess(false);
            }, 2000);
        } catch (error) {
            console.error("Failed to delete user", error);
            const msg = error.response?.data?.detail || "Failed to delete user due to data dependencies. Consider deactivating instead.";
            setDeleteError(msg);
        } finally {
            setDeleteLoading(false);
        }
    };

    // Parse Permissions
    const userPermissions = React.useMemo(() => {
        if (!user?.permissions) return {};
        if (typeof user.permissions === 'string') {
            try {
                return JSON.parse(user.permissions);
            } catch (e) {
                return {};
            }
        }
        return user.permissions;
    }, [user]);

    const canExport = user?.role === 'admin' || userPermissions.export_data;
    const canEditUsers = user?.role === 'admin' || user?.role === 'manager';

    const UserStatusBadge = ({ user }) => {
        const status = user.status || (user.is_approved ? 'Active' : 'Pending');
        const isActive = status === 'Active';
        const isPending = status === 'Pending' || (!user.is_approved && status !== 'Rejected' && status !== 'Inactive');
        const isRejected = status === 'Rejected' || status === 'Inactive';

        let config = {
            label: status,
            colorClass: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
            dotClass: 'bg-slate-400'
        };

        if (isActive) {
            config = {
                label: 'Active',
                colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
                dotClass: 'bg-emerald-500',
                pulse: true
            };
        } else if (isPending) {
            config = {
                label: 'Pending Approval',
                colorClass: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
                dotClass: 'bg-amber-500',
                pulse: false
            };
        } else if (isRejected) {
            config = {
                label: status === 'Inactive' ? 'Inactive' : 'Rejected',
                colorClass: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
                dotClass: 'bg-rose-500'
            };
        }

        return (
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-tight shadow-sm ${config.colorClass}`}>
                <span className="relative flex h-1.5 w-1.5">
                    {config.pulse && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dotClass}`}></span>
                </span>
                {config.label}
            </div>
        );
    };

    const UserRoleBadge = ({ role }) => {
        const r = role?.toLowerCase() || 'user';
        let config = {
            label: role,
            icon: <FiUser size={10} />,
            colorClass: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
        };

        if (r === 'admin') {
            config = {
                label: 'Administrator',
                icon: <FiShield size={10} />,
                colorClass: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
            };
        } else if (r === 'manager') {
            config = {
                label: 'Manager',
                icon: <FiUsers size={10} />,
                colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
            };
        } else if (r === 'technician') {
            config = {
                label: 'Technician',
                icon: <FiZap size={10} />,
                colorClass: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
            };
        }

        return (
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold shadow-sm ${config.colorClass}`}>
                {config.icon}
                {config.label}
            </div>
        );
    };

    const renderPermissionBadges = (user) => {
        let perms = {};
        if (typeof user.permissions === 'string') {
            try { perms = JSON.parse(user.permissions); } catch (e) { }
        } else {
            perms = user.permissions || {};
        }

        const badges = [];
        if (user.role === 'admin') badges.push({ label: 'Admin', color: 'bg-rose-100 text-rose-600 border-rose-200' });
        if (perms.export_data) badges.push({ label: 'Export', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' });
        if (perms.ticket_edit) badges.push({ label: 'Edit Tkt', color: 'bg-blue-100 text-blue-600 border-blue-200' });

        return badges.map((b, i) => (
            <span key={i} className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${b.color}`}>
                {b.label}
            </span>
        ));
    };

    const formatLastActivity = (date) => {
        if (!date) return 'Never';
        const d = new Date(date);
        const now = new Date();
        const diff = (now - d) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return d.toLocaleDateString();
    };

    const renderColumnContent = (user, colId) => {
        switch (colId) {
            case 'full_name':
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs overflow-hidden">
                            {user.avatar_url ? (
                                <img src={user.avatar_url?.startsWith('http') ? user.avatar_url : `${baseURL}${user.avatar_url?.startsWith('/') ? '' : '/'}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                                (user.full_name || user.username).charAt(0).toUpperCase()
                            )}
                        </div>
                        <div>
                            <div className="font-medium text-slate-900 dark:text-white text-sm">{user.full_name || user.username}</div>
                            <div className="text-[10px] text-gray-400">@{user.username}</div>
                        </div>
                    </div>
                );
            case 'email':
                return <a href={`mailto:${user.email}`} className="text-sm text-gray-600 dark:text-slate-400 hover:text-indigo-600 underline-offset-4 hover:underline">{user.email}</a>;
            case 'role':
                return <UserRoleBadge role={user.role} />;
            case 'status':
                return (
                    <div className="flex items-center gap-4">
                        <UserStatusBadge user={user} />
                        {!user.is_approved && user.status !== 'Rejected' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleApproveUser(user); }}
                                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-100 px-2 py-1 rounded-md transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                <FiCheck size={12} /> Approve
                            </button>
                        )}
                    </div>
                );
            case 'reporting':
                return <span className="text-sm text-gray-600 dark:text-slate-400">{user.manager || '-'}</span>;
            case 'joined_date':
                return <span className="text-sm text-gray-500 dark:text-slate-400">{new Date(user.created_at).toLocaleDateString()}</span>;
            case 'last_activity':
                return <span className="text-sm text-gray-500 dark:text-slate-400">{formatLastActivity(user.last_activity_at)}</span>;
            case '2fa':
                return (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${user.is_2fa_enabled
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                        {user.is_2fa_enabled ? 'Active' : 'Off'}
                    </span>
                );
            case 'designation': return <span className="text-sm text-gray-600">{user.job_title || '-'}</span>;
            default:
                // Handle dynamic fields or fallback
                return <span className="text-sm text-gray-400">{user[colId] || '-'}</span>;
        }
    };

    const handleExport = () => {
        if (!canExport) {
            alert("You do not have permission to export data.");
            return;
        }

        const headers = ["ID", "Username", "Full Name", "Email", "Department", "Role", "Status", "Joined Date"];
        const csvContent = [
            headers.join(","),
            ...filteredUsers.map(u => [
                u.id,
                u.username,
                `"${u.full_name || ''}"`,
                u.email,
                u.department || '',
                u.role,
                u.status,
                u.created_at
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleResetPassword = (user) => {
        setUserForReset(user);
        setNewPass('');
        setResetSuccess(false);
        setShowResetModal(true);
    };

    const confirmReset = async () => {
        if (!newPass || newPass.length < 6) {
            alert("Password must be at least 6 characters long");
            return;
        }
        setResetLoading(true);
        try {
            await api.put(`/api/admin/users/${userForReset.id}/password`, {
                new_password: newPass,
                confirm_password: newPass
            });
            setResetSuccess(true);
            setTimeout(() => {
                setShowResetModal(false);
                setResetSuccess(false);
                setUserForReset(null);
            }, 2000);
        } catch (error) {
            console.error(error);
            alert("Failed to reset password");
        } finally {
            setResetLoading(false);
        }
    };

    const handleSendResetLink = async () => {
        if (!userForReset?.email) {
            alert("User does not have an email address configured");
            return;
        }
        setResetLoading(true);
        try {
            await api.post(`/api/admin/users/${userForReset.id}/reset-link`);
            setResetSuccess(true);
            setTimeout(() => {
                setShowResetModal(false);
                setResetSuccess(false);
                setUserForReset(null);
            }, 2000);
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.detail || "Failed to send reset link");
        } finally {
            setResetLoading(false);
        }
    };

    const handleToggleStatus = async (user) => {
        const newStatus = user.status === 'Inactive' ? 'Active' : 'Inactive';
        const action = user.status === 'Inactive' ? 'Activate' : 'Deactivate';

        if (window.confirm(`Are you sure you want to ${action.toLowerCase()} this account?`)) {
            try {
                await api.put(`/api/admin/users/${user.id}`, { status: newStatus });
                fetchUsers();
            } catch (error) {
                console.error(error);
                alert(`Failed to ${action.toLowerCase()} user`);
            }
        }
    };

    const handleApproveUser = (user) => {
        setUserToApprove(user);
        setApproveRole(user.role || 'user');
        setShowApproveModal(true);
    };

    const confirmApprove = async () => {
        if (!userToApprove) return;
        setApproveLoading(true);
        try {
            await api.put(`/api/admin/users/${userToApprove.id}/approve`, null, {
                params: { role: approveRole }
            });
            setShowApproveModal(false);
            setUserToApprove(null);
            fetchUsers();
        } catch (error) {
            console.error(error);
            alert("Failed to approve user");
        } finally {
            setApproveLoading(false);
        }
    };

    // Reusable Action Menu Component
    const UserActionMenu = ({ user: targetUser, onEdit, onView, onReset, onDeactivate, onDelete, onApprove }) => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <div className="relative inline-block text-left">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                    <FiMoreHorizontal size={18} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-[70] overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-800 mb-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User options</p>
                                </div>
                                {!targetUser.is_approved && targetUser.status !== 'Rejected' && (
                                    <button
                                        onClick={() => { onApprove(); setIsOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                                    >
                                        <FiCheckCircle size={16} /> Approve User
                                    </button>
                                )}
                                <button
                                    onClick={() => { onView(); setIsOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 transition-all"
                                >
                                    <FiEye size={16} className="text-slate-400" /> View Profile
                                </button>
                                {canEditUsers && (
                                    <>
                                        <button
                                            onClick={() => { onEdit(); setIsOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 transition-all"
                                        >
                                            <FiEdit2 size={16} className="text-slate-400" /> Edit Profile
                                        </button>
                                        <button
                                            onClick={() => { onReset(); setIsOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 transition-all"
                                        >
                                            <FiLock size={16} className="text-slate-400" /> Reset Password
                                        </button>
                                        <div className="h-px bg-slate-50 dark:bg-slate-800 my-1" />
                                        <button
                                            onClick={() => { onDeactivate(); setIsOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all ${targetUser.status === 'Inactive' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                                        >
                                            <FiPower size={16} /> {targetUser.status === 'Inactive' ? 'Activate Account' : 'Deactivate Account'}
                                        </button>
                                        <button
                                            onClick={() => { onDelete(); setIsOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all"
                                        >
                                            <FiTrash2 size={16} /> Delete Permanently
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    // ... (rest of the file until return statement) ...
    // Note: I will need to match the replacement chunk correctly.


    // Filtering logic
    const filteredUsers = allUsers.filter(user => {
        const matchesSearch = (user.full_name || user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = (user.is_approved === true && (!user.status || user.status === 'Active'));
        if (statusFilter === 'pending') matchesStatus = (user.is_approved === false && user.status !== 'Rejected') || user.status === 'Pending';
        if (statusFilter === 'inactive') matchesStatus = user.status === 'Rejected';

        let matches2FA = true;
        if (twoFAFilter === 'enabled') matches2FA = user.is_2fa_enabled;
        if (twoFAFilter === 'disabled') matches2FA = !user.is_2fa_enabled;

        return matchesSearch && matchesRole && matchesStatus && matches2FA;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Date formatter
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">


            {/* Statistics Cards */}
            <div className="px-8 py-6 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Users Card */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-lg transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total users</p>
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiUser size={20} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{allUsers.length}</h2>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        +{allUsers.length > 0 ? Math.round((allUsers.filter(u => {
                                            const createdDate = new Date(u.created_at);
                                            const lastMonth = new Date();
                                            lastMonth.setMonth(lastMonth.getMonth() - 1);
                                            return createdDate > lastMonth;
                                        }).length / allUsers.length) * 100) : 0}%
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">vs last month</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* New Users Card */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-lg transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">New users</p>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiPlus size={20} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                                    {(() => {
                                        const lastMonth = new Date();
                                        lastMonth.setMonth(lastMonth.getMonth() - 1);
                                        return allUsers.filter(u => new Date(u.created_at) > lastMonth).length;
                                    })()}
                                </h2>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        +{(() => {
                                            const lastMonth = new Date();
                                            lastMonth.setMonth(lastMonth.getMonth() - 1);
                                            const twoMonthsAgo = new Date();
                                            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
                                            const currentMonthNew = allUsers.filter(u => new Date(u.created_at) > lastMonth).length;
                                            const prevMonthNew = allUsers.filter(u => {
                                                const d = new Date(u.created_at);
                                                return d > twoMonthsAgo && d <= lastMonth;
                                            }).length;
                                            return prevMonthNew > 0 ? Math.round(((currentMonthNew - prevMonthNew) / prevMonthNew) * 100) : 100;
                                        })()}%
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">vs last month</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Users Card */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-lg transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Active users</p>
                            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiCheckCircle size={20} className="text-sky-600 dark:text-sky-400" />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                                    {allUsers.filter(u => u.is_approved && (!u.status || u.status === 'Active')).length}
                                </h2>
                                {(() => {
                                    const activeUsers = allUsers.filter(u => u.is_approved && (!u.status || u.status === 'Active'));
                                    const lastMonth = new Date();
                                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                                    const twoMonthsAgo = new Date();
                                    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

                                    const currentMonthNewActive = activeUsers.filter(u => new Date(u.created_at) > lastMonth).length;
                                    const prevMonthNewActive = activeUsers.filter(u => {
                                        const d = new Date(u.created_at);
                                        return d > twoMonthsAgo && d <= lastMonth;
                                    }).length;

                                    const growth = prevMonthNewActive > 0
                                        ? Math.round(((currentMonthNewActive - prevMonthNewActive) / prevMonthNewActive) * 100)
                                        : (currentMonthNewActive > 0 ? 100 : 0);

                                    const isNegative = growth < 0;

                                    return (
                                        <span className={`text-xs font-semibold ${isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {isNegative ? '' : '+'}{growth}%
                                        </span>
                                    );
                                })()}
                                <span className="text-xs text-gray-500 dark:text-slate-400">vs last month</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar Section */}
            <div className="px-8 py-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center z-20">

                {/* View Tabs */}
                <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
                    >
                        <FiList size={14} className="rotate-0" /> Table
                    </button>
                    <button
                        onClick={() => setViewMode('board')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
                    >
                        <FiGrid size={14} /> Board
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'}`}
                    >
                        <FiLayout size={14} /> List
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group/search flex-1 md:w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowCustomizeMenu(!showCustomizeMenu)}
                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <FiSliders size={16} /> <span className="hidden sm:inline">Customize</span>
                        </button>

                        {showCustomizeMenu && (
                            <>
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700 py-2 z-30 max-h-[300px] overflow-y-auto">
                                    <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Visible columns</p>
                                    </div>
                                    {tableColumns.map((col) => (
                                        <label key={col.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns.includes(col.id)}
                                                onChange={() => {
                                                    setVisibleColumns(prev =>
                                                        prev.includes(col.id)
                                                            ? prev.filter(c => c !== col.id)
                                                            : [...prev, col.id]
                                                    );
                                                }}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-slate-300">{col.label}</span>
                                        </label>
                                    ))}
                                    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                                        <p className="text-[10px] font-bold text-gray-400 mb-2">Manual add column</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Column Title"
                                                value={newColumnLabel}
                                                onChange={(e) => setNewColumnLabel(e.target.value)}
                                                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomColumn()}
                                            />
                                            <button
                                                onClick={handleAddCustomColumn}
                                                className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                                            >
                                                <FiPlus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="fixed inset-0 z-20" onClick={() => setShowCustomizeMenu(false)}></div>
                            </>
                        )}
                    </div>

                    {canExport && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <FiDownload size={16} /> <span className="hidden sm:inline">Export</span>
                        </button>
                    )}

                    {canEditUsers && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none transition-all"
                        >
                            <FiPlus size={16} /> Add User
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="px-8 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-800 flex items-center gap-3 text-sm flex-wrap z-0">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500">Role:</span>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-transparent font-medium text-gray-700 dark:text-slate-300 outline-none cursor-pointer border-none focus:ring-0 p-0"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="technician">Technician</option>
                        <option value="user">User</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 ml-4">
                    <span className="text-gray-500">Status:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent font-medium text-gray-700 dark:text-slate-300 outline-none cursor-pointer border-none focus:ring-0 p-0"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 ml-4">
                    <span className="text-gray-500">2FA:</span>
                    <select
                        value={twoFAFilter}
                        onChange={(e) => setTwoFAFilter(e.target.value)}
                        className="bg-transparent font-medium text-gray-700 dark:text-slate-300 outline-none cursor-pointer border-none focus:ring-0 p-0"
                    >
                        <option value="all">All</option>
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                    </select>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 p-6">

                {viewMode === 'table' && (
                    <div className="w-full overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800/50 z-10">
                                <tr className="whitespace-nowrap">
                                    <th className="px-2 py-4 border-b border-gray-200 dark:border-slate-800 w-10">
                                        <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                    </th>
                                    {visibleColumns.map(colId => {
                                        const col = tableColumns.find(c => c.id === colId);
                                        return (
                                            <th key={colId} className="px-2 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">
                                                {col ? col.label : colId}
                                            </th>
                                        );
                                    })}
                                    <th className="px-2 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-slate-800 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={visibleColumns.length + 2} className="p-8 text-center text-gray-500">Loading users...</td></tr>
                                ) : paginatedUsers.length === 0 ? (
                                    <tr><td colSpan={visibleColumns.length + 2} className="p-8 text-center text-gray-500">No users found</td></tr>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group whitespace-nowrap">
                                            <td className="px-3 py-4 w-10">
                                                <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                            </td>

                                            {visibleColumns.map(colId => (
                                                <td key={colId} className="px-3 py-4">
                                                    {renderColumnContent(user, colId)}
                                                </td>
                                            ))}

                                            <td className="px-3 py-4 text-right">
                                                <UserActionMenu
                                                    user={user}
                                                    onView={() => navigate(`/admin/user-profile/${user.id}`)}
                                                    onEdit={() => navigate(`/admin/edit-user/${user.id}`)}
                                                    onReset={() => handleResetPassword(user)}
                                                    onDeactivate={() => handleToggleStatus(user)}
                                                    onDelete={() => handleDeleteUser(user)}
                                                    onApprove={() => handleApproveUser(user)}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {loading ? (
                            <div className="col-span-full p-20 text-center text-gray-500">Loading users...</div>
                        ) : paginatedUsers.map(user => (
                            <div key={user.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-lg transition-all group relative">
                                <div className="absolute top-4 right-4">
                                    <UserStatusBadge user={user} />
                                </div>
                                <div className="flex flex-col items-center text-center mt-2">
                                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-2xl mb-3">
                                        {user.avatar_url ? (
                                            <img src={`${baseURL}${user.avatar_url}`} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            user.username.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{user.full_name || user.username}</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{user.email}</p>

                                    <div className="flex gap-2 mb-6 flex-wrap justify-center">
                                        <UserRoleBadge role={user.role} />
                                    </div>

                                    <div className="w-full mt-auto flex justify-center">
                                        <UserActionMenu
                                            user={user}
                                            onView={() => navigate(`/admin/user-profile/${user.id}`)}
                                            onEdit={() => navigate(`/admin/edit-user/${user.id}`)}
                                            onReset={() => handleResetPassword(user)}
                                            onDeactivate={() => handleToggleStatus(user)}
                                            onDelete={() => handleDeleteUser(user)}
                                            onApprove={() => handleApproveUser(user)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {viewMode === 'board' && (
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center p-20 text-gray-500">Loading users...</div>
                        ) : paginatedUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                        {user.avatar_url ? (
                                            <img src={`${baseURL}${user.avatar_url}`} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            user.username.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{user.full_name || user.username}</h4>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-sm text-gray-600 dark:text-slate-300 capitalize min-w-[80px]">{user.role}</div>
                                    <div className="min-w-[100px]">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${(user.is_approved && (!user.status || user.status === 'Active'))
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                            : user.status === 'Rejected'
                                                ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                                                : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${(user.is_approved && (!user.status || user.status === 'Active')) ? 'bg-emerald-500' : user.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500'
                                                }`}></span>
                                            {user.status === 'Pending' || (!user.status && !user.is_approved) ? 'Waiting for Admin Approval' : (user.status || 'Active')}
                                        </span>
                                    </div>
                                    <UserActionMenu
                                        user={user}
                                        onView={() => navigate(`/admin/user-profile/${user.id}`)}
                                        onEdit={() => navigate(`/admin/edit-user/${user.id}`)}
                                        onReset={() => handleResetPassword(user)}
                                        onDeactivate={() => handleToggleStatus(user)}
                                        onDelete={() => handleDeleteUser(user)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* Pagination */}
            <div className="px-8 py-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-slate-400">
                    Rows per page:
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="ml-2 bg-transparent border-none font-medium focus:ring-0 cursor-pointer"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                        {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} rows
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            ←
                        </button>
                        {[...Array(Math.min(5, totalPages))].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-8 h-8 rounded text-sm font-medium ${currentPage === i + 1 ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        {totalPages > 5 && <span className="text-gray-400">...</span>}
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                            →
                        </button>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <AddUserModal onClose={() => setShowAddModal(false)} onUserAdded={fetchUsers} />
                )}
            </AnimatePresence>

            {/* Detail View Overlay */}
            <AnimatePresence>
                {selectedUserId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-[1500px] h-full max-h-[95vh] bg-white rounded-[3rem] shadow-[0_25px_70px_rgba(0,0,0,0.15)] overflow-hidden"
                        >
                            <UserDetailView
                                userId={selectedUserId}
                                onClose={() => setSelectedUserId(null)}
                                onUpdate={() => {
                                    fetchUsers();
                                }}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            <div className="p-8">
                                {deleteSuccess ? (
                                    <div className="py-8 text-center">
                                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FiCheck size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Deleted!</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                                            User has been successfully removed from the system.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-6">
                                            <FiTrash2 size={28} />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Delete User?</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
                                            Are you sure you want to delete <span className="text-slate-900 dark:text-white font-bold">{userToDelete?.full_name || userToDelete?.username}</span>? This action cannot be undone.
                                        </p>

                                        {deleteError && (
                                            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2">
                                                <FiShield className="mt-0.5 flex-shrink-0" />
                                                <span>{deleteError}</span>
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                disabled={deleteLoading}
                                                className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmDelete}
                                                disabled={deleteLoading}
                                                className="flex-2 py-4 px-10 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {deleteLoading ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    'Delete User'
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Password Reset Modal */}
            <AnimatePresence>
                {showResetModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            <div className="p-8">
                                {resetSuccess ? (
                                    <div className="py-8 text-center" key="success">
                                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FiCheckCircle size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Updated!</h3>
                                        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                            Credentials synchronized successfully.
                                        </p>
                                    </div>
                                ) : (
                                    <div key="form">
                                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-6">
                                            <FiLock size={28} />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Reset Security Key</h3>
                                        <p className="text-xs text-slate-400 font-bold mb-8 uppercase tracking-widest">
                                            Updating access for <span className="text-slate-900 dark:text-white">{userForReset?.full_name || userForReset?.username}</span>
                                        </p>

                                        <div className="space-y-6 mb-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New access password</label>
                                                <input
                                                    type="password"
                                                    value={newPass}
                                                    onChange={e => setNewPass(e.target.value)}
                                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-transparent rounded-2xl focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500/20 outline-none font-bold text-slate-900 dark:text-white transition-all text-sm"
                                                    placeholder="Minimum 6 characters"
                                                />
                                            </div>

                                            <div className="flex items-center gap-4 py-2">
                                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or</span>
                                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                            </div>

                                            <button
                                                onClick={handleSendResetLink}
                                                disabled={resetLoading}
                                                className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-indigo-100/50 dark:border-indigo-500/10 group"
                                            >
                                                <FiMail size={16} className="group-hover:scale-110 transition-transform" />
                                                Send reset link via email
                                            </button>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowResetModal(false)}
                                                disabled={resetLoading}
                                                className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
                                            >
                                                Abort
                                            </button>
                                            <button
                                                onClick={confirmReset}
                                                disabled={resetLoading || !newPass}
                                                className="flex-2 py-4 px-10 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {resetLoading ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    'Update access'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
                {/* Approval Modal */}
                {showApproveModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            <div className="p-8 text-center text-slate-300">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <FiCheckCircle size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Approve Access</h3>
                                <p className="text-xs text-slate-400 font-bold mb-8 uppercase tracking-widest whitespace-normal">
                                    Assign a core role for <span className="text-slate-900 dark:text-white">{userToApprove?.full_name || userToApprove?.username}</span>
                                </p>

                                <div className="space-y-4 mb-8 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Access Role</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['user', 'technician', 'manager', 'admin'].map((role) => (
                                            <button
                                                key={role}
                                                onClick={() => setApproveRole(role)}
                                                className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${approveRole === role
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20'
                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-emerald-500/30'
                                                    }`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowApproveModal(false)}
                                        className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={confirmApprove}
                                        disabled={approveLoading}
                                        className="flex-1 py-4 px-6 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {approveLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Grant Access'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserManagementView;
