import React, { useState, useEffect } from 'react';
import {
    FiSearch, FiFilter, FiPlus, FiTag, FiCpu, FiMoreVertical,
    FiTool, FiUser, FiCheckCircle, FiTrash2
} from 'react-icons/fi';
import api from '../api/axios';
import { motion } from 'framer-motion';

import { AnimatePresence } from 'framer-motion';
import AddAssetModal from './AddAssetModal';
import AssetDetailView from './AssetDetailView';

const AssetList = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedAssetId, setSelectedAssetId] = useState(null);

    useEffect(() => {
        fetchAssets();
    }, [filter, search]);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            let url = '/api/assets/';
            const params = [];
            if (filter !== 'all') params.push(`status=${filter}`);
            if (search) params.push(`search=${search}`);

            if (params.length > 0) url += `?${params.join('&')}`;

            const res = await api.get(url);
            setAssets(res.data);
        } catch (error) {
            console.error("Failed to fetch assets");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Available': return 'bg-emerald-100 text-emerald-700';
            case 'Assigned': return 'bg-blue-100 text-blue-700';
            case 'Maintenance': return 'bg-amber-100 text-amber-700';
            case 'Retired': return 'bg-gray-100 text-gray-700';
            case 'Missing': return 'bg-rose-100 text-rose-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, tag, or serial..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200">
                    {['All', 'Available', 'Assigned', 'Maintenance'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s === 'All' ? 'all' : s)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${(filter === s || (filter === 'all' && s === 'All'))
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                >
                    <FiPlus /> Add Asset
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Asset Details</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tag / Serial</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Assignment</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-400">Loading...</td></tr>
                        ) : assets.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-400">No assets found.</td></tr>
                        ) : (
                            assets.map((asset) => (
                                <tr
                                    key={asset.id}
                                    onClick={() => setSelectedAssetId(asset.id)}
                                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <FiCpu size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{asset.name}</p>
                                                <p className="text-xs text-gray-500">{asset.model}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-mono text-gray-600 space-y-1">
                                            <div className="flex items-center gap-1"><FiTag size={10} /> {asset.tag_number}</div>
                                            <div className="text-gray-400">SN: {asset.serial_number}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200 block w-fit">
                                                {asset.category}
                                            </span>
                                            {asset.company_name && (
                                                <span className="text-xs text-gray-500 font-medium block">
                                                    {asset.company_name}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-black uppercase tracking-wider ${getStatusColor(asset.status)}`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {asset.assigned_to_name ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                                    {asset.assigned_to_name.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{asset.assigned_to_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Edit"><FiTool size={16} /></button>
                                            <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Delete"><FiTrash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AddAssetModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAssetAdded={fetchAssets}
            />

            <AssetDetailView
                assetId={selectedAssetId}
                onClose={() => setSelectedAssetId(null)}
                onUpdate={fetchAssets}
            />
        </div>
    );
};

export default AssetList;
