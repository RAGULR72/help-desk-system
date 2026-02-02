import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiMonitor, FiTag, FiDollarSign, FiCalendar, FiMapPin, FiCpu } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';

const AddAssetModal = ({ isOpen, onClose, onAssetAdded, initialData = null }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: 'Laptop',
        model: '',
        manufacturer: '',
        tag_number: '',
        serial_number: '',
        purchase_date: '',
        purchase_cost: '',
        vendor: '',
        warranty_expiry: '',
        status: 'Available',
        location: '',
        company_name: '',
        specs: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                purchase_date: initialData.purchase_date ? initialData.purchase_date.split('T')[0] : '',
                warranty_expiry: initialData.warranty_expiry ? initialData.warranty_expiry.split('T')[0] : ''
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData) {
                await api.put(`/api/assets/${initialData.id}`, formData);
            } else {
                await api.post('/api/assets/', formData);
            }
            onAssetAdded();
            onClose();
        } catch (error) {
            console.error("Failed to save asset", error);
            alert("Failed to save asset. Please check the Asset Tag (must be unique).");
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
                        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900">
                                {initialData ? 'Edit Asset' : 'Add New Asset'}
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Asset Name</label>
                                    <div className="relative">
                                        <FiMonitor className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="name" required
                                            value={formData.name} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            placeholder="e.g. MacBook Pro M1"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                    <select
                                        name="category"
                                        value={formData.category} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    >
                                        <option>Laptop</option>
                                        <option>Desktop</option>
                                        <option>Monitor</option>
                                        <option>Networking</option>
                                        <option>Printer</option>
                                        <option>Peripheral</option>
                                        <option>Server</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Manufacturer</label>
                                    <input
                                        name="manufacturer"
                                        value={formData.manufacturer} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        placeholder="e.g. Apple, Dell"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Model</label>
                                    <input
                                        name="model"
                                        value={formData.model} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        placeholder="e.g. A2338"
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Identification */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Asset Tag ID (Unique)</label>
                                    <div className="relative">
                                        <FiTag className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="tag_number" required
                                            value={formData.tag_number} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                                            placeholder="e.g. AST-001"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Serial Number</label>
                                    <div className="relative">
                                        <FiCpu className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="serial_number"
                                            value={formData.serial_number} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                                            placeholder="e.g. C02D..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Financial & Lifecycle */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Purchase Cost</label>
                                    <div className="relative">
                                        <FiDollarSign className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="purchase_cost" type="number"
                                            value={formData.purchase_cost} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Purchase Date</label>
                                    <div className="relative">
                                        <FiCalendar className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="purchase_date" type="date"
                                            value={formData.purchase_date} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Warranty Expiry</label>
                                    <div className="relative">
                                        <FiCalendar className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="warranty_expiry" type="date"
                                            value={formData.warranty_expiry} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Location & Company */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
                                    <div className="relative">
                                        <FiMapPin className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="location"
                                            value={formData.location} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            placeholder="e.g. HQ - Server Room"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Company / Department</label>
                                    <input
                                        name="company_name"
                                        value={formData.company_name} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        placeholder="e.g. Sales, Client A"
                                    />
                                </div>
                            </div>

                        </form>

                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                            >
                                {loading ? 'Saving...' : <><FiSave /> Save Asset</>}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddAssetModal;
