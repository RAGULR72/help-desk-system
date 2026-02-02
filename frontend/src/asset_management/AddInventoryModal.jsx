import React, { useState, useEffect } from 'react';
import { FiX, FiBox, FiLayers, FiDollarSign, FiMapPin, FiAlertTriangle, FiCheckSquare } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';

const AddInventoryModal = ({ isOpen, onClose, onItemAdded, initialData = null }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: 'Peripherals',
        quantity: 0,
        low_stock_threshold: 5,
        unit_price: '',
        location: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: '',
                category: 'Peripherals',
                quantity: 0,
                low_stock_threshold: 5,
                unit_price: '',
                location: ''
            });
        }
    }, [initialData, isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData) {
                await api.put(`/api/assets/inventory/${initialData.id}`, formData);
            } else {
                await api.post('/api/assets/inventory', formData);
            }
            onItemAdded();
            onClose();
        } catch (error) {
            console.error("Failed to save inventory item", error);
            alert("Failed to save item. Please try again.");
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
                            <h2 className="text-xl font-bold text-gray-900">
                                {initialData ? 'Edit Inventory Item' : 'Add Stock Item'}
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Item Name</label>
                                    <div className="relative">
                                        <FiBox className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            name="name" required
                                            value={formData.name} onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            placeholder="e.g. HDMI Cable 2m"
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
                                        <option>Peripherals</option>
                                        <option>Cables & Adapters</option>
                                        <option>Office Supplies</option>
                                        <option>Components</option>
                                        <option>Consumables</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Quantity In Stock</label>
                                        <div className="relative">
                                            <FiLayers className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                name="quantity" type="number" required
                                                value={formData.quantity} onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-indigo-900"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Low Stock Alert at</label>
                                        <div className="relative">
                                            <FiAlertTriangle className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                name="low_stock_threshold" type="number" required
                                                value={formData.low_stock_threshold} onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Unit Price</label>
                                        <div className="relative">
                                            <FiDollarSign className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                name="unit_price" type="number" step="0.01"
                                                value={formData.unit_price} onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
                                        <div className="relative">
                                            <FiMapPin className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                name="location"
                                                value={formData.location} onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                placeholder="Shelf A2"
                                            />
                                        </div>
                                    </div>
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
                                    {loading ? 'Saving...' : <><FiCheckSquare /> Save Item</>}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddInventoryModal;
