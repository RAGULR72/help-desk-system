import React, { useState, useEffect } from 'react';
import {
    FiX, FiPrinter, FiEdit2, FiActivity, FiUser, FiClock,
    FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../api/axios';
import AddAssetModal from './AddAssetModal';

const AssetDetailView = ({ assetId, onClose, onUpdate }) => {
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // overview, history, maintenance
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);

    useEffect(() => {
        if (assetId) {
            fetchAssetDetails();
            fetchHistory();
            fetchMaintenance();
        }
    }, [assetId]);

    const fetchAssetDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/assets/${assetId}`);
            setAsset(res.data);
        } catch (error) {
            console.error("Failed to fetch asset details");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get(`/api/assets/${assetId}/history`);
            setHistory(res.data);
        } catch (error) {
            console.error("Failed to fetch history");
        }
    };

    const fetchMaintenance = async () => {
        try {
            const res = await api.get(`/api/assets/${assetId}/maintenance`);
            setMaintenance(res.data);
        } catch (error) {
            console.error("Failed to fetch maintenance");
        }
    };

    const handlePrintLabel = () => {
        const printWindow = window.open('', '', 'width=600,height=600');
        const qrCanvas = document.getElementById('qr-code-canvas');
        const qrDataUrl = qrCanvas.toDataURL("image/png");

        printWindow.document.write(`
            <html>
                <body style="font-family: Arial; text-align: center; padding: 20px;">
                    <div style="border: 2px solid #000; padding: 15px; display: inline-block; border-radius: 10px;">
                        <h2 style="margin: 0 0 10px;">${asset.name}</h2>
                        <img src="${qrDataUrl}" width="150" height="150" />
                        <p style="font-weight: bold; margin: 10px 0;">TAG: ${asset.tag_number}</p>
                        <p style="font-size: 12px; margin: 0;">${asset.serial_number || ''}</p>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (!assetId) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex justify-end"
                onClick={onClose}
            >
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {loading ? (
                        <div className="p-10 text-center">Loading Details...</div>
                    ) : asset && (
                        <div>
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md uppercase">{asset.category}</span>
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${asset.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {asset.status}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900">{asset.name}</h2>
                                    <p className="text-sm text-gray-500 font-mono">SN: {asset.serial_number}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Edit Asset"
                                    >
                                        <FiEdit2 size={20} />
                                    </button>
                                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                        <FiX size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-100 px-6">
                                {['overview', 'history', 'maintenance'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-3 text-sm font-bold capitalize transition-colors border-b-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6">
                                {activeTab === 'overview' && (
                                    <div className="space-y-8">
                                        {/* QR Code Section */}
                                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-6">
                                            <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-inner">
                                                <QRCodeCanvas
                                                    id="qr-code-canvas"
                                                    value={JSON.stringify({ id: asset.id, tag: asset.tag_number })}
                                                    size={100}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg text-gray-900">{asset.tag_number}</h3>
                                                <p className="text-sm text-gray-500 mb-4">Scan this code to quickly access asset details.</p>
                                                <button
                                                    onClick={handlePrintLabel}
                                                    className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors"
                                                >
                                                    <FiPrinter /> Print Label
                                                </button>
                                            </div>
                                        </div>

                                        {/* Key Info Grid */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase">Manufacturer</label>
                                                <p className="font-medium text-gray-900">{asset.manufacturer || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase">Model</label>
                                                <p className="font-medium text-gray-900">{asset.model || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase">Purchase Date</label>
                                                <p className="font-medium text-gray-900">{asset.purchase_date || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase">Company</label>
                                                <p className="font-medium text-gray-900">{asset.company_name || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase">Cost</label>
                                                <p className="font-medium text-gray-900">${asset.purchase_cost || '0.00'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase">Warranty Expiry</label>
                                                <p className={`font-medium ${new Date(asset.warranty_expiry) < new Date() ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {asset.warranty_expiry || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase">Current User</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xs font-bold">
                                                        <FiUser size={12} />
                                                    </div>
                                                    <p className="font-medium text-gray-900">{asset.assigned_to_name || 'Unassigned'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Specs */}
                                        {asset.specs && (
                                            <div>
                                                <h3 className="font-bold text-gray-900 mb-2">Specifications</h3>
                                                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 leading-relaxed font-mono">
                                                    {asset.specs}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-gray-900 mb-4">Activity Log</h3>
                                        <div className="relative border-l-2 border-indigo-100 ml-3 space-y-8">
                                            {history.length === 0 ? (
                                                <p className="text-gray-500 text-sm ml-6">No history records found.</p>
                                            ) : (
                                                history.map((record, idx) => (
                                                    <div key={record.id} className="relative ml-6">
                                                        <span className="absolute -left-[31px] bg-white border-2 border-indigo-100 w-4 h-4 rounded-full"></span>
                                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-bold text-gray-800 text-sm">{record.action}</span>
                                                                <span className="text-xs text-gray-400 font-mono">{new Date(record.created_at).toLocaleString()}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 mb-2">{record.description}</p>
                                                            {record.performed_by_name && (
                                                                <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold bg-indigo-50 inline-block px-2 py-1 rounded">
                                                                    <FiUser size={10} /> {record.performed_by_name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'maintenance' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-gray-900">Maintenance Records</h3>
                                            <button
                                                onClick={() => setIsMaintenanceModalOpen(true)}
                                                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                                            >
                                                <FiPlus /> Log New
                                            </button>
                                        </div>

                                        {maintenance.length === 0 ? (
                                            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                <FiTool className="mx-auto mb-2 text-gray-300" size={32} />
                                                <p className="text-gray-400 text-sm">No maintenance records logged yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {maintenance.map((record) => (
                                                    <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                                                        <div className={`p-3 rounded-lg flex items-center justify-center h-fit ${record.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                            {record.status === 'Completed' ? <FiCheckCircle size={20} /> : <FiAlertCircle size={20} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h4 className="font-bold text-gray-900">{record.type}</h4>
                                                                <span className="font-mono text-xs text-gray-400">{record.maintenance_date}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 mb-3">{record.description}</p>

                                                            <div className="flex flex-wrap gap-3 text-xs">
                                                                {record.cost > 0 && (
                                                                    <span className="flex items-center gap-1 font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                                                        <FiDollarSign size={10} /> {record.cost}
                                                                    </span>
                                                                )}
                                                                {record.performed_by && (
                                                                    <span className="flex items-center gap-1 font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                                                        <FiUser size={10} /> {record.performed_by}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>

            <AddAssetModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                initialData={asset}
                onAssetAdded={() => {
                    fetchAssetDetails();
                    onUpdate();
                }}
            />

            <AddMaintenanceModal
                isOpen={isMaintenanceModalOpen}
                onClose={() => setIsMaintenanceModalOpen(false)}
                asset={asset}
                onMaintenanceAdded={() => {
                    fetchMaintenance();
                    fetchAssetDetails(); // Status might change
                    onUpdate();
                }}
            />
        </AnimatePresence>
    );
};

export default AssetDetailView;
