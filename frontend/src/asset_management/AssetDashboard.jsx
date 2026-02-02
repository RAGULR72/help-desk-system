import React, { useState, useEffect } from 'react';
import {
    FiBox, FiCpu, FiAlertCircle, FiClipboard, FiPlus,
    FiSearch, FiFilter, FiDollarSign, FiActivity, FiTag
} from 'react-icons/fi';
import api from '../api/axios';
import { motion } from 'framer-motion';
import AddAssetModal from './AddAssetModal';

const StatCard = ({ title, value, icon, color, subtext }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-black text-gray-800">{value}</h3>
            {subtext && <p className="text-xs text-red-500 font-bold mt-1">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center shadow-md`}>
            {icon}
        </div>
    </div>
);

const AssetDashboard = ({ onNavigate }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/api/assets/stats');
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch asset stats");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Asset Data...</div>;

    const totalValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats?.total_value || 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Assets"
                    value={stats?.total_assets || 0}
                    icon={<FiBox size={24} />}
                    color="bg-indigo-500"
                />
                <StatCard
                    title="Total Asset Value"
                    value={totalValue}
                    icon={<FiDollarSign size={24} />}
                    color="bg-emerald-500"
                />
                <StatCard
                    title="Assigned"
                    value={stats?.assigned_assets || 0}
                    icon={<FiCpu size={24} />}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Maintenance"
                    value={stats?.maintenance_assets || 0}
                    icon={<FiActivity size={24} />}
                    color="bg-amber-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-rose-50 text-rose-500 p-2 rounded-lg"><FiAlertCircle size={20} /></div>
                        <h3 className="font-bold text-gray-800">Action Required</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <p className="font-bold text-gray-800">Warranty Expiring Soon</p>
                                <p className="text-xs text-gray-500">Assets with warranty expiring in 30 days</p>
                            </div>
                            <span className="text-xl font-black text-rose-600">{stats?.warranty_expiring_soon || 0}</span>
                        </div>
                        <div
                            onClick={() => onNavigate('inventory')}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-amber-50 hover:border-amber-100 transition-colors group"
                        >
                            <div>
                                <p className="font-bold text-gray-800 group-hover:text-amber-700 transition-colors">Low Stock Alert</p>
                                <p className="text-xs text-gray-500 group-hover:text-amber-600 transition-colors">Inventory items below threshold</p>
                            </div>
                            <span className="text-xl font-black text-amber-600">{stats?.low_stock_items || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-center">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold mb-2">Manage Your Assets</h3>
                        <p className="text-indigo-200 mb-6 max-w-sm">Track lifecycle, manage stock, and schedule maintenance efficiently.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold text-sm">Add New Asset</button>
                            <button className="bg-indigo-800 text-white px-4 py-2 rounded-lg font-bold text-sm border border-indigo-700">Scan QR Code</button>
                        </div>
                    </div>
                    <FiTag className="absolute -bottom-4 -right-4 text-white opacity-10 w-48 h-48" />
                </div>
            </div>

            <AddAssetModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAssetAdded={fetchStats}
            />
        </div>
    );
};

export default AssetDashboard;
