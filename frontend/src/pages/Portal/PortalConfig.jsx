import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { motion } from 'framer-motion';
import { FiLayout, FiCheckCircle, FiXCircle, FiShield, FiSave, FiInfo } from 'react-icons/fi';

const PortalConfig = () => {
    const [settings, setSettings] = useState({
        portal_active: 'true',
        portal_allowed_roles: 'public,user,technician,manager,admin'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const roles = [
        { id: 'public', label: 'Unauthenticated (Public)' },
        { id: 'user', label: 'Standard Users' },
        { id: 'technician', label: 'Technicians' },
        { id: 'manager', label: 'Managers' },
        { id: 'admin', label: 'Administrators' }
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/api/system/config');
            const portalActive = res.data.find(s => s.key === 'portal_active');
            const portalRoles = res.data.find(s => s.key === 'portal_allowed_roles');

            if (portalActive || portalRoles) {
                setSettings({
                    portal_active: portalActive?.value || 'true',
                    portal_allowed_roles: portalRoles?.value || 'public,user,technician,manager,admin'
                });
            }
        } catch (error) {
            console.error("Failed to fetch portal settings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async () => {
        const newValue = settings.portal_active === 'true' ? 'false' : 'true';
        setSettings({ ...settings, portal_active: newValue });
    };

    const handleToggleRole = (roleId) => {
        let allowed = settings.portal_allowed_roles.split(',').filter(r => r);
        if (allowed.includes(roleId)) {
            allowed = allowed.filter(r => r !== roleId);
        } else {
            allowed.push(roleId);
        }
        setSettings({ ...settings, portal_allowed_roles: allowed.join(',') });
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await Promise.all([
                api.put(`/api/system/config/portal_active`, { value: settings.portal_active }),
                api.put(`/api/system/config/portal_allowed_roles`, { value: settings.portal_allowed_roles })
            ]);
            setMessage({ type: 'success', text: 'Portal settings updated successfully!' });
        } catch (error) {
            console.error("Failed to save settings", error);
            setMessage({ type: 'error', text: 'Failed to update portal settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading settings...</div>;

    return (
        <div className="p-4 md:p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <FiLayout className="text-indigo-600" />
                    Self-Service Portal Configuration
                </h1>
                <p className="text-slate-500 text-sm mt-1">Control who can see and use the Customer Self-Service Portal.</p>
            </div>

            <div className="space-y-6">
                {/* Master Switch */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${settings.portal_active === 'true' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {settings.portal_active === 'true' ? <FiCheckCircle size={24} /> : <FiXCircle size={24} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Portal Status</h3>
                            <p className="text-sm text-slate-500">Enable or disable the entire portal application.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleActive}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ring-transparent focus:ring-indigo-500 ${settings.portal_active === 'true' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${settings.portal_active === 'true' ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </motion.div>

                {/* Role Permissions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
                >
                    <div className="mb-6 flex items-center gap-3">
                        <FiShield className="text-indigo-600" />
                        <h3 className="font-bold text-slate-800">Access Control</h3>
                    </div>

                    <div className="grid gap-3">
                        {roles.map(role => (
                            <label
                                key={role.id}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${settings.portal_allowed_roles.split(',').includes(role.id) ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-50 hover:border-slate-100'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                        checked={settings.portal_allowed_roles.split(',').includes(role.id)}
                                        onChange={() => handleToggleRole(role.id)}
                                    />
                                    <span className={`font-bold ${settings.portal_allowed_roles.split(',').includes(role.id) ? 'text-indigo-900' : 'text-slate-600'}`}>
                                        {role.label}
                                    </span>
                                </div>
                                {role.id === 'public' && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-600">
                                        <FiInfo size={10} />
                                        Visible to everyone
                                    </div>
                                )}
                            </label>
                        ))}
                    </div>

                    <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 leading-relaxed italic">
                        Users who do not have access will be redirected or shown a "Permission Denied" message if they attempt to visit the portal pages.
                    </div>
                </motion.div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-4">
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`text-sm font-bold ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                            {message.text}
                        </motion.div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
                    >
                        {saving ? 'Saving...' : <><FiSave /> Save Configuration</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PortalConfig;
