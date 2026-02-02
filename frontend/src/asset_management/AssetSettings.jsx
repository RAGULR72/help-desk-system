import React, { useState, useEffect } from 'react';
import { FiToggleLeft, FiToggleRight, FiSave, FiUser, FiCheckCircle, FiShield, FiBriefcase } from 'react-icons/fi';
import api from '../api/axios';

const AssetSettings = () => {
    const [globalActive, setGlobalActive] = useState(true);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
        fetchUsers();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/api/system/config');
            const setting = res.data.find(s => s.key === 'asset_management_active');
            if (setting) {
                setGlobalActive(setting.value === 'true');
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/admin/users');
            // Filter for relevant roles
            const managingRoles = ['technician', 'manager'];
            setUsers(res.data.filter(u => managingRoles.includes(u.role)));
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleGlobal = async () => {
        const newValue = !globalActive;
        setGlobalActive(newValue);
        try {
            await api.put('/api/system/config/asset_management_active', { value: newValue.toString() });
            showMessage("Global setting updated!", "success");
        } catch (error) {
            setGlobalActive(!newValue); // Revert
            showMessage("Failed to update setting.", "error");
        }
    };

    const handlePermissionChange = (userId, companiesString) => {
        // Convert comma separated string to list
        const companies = companiesString.split(',').map(s => s.trim()).filter(Boolean);

        setUsers(users.map(u => {
            if (u.id === userId) {
                // Update local state deep copy
                const newPerms = { ...(u.permissions || {}), allowed_asset_companies: companies };
                return { ...u, permissions: newPerms };
            }
            return u;
        }));
    };

    const saveUserPermissions = async (user) => {
        try {
            await api.put(`/api/admin/users/${user.id}`, {
                permissions: user.permissions || {}
            });
            showMessage(`Permissions saved for ${user.username}`, "success");
        } catch (error) {
            console.error(error);
            showMessage("Failed to save permissions", "error");
        }
    };

    const showMessage = (msg, type) => {
        setMessage({ text: msg, type });
        setTimeout(() => setMessage(''), 3000);
    };

    const getCompaniesString = (user) => {
        if (!user.permissions || !user.permissions.allowed_asset_companies) return '';
        return user.permissions.allowed_asset_companies.join(', ');
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto p-4">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-gray-900">Asset Management Settings</h2>
                <p className="text-gray-500 mt-1">Configure visibility and access controls for the asset module.</p>
            </div>

            {/* Global Toggle */}
            <div className={`p-6 rounded-2xl border transition-all ${globalActive ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                        <div className={`p-3 rounded-xl ${globalActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                            <FiShield size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Asset Management Module</h3>
                            <p className="text-sm text-gray-600 max-w-xl">
                                {globalActive
                                    ? "Active. Authorized technicians and managers can access the module based on their permissions."
                                    : "Disabled. The asset module is hidden for everyone except Administrators."}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={toggleGlobal}
                        className={`text-4xl transition-colors ${globalActive ? 'text-indigo-600' : 'text-gray-300'}`}
                    >
                        {globalActive ? <FiToggleRight /> : <FiToggleLeft />}
                    </button>
                </div>
            </div>

            {/* User Permissions */}
            {globalActive && (
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            User Access Control
                        </h3>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase w-1/2">
                                        <div className="flex items-center gap-2">
                                            <FiBriefcase /> Allowed Companies (Comma Separated)
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="4" className="p-8 text-center text-gray-400">Loading users...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan="4" className="p-8 text-center text-gray-400">No managers or technicians found.</td></tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{user.username}</p>
                                                        <p className="text-gray-500 text-xs">{user.full_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold uppercase text-gray-600">{user.role}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    value={getCompaniesString(user)}
                                                    onChange={(e) => handlePermissionChange(user.id, e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                    placeholder="e.g. Sales, Client A, Internal (Leave empty for NO ACCESS)"
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1">If allowed list is empty, user sees NOTHING.</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => saveUserPermissions(user)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Save Permissions"
                                                >
                                                    <FiSave size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {message && (
                <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg text-white font-bold animate-bounce ${message.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default AssetSettings;
