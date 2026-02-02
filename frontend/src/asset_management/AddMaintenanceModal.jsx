import React, { useState } from 'react';
import { FiX, FiTool, FiDollarSign, FiCalendar, FiCheckSquare } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';

const AddMaintenanceModal = ({ isOpen, onClose, asset, onMaintenanceAdded }) => {
    const [formData, setFormData] = useState({
        type: 'Repair',
        description: '',
        cost: '',
        performed_by: '', // External vendor or internal tech name
        maintenance_date: new Date().toISOString().split('T')[0],
        next_maintenance_date: '',
        status: 'Completed'
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/api/assets/${asset.id}/maintenance`, formData);
            onMaintenanceAdded();
            onClose();
            // Reset form
            setFormData({
                type: 'Repair',
                description: '',
                cost: '',
                performed_by: '',
                maintenance_date: new Date().toISOString().split('T')[0],
                next_maintenance_date: '',
                status: 'Completed'
            });
        } catch (error) {
            console.error("Failed to add maintenance record", error);
            alert("Failed to save. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FiTool className="text-indigo-600" /> Log Maintenance
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Maintenance Type</label>
                                <select
                                    name="type"
                                    value={formData.type} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                >
                                    <option>Repair</option>
                                    <option>Upgrade</option>
                                    <option>Preventive Maintenance</option>
                                    <option>Inspection</option>
                                    <option>Software Update</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                <textarea
                                    name="description" required
                                    value={formData.description} onChange={handleChange}
                                    rows="3"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                                    placeholder="Details about the work done..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                                    <div className="relative">
                                        <FiCalendar className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="maintenance_date" type="date" required
                                            value={formData.maintenance_date} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Cost</label>
                                    <div className="relative">
                                        <FiDollarSign className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="cost" type="number" step="0.01"
                                            value={formData.cost} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Performed By (Vendor/Tech)</label>
                                <input
                                    name="performed_by"
                                    value={formData.performed_by} onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    placeholder="e.g. Apple Genius Bar, Internal IT"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    >
                                        <option>Completed</option>
                                        <option>In Progress</option>
                                        <option>Scheduled</option>
                                        <option>Pending Parts</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Next Maintenance Due</label>
                                    <input
                                        name="next_maintenance_date" type="date"
                                        value={formData.next_maintenance_date} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                                >
                                    {loading ? 'Saving...' : <><FiCheckSquare /> Log Record</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddMaintenanceModal;
