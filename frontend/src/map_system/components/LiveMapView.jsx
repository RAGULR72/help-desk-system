import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../../api/axios';
import { FiRefreshCw, FiNavigation, FiMap, FiUser, FiAlertCircle, FiLock } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const ticketIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const techIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const LiveMapView = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enabled, setEnabled] = useState(false);
    const [error, setError] = useState(null);

    const fetchLocations = async () => {
        try {
            const res = await api.get('/api/map/locations');
            console.log("Map: Locations updated:", res.data);
            setLocations(res.data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch locations", err);
            if (err.response?.status === 403) {
                setEnabled(false);
            } else {
                setError("Failed to sync live data");
            }
        } finally {
            setLoading(false);
        }
    };

    const checkStatus = async () => {
        try {
            const res = await api.get('/api/map/status');
            setEnabled(res.data.enabled);
            if (res.data.enabled) {
                fetchLocations();
            } else {
                setLoading(false);
            }
        } catch (err) {
            setEnabled(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(() => {
            if (enabled) fetchLocations();
        }, 30000); // Pulse every 30s
        return () => clearInterval(interval);
    }, [enabled]);

    if (loading) {
        return (
            <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-3xl animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <FiMap size={32} className="text-indigo-400 animate-bounce" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Initializing Satellites...</span>
                </div>
            </div>
        );
    }

    if (!enabled) {
        return (
            <div className="h-[600px] flex items-center justify-center bg-gray-50 dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-slate-800">
                <div className="text-center space-y-4 max-w-sm px-6">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                        <FiLock size={32} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Live Tracking Disabled</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                        This feature is currently turned off by system administrators.
                        Enable it in the <span className="text-indigo-600 font-bold">Workflow Config</span> to start live field visualization.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <FiNavigation className="text-indigo-600" /> Live Field View
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                        Real-time visualization of technicians and active tickets
                    </p>
                </div>
                <button
                    onClick={fetchLocations}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-all active:scale-95 text-gray-600"
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-2 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden h-[600px] relative">
                <MapContainer
                    center={[13.0827, 80.2707]} // Default to Chennai
                    zoom={12}
                    style={{ height: '100%', width: '100%', borderRadius: '2rem' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />
                    {locations.map((loc) => (
                        <Marker
                            key={`${loc.type}-${loc.id}`}
                            position={[loc.lat, loc.lng]}
                            icon={loc.type === 'ticket' ? ticketIcon : techIcon}
                        >
                            <Popup>
                                <div className="p-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {loc.type === 'ticket' ? <FiAlertCircle className="text-red-500" /> : <FiUser className="text-blue-500" />}
                                        <span className="font-black text-xs uppercase tracking-tight">{loc.name}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-medium">{loc.details}</p>
                                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                                        <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${loc.status === 'open' ? 'bg-green-50 text-green-600' :
                                            loc.status === 'Active' ? 'bg-blue-50 text-blue-600' :
                                                'bg-gray-50 text-gray-600'
                                            }`}>
                                            {loc.status}
                                        </span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                    <ChangeView center={locations.length > 0 ? [locations[0].lat, locations[0].lng] : [13.0827, 80.2707]} />
                </MapContainer>

                {/* Legend Overlay */}
                <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                        <span className="text-[9px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Active Tickets</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                        <span className="text-[9px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Live Technicians</span>
                    </div>
                </div>

                {error && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-red-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                        <FiAlertCircle /> {error}
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper to update map center
function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] !== 0) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

export default LiveMapView;
