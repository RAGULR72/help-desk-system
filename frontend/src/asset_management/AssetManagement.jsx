import React, { useState } from 'react';
import AssetDashboard from './AssetDashboard';
import AssetList from './AssetList';
import InventoryList from './InventoryList';
import { FiGrid, FiList, FiBox } from 'react-icons/fi';

const AssetManagement = () => {
    const [view, setView] = useState('dashboard');

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Asset & Inventory</h1>
                    <p className="text-sm text-gray-500">Track hardware, manage stock, and monitor assets.</p>
                </div>

                <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
                    <button
                        onClick={() => setView('dashboard')}
                        className={`p-2 rounded-lg transition-all ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <FiGrid size={20} />
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Asset List"
                    >
                        <FiList size={20} />
                    </button>
                    <button
                        onClick={() => setView('inventory')}
                        className={`p-2 rounded-lg transition-all ${view === 'inventory' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Inventory"
                    >
                        <FiBox size={20} />
                    </button>
                </div>
            </div>

            {view === 'dashboard' && <AssetDashboard onNavigate={setView} />}
            {view === 'list' && <AssetList />}
            {view === 'inventory' && <InventoryList />}
        </div>
    );
};

export default AssetManagement;
