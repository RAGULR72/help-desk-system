import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiLock } from 'react-icons/fi';
import api from '../../api/axios';
import { useTranslation } from '../../context/TranslationContext';
import { motion, AnimatePresence } from 'framer-motion';

const AddUserModal = ({ onClose, onUserAdded }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        company: '',
        address: '',
        location: '',
        department: 'IT',
        role: 'user',
        position: 'L1',
        work_location: 'Office',
        manager: '',
        job_title: '',
        must_change_password: true,
        is_2fa_enabled: true
    });
    const [potentialManagers, setPotentialManagers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Handle Escape Key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        fetchPotentialManagers();
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const fetchPotentialManagers = async () => {
        try {
            const res = await api.get('/api/admin/users');
            const adminsAndManagers = res.data.filter(u => u.role === 'admin' || u.role === 'manager');
            setPotentialManagers(adminsAndManagers);
        } catch (err) {
            console.error("Failed to fetch potential managers", err);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        const isInternal = formData.role !== 'user';
        const submissionData = {
            ...formData,
            full_name: `${formData.first_name} ${formData.last_name}`.trim(),
            username: formData.username || formData.email.split('@')[0],
            company: isInternal ? 'Internal HQ' : formData.company,
            address: isInternal ? 'Internal' : formData.address,
            location: formData.location || (isInternal ? 'HQ' : ''),
            job_title: formData.job_title
        };

        try {
            await api.post('/api/admin/users', submissionData);
            setSuccess(true);
            setTimeout(() => {
                onUserAdded();
                if (onClose) onClose();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: 'admin', title: 'Admin', desc: 'Can invite, configure, and manage.' },
        { id: 'manager', title: 'Manager', desc: 'Can manage teams and approvals.' },
        { id: 'technician', title: 'Technician', desc: 'Can handle field tickets and tasks.' },
        { id: 'user', title: 'User', desc: 'Can submit and track tickets.' }
    ];

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-[999]"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden relative z-[1000]"
            >
                {/* Header */}
                <div className="px-8 pt-10 pb-4 flex justify-between items-start border-b border-gray-50">
                    <div className="pr-10 text-left">
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Add member</h3>
                        <p className="text-[14px] text-gray-500 mt-1">Invite new member to the team.</p>
                    </div>
                    {/* Standard Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all active:scale-95"
                    >
                        <FiX size={22} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="px-8 py-6 max-h-[70vh] overflow-y-auto custom-scrollbar-minimal">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[13px] font-bold text-left">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                                <FiCheck size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900">Successfully Added</h4>
                            <p className="text-gray-500 mt-2">Team member added successfully.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8 pb-4">
                            {/* Names Row (Blank - No Placeholders) */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-[13px] font-bold text-gray-800">First name</label>
                                    <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-[14px] outline-none transition-all placeholder:text-transparent" />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[13px] font-bold text-gray-800">Last name</label>
                                    <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black text-[14px] outline-none transition-all placeholder:text-transparent" />
                                </div>
                            </div>

                            {/* Email and Mobile */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-[13px] font-bold text-gray-800">Email</label>
                                    <input required type="email" placeholder="name@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black text-[14px] outline-none transition-all placeholder:text-gray-300" />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[13px] font-bold text-gray-800">Mobile Number</label>
                                    <input required type="text" placeholder="+91 00000 00000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black text-[14px] outline-none transition-all placeholder:text-gray-300" />
                                </div>
                            </div>

                            {/* Designation, Employee ID, and Department */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-[13px] font-bold text-gray-800">Designation</label>
                                    <input type="text" placeholder="Software Engineer" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black text-[14px] outline-none transition-all placeholder:text-gray-300" />
                                </div>
                                <div className="space-y-2 text-left md:col-span-1">
                                    <label className="text-[13px] font-bold text-gray-800">Department</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black text-[14px] outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="IT">IT</option>
                                        <option value="IT-Support">IT-Support</option>
                                        <option value="HR">HR</option>
                                        <option value="Accounts">Accounts</option>
                                    </select>
                                </div>
                            </div>

                            {/* Password and Security */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-2 text-left">
                                    <label className="text-[13px] font-bold text-gray-800">Assign Password</label>
                                    <div className="relative">
                                        <input required type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black text-[14px] outline-none transition-all placeholder:text-gray-300" />
                                        <FiLock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 h-[52px]">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, must_change_password: !formData.must_change_password })}
                                        className={`w-11 h-6 rounded-full relative transition-all duration-200 ${formData.must_change_password ? 'bg-black' : 'bg-gray-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${formData.must_change_password ? 'left-6' : 'left-1'}`} />
                                    </button>
                                    <span className="text-[13px] font-bold text-gray-700">Force password change</span>
                                </div>
                            </div>

                            {/* Reporting To */}
                            <div className="space-y-2 text-left">
                                <label className="text-[13px] font-bold text-gray-800">Reporting To (Manager/Admin)</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        list="manager-list"
                                        placeholder="Select a manager or type custom..."
                                        value={formData.manager}
                                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black text-[14px] outline-none transition-all placeholder:text-gray-300"
                                    />
                                    <datalist id="manager-list">
                                        {potentialManagers
                                            .filter(m => !formData.company || m.company === formData.company)
                                            .map(m => (
                                                <option key={m.id} value={m.full_name || m.username}>
                                                    {m.role === 'admin' ? 'Admin' : 'Manager'} ({m.company})
                                                </option>
                                            ))}
                                    </datalist>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform group-focus-within:rotate-180">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-400 font-medium">Choose from the list or type a custom reporting person.</p>
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-4">
                                <label className="text-[13px] font-bold text-gray-800 uppercase tracking-widest block text-left">Select Role</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {roles.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: r.id })}
                                            className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all text-left ${formData.role === r.id
                                                ? 'border-black bg-gray-50'
                                                : 'border-gray-100 bg-white hover:border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.role === r.id ? 'border-black' : 'border-gray-300'}`}>
                                                    {formData.role === r.id && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                                                </div>
                                                <span className="text-[14px] font-bold text-gray-900 uppercase">{r.title}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 font-medium pl-8">{r.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conditional Role Logic */}
                            <AnimatePresence mode="wait">
                                {formData.role === 'technician' && (
                                    <motion.div key="tech-fields" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 pt-4 border-t border-gray-100 text-left">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Technician Level</label>
                                        <div className="flex gap-3">
                                            {['L1', 'L2', 'L3'].map(p => (
                                                <button key={p} type="button" onClick={() => setFormData({ ...formData, position: p })}
                                                    className={`flex-1 py-3 text-[12px] font-bold rounded-xl border-2 transition-all ${formData.position === p ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200 text-gray-400'}`}>
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {formData.role !== 'user' && ( // Admin/Manager/Tech
                                    <motion.div key="internal-fields" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 pt-4 border-t border-gray-100 text-left">
                                        {/* Admin stuff if needed, simplified for now or nothing */}
                                    </motion.div>
                                )}

                                {formData.role === 'user' && (
                                    <motion.div key="user-fields" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 pt-4 border-t border-gray-100 overflow-hidden text-left">

                                        <div className="space-y-3">
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Work Location</label>
                                            <div className="flex gap-3">
                                                {['Office', 'Site', 'Remote'].map(loc => (
                                                    <button key={loc} type="button" onClick={() => setFormData({ ...formData, work_location: loc })}
                                                        className={`flex-1 py-3 text-[12px] font-bold rounded-xl border-2 transition-all ${formData.work_location === loc ? 'border-black bg-black text-white' : 'border-gray-100 bg-white hover:border-gray-200 text-gray-400'}`}>
                                                        {loc}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-gray-800">Office Address</label>
                                            <textarea required rows="2" placeholder="Street, City, ZIP..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-black text-[14px] resize-none" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    )}
                </div>

                {/* Footer Toolbar */}
                {!success && (
                    <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 text-[14px] font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-all active:scale-95 px-12"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-10 py-3 text-[14px] font-bold bg-black text-white hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 shadow-md active:scale-95 px-12"
                        >
                            {loading ? 'Adding...' : 'Add member'}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default AddUserModal;
