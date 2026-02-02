import React, { useState, useEffect } from 'react';
import {
    FiSearch, FiPlus, FiBox, FiEdit2, FiAlertTriangle, FiCheck
} from 'react-icons/fi';
import api from '../api/axios';
import AddInventoryModal from './AddInventoryModal';

const InventoryList = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/assets/inventory');
            setItems(res.data);
        } catch (error) {
            console.error("Failed to fetch inventory");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setIsAddModalOpen(true);
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search inventory items..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setSelectedItem(null); setIsAddModalOpen(true); }}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-emerald-200 shadow-md"
                >
                    <FiPlus /> Add Stock Item
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-400">Loading Inventory...</td></tr>
                        ) : filteredItems.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-400">No items found.</td></tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                <FiBox size={16} />
                                            </div>
                                            <span className="font-bold text-gray-900">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                                    <td className="px-6 py-4">
                                        <span className={`font-mono font-bold text-lg ${item.quantity <= item.low_stock_threshold ? 'text-rose-600' : 'text-gray-800'}`}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.quantity <= item.low_stock_threshold ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-wider">
                                                <FiAlertTriangle size={10} /> Low Stock
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                                                <FiCheck size={10} /> In Stock
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{item.location || '-'}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        >
                                            <FiEdit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AddInventoryModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                initialData={selectedItem}
                onItemAdded={fetchInventory}
            />
        </div>
    );
};

export default InventoryList;
