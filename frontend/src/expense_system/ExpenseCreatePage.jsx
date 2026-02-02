import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiX, FiCalendar, FiMapPin, FiCoffee, FiPlus, FiUpload,
    FiHome, FiTag, FiGrid, FiShoppingBag, FiPaperclip,
    FiArrowLeft, FiCheck, FiInfo, FiMaximize, FiMinimize, FiBriefcase, FiUser, FiHelpCircle, FiChevronDown, FiEdit3, FiTrash2
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';

const CATEGORIES = [
    { id: 'Bike', value: 'Travel', mode: 'Bike' },
    { id: 'Car', value: 'Travel', mode: 'Car' },
    { id: 'Bus', value: 'Travel', mode: 'Bus' },
    { id: 'Train', value: 'Travel', mode: 'Train' },
    { id: 'Metro Train', value: 'Travel', mode: 'Train' },
    { id: 'Auto', value: 'Travel', mode: 'Auto' },
    { id: 'Bike Taxi (Rapido, Uber, Ola)', value: 'Travel', mode: 'Rapido' },
];

const ExpenseCreatePage = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [expenseForm, setExpenseForm] = useState({
        category: 'Travel',
        amount: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        travelMode: 'Bike',
        distance: '',
        fromLocation: '',
        toLocation: '',
        tripType: 'One-way',
        projectCode: '',
        customerName: '',
        companyName: '',
        managerName: user?.manager || '',
        settleAdvance: false,
        justification: ''
    });

    const isFormValid = () => {
        const required = ['companyName', 'projectCode', 'customerName', 'startDate', 'endDate', 'fromLocation', 'toLocation', 'distance', 'amount'];
        return required.every(field => !!expenseForm[field]) && parseFloat(expenseForm.distance) > 0 && parseFloat(expenseForm.amount) > 0;
    };

    useEffect(() => {
        if (user?.manager && !id) {
            setExpenseForm(prev => ({ ...prev, managerName: user.manager }));
        }
    }, [user, id]);

    useEffect(() => {
        const fetchExisting = async () => {
            if (id) {
                try {
                    const res = await api.get(`/api/expenses/${id}`);
                    if (res.data.status === 'Approved' || res.data.status === 'Paid') {
                        showToast('Approved claims cannot be edited', 'warning');
                        navigate('/expenses');
                        return;
                    }
                    const data = res.data;
                    // Format dates for input[type="date"]
                    if (data.startDate) data.startDate = data.startDate.split('T')[0];
                    if (data.endDate) data.endDate = data.endDate.split('T')[0];
                    setExpenseForm(data);
                } catch (err) {
                    showToast('Failed to load claim data', 'error');
                }
            }
        };
        fetchExisting();
    }, [id]);

    const [items, setItems] = useState([]);

    const [submitting, setSubmitting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [travelRates, setTravelRates] = useState([]);

    const fromRef = useRef(null);
    const toRef = useRef(null);
    const fileInputRef = useRef(null);
    const [attachment, setAttachment] = useState(null);
    const [approverConfig, setApproverConfig] = useState({
        primary: { name: 'Not Assigned', is_unavailable: false, status_reason: '' },
        secondary: { name: 'Not Assigned' },
        auto_detect_enabled: false,
        active_approver: ''
    });
    const [tickets, setTickets] = useState([]);
    const [showTicketList, setShowTicketList] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => showToast('Fullscreen failed', 'error'));
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const [mapError, setMapError] = useState(false);

    useEffect(() => {
        const loadGoogleMaps = async () => {
            if (window.google) { setMapLoaded(true); return; }
            try {
                // Fetch dynamic key from portal config
                const { data } = await api.get('/api/portal/config/maps');
                const apiKey = data.apiKey;

                if (!apiKey) {
                    console.warn("Google Maps API Key missing in environment");
                    setMapError(true);
                    return;
                }

                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                script.async = true;
                script.defer = true;
                script.onload = () => setMapLoaded(true);
                script.onerror = () => {
                    setMapError(true);
                    showToast('Google Maps failed to load. Please enter locations manually.', 'warning');
                };
                document.head.appendChild(script);
            } catch (err) {
                console.error("Error fetching maps config:", err);
                setMapError(true);
            }
        };
        loadGoogleMaps();
    }, []);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const response = await api.get('/api/expenses/config/travel-rates');
                setTravelRates(response.data);
                if (response.data.length > 0) setExpenseForm(prev => ({ ...prev, travelMode: response.data[0].mode }));
            } catch (err) { console.error('Rates fetch failed', err); }
        };
        fetchRates();

        const fetchTickets = async () => {
            try {
                const response = await api.get('/api/tickets');
                setTickets(response.data);
            } catch (err) { console.error('Tickets fetch failed', err); }
        };
        const fetchApproverConfig = async () => {
            try {
                const response = await api.get('/api/expenses/config/approvers');
                setApproverConfig(response.data);
                setExpenseForm(prev => ({ ...prev, managerName: response.data.active_approver }));
            } catch (err) { console.error('Approver config fetch failed', err); }
        };
        fetchTickets();
        fetchApproverConfig();
    }, [user]);

    // Distance calculation is now moved to an effect with debounce to allow manual typing

    useEffect(() => {
        if (mapLoaded && window.google && expenseForm.fromLocation && expenseForm.toLocation) {
            const timer = setTimeout(() => {
                const service = new window.google.maps.DistanceMatrixService();
                console.log('Distance calc trigger: ', expenseForm.fromLocation, ' -> ', expenseForm.toLocation);

                service.getDistanceMatrix({
                    origins: [expenseForm.fromLocation],
                    destinations: [expenseForm.toLocation],
                    travelMode: window.google.maps.TravelMode.DRIVING
                }, (res, status) => {
                    if (status === 'OK' && res.rows[0].elements[0].status === 'OK') {
                        const km = res.rows[0].elements[0].distance.value / 1000;
                        setExpenseForm(prev => ({ ...prev, distance: km.toFixed(1) }));
                        console.log('Auto-distance Successful:', km.toFixed(1), 'KM');
                        showToast(`Distance calculated: ${km.toFixed(1)} KM`, 'success');
                    } else {
                        const errorStatus = status !== 'OK' ? status : res.rows[0].elements[0].status;
                        console.error('Auto-distance API Error:', errorStatus, { status, res });

                        if (errorStatus === 'REQUEST_DENIED') {
                            showToast('Distance API not enabled. Enable "Distance Matrix API" in Google Console.', 'error', 6000);
                        } else if (errorStatus === 'ZERO_RESULTS' || errorStatus === 'NOT_FOUND') {
                            showToast('Route not found between these locations.', 'warning');
                        } else {
                            showToast(`Distance calc failed: ${errorStatus}`, 'warning');
                        }
                    }
                });
            }, 500); // Faster trigger
            return () => clearTimeout(timer);
        }
    }, [expenseForm.fromLocation, expenseForm.toLocation, mapLoaded]);

    useEffect(() => {
        if (expenseForm.category === 'Travel' && expenseForm.distance) {
            const mode = travelRates.find(r => r.mode === expenseForm.travelMode);
            const rate = mode ? mode.rate_per_km : 0;
            if (rate > 0) {
                const mult = expenseForm.tripType === 'Round-trip' ? 2 : 1;
                setExpenseForm(prev => ({ ...prev, amount: (parseFloat(expenseForm.distance) * rate * mult).toFixed(2) }));
            }
        }
    }, [expenseForm.distance, expenseForm.travelMode, expenseForm.tripType, expenseForm.category, travelRates]);

    const handleCreateClaim = async (e) => {
        e.preventDefault();

        // Prepare all items for submission
        const allItems = [...items];
        // If the current form is valid and not empty, include it too
        if (expenseForm.amount && expenseForm.fromLocation && expenseForm.toLocation) {
            allItems.push({ ...expenseForm });
        }

        if (allItems.length === 0) {
            showToast('Please add at least one expense entry', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            if (id) {
                // Edit mode usually handles single item or specific update logic
                // For now, keep it simple for single item edit
                const finalDesc = `${expenseForm.description} [Ref: ${expenseForm.projectCode}]`;
                await api.put(`/api/expenses/${id}`, { ...expenseForm, amount: parseFloat(expenseForm.amount), description: finalDesc });
                showToast('Claim updated successfully', 'success');
            } else {
                // Submit items in batch
                const formattedItems = allItems.map(item => ({
                    ...item,
                    amount: parseFloat(item.amount),
                    description: `${item.description || ''} [Ref: ${item.projectCode}]`
                }));
                await api.post('/api/expenses/create-multiple', formattedItems);
                showToast(`Submitted ${formattedItems.length} entries successfully`, 'success');
            }
            navigate('/expenses');
        } catch (err) {
            showToast(id ? 'Update failed' : 'Submission failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0FDF4] flex flex-col font-sans text-slate-700">
            <div className="bg-[#10B981] text-white px-6 py-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate('/expenses')}
                        className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all group"
                    >
                        <FiArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold uppercase tracking-wider">Back</span>
                    </button>
                    <div className="h-6 w-[1px] bg-white/30 hidden md:block"></div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                            <FiEdit3 size={20} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">{id ? 'Edit Claim Request' : 'Claim Request'}</h1>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 space-y-6 max-w-[1400px] mx-auto w-full">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-[#10B981] border-l-4 border-[#10B981] pl-3 tracking-tight">Claim Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-3 space-y-4">

                            <div className="space-y-1 mb-4">
                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Company Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#F9FEFB] border-b border-slate-200 p-2 text-sm font-semibold focus:outline-none focus:border-[#10B981]"
                                    value={expenseForm.companyName}
                                    onChange={(e) => setExpenseForm({
                                        ...expenseForm,
                                        companyName: e.target.value
                                    })}
                                    placeholder="Enter Company Name..."
                                />
                            </div>


                            <div className="grid grid-cols-2 gap-6 pt-4">
                                <div className="space-y-1 relative">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Project Code / Ticket ID</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#F9FEFB] border-b border-slate-200 p-2 text-sm font-semibold focus:outline-none focus:border-[#10B981]"
                                        value={expenseForm.projectCode}
                                        onChange={(e) => {
                                            setExpenseForm({ ...expenseForm, projectCode: e.target.value });
                                            setShowTicketList(true);
                                        }}
                                        onFocus={() => setShowTicketList(true)}
                                        onBlur={() => setTimeout(() => setShowTicketList(false), 200)}
                                        placeholder="Type or select Ticket ID..."
                                    />
                                    {showTicketList && (
                                        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                                            {tickets.filter(t => {
                                                const isMyTicket = t.user_id === user?.id || t.assigned_to === user?.id;
                                                const matchesSearch = (t.custom_id || '').toLowerCase().includes(expenseForm.projectCode.toLowerCase()) ||
                                                    (t.subject || '').toLowerCase().includes(expenseForm.projectCode.toLowerCase());
                                                return isMyTicket && (expenseForm.projectCode === '' || matchesSearch);
                                            }).slice(0, 2).map(t => (
                                                <div
                                                    key={t.id}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                                                    onMouseDown={() => {
                                                        const client = t.owner?.company || t.owner?.full_name || 'Individual Customer';
                                                        // Use profile address if it exists, otherwise leave for manual entry
                                                        const ticketLocation = t.owner?.address || t.repair_details?.pickup_location || '';
                                                        setExpenseForm({
                                                            ...expenseForm,
                                                            projectCode: t.custom_id || `TKT-${t.id}`,
                                                            customerName: client,
                                                            companyName: client,
                                                            toLocation: ticketLocation || ''
                                                        });
                                                        setShowTicketList(false);
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[11px] font-black text-[#10B981] px-2 py-0.5 bg-emerald-50 rounded italic">{t.custom_id || `TKT-${t.id}`}</span>
                                                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${t.status === 'open' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{t.status}</span>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-700 truncate">{t.subject}</div>
                                                    <div className="text-[9px] text-slate-400 font-medium truncate mt-0.5">Customer: {t.owner?.company || t.owner?.full_name}</div>
                                                </div>
                                            ))}
                                            {tickets.filter(t => (t.user_id === user?.id || t.assigned_to === user?.id) && (expenseForm.projectCode === '' || (t.custom_id || '').toLowerCase().includes(expenseForm.projectCode.toLowerCase()) || (t.subject || '').toLowerCase().includes(expenseForm.projectCode.toLowerCase()))).length === 0 && (
                                                <div className="p-3 text-[10px] text-slate-400 italic text-center">No assigned tickets found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Customer Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#F9FEFB] border-b border-slate-200 p-2 text-sm font-semibold focus:outline-none focus:border-[#10B981]"
                                        value={expenseForm.customerName}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, customerName: e.target.value })}
                                        placeholder="Company Name..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#F9FEFB] rounded-xl p-5 border border-slate-100 relative group flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] border-2 border-white shadow-sm">
                                    <FiUser size={20} />
                                </div>
                                <div className="space-y-0.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Approving Manager</label>
                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        {expenseForm.managerName || 'Admin'}
                                        {approverConfig.primary.is_unavailable && (
                                            <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded leading-none flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                                {approverConfig.primary.status_reason === 'No Punch-in Detected' ? 'AUTO-LEAVE' : 'ON LEAVE'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                            <h2 className="text-xl font-bold text-[#10B981] border-l-4 border-[#10B981] pl-3 mb-8">Add Expense</h2>
                            <form id="claim-form" onSubmit={handleCreateClaim} className="space-y-8">
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-1 border-b border-slate-100 pb-2 relative">
                                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">Travel Mode</label>
                                            <div className="relative">
                                                <select className="w-full bg-transparent p-2 pr-8 text-sm font-semibold focus:outline-none appearance-none cursor-pointer"
                                                    value={expenseForm.travelMode} onChange={(e) => setExpenseForm({ ...expenseForm, travelMode: e.target.value })}>
                                                    {travelRates.map(r => <option key={r.mode} value={r.mode}>{r.mode} (₹{r.rate_per_km})</option>)}
                                                </select>
                                                <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                        <div className="space-y-1 border-b border-slate-100 pb-2 relative">
                                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trip Type</label>
                                            <div className="relative">
                                                <select className="w-full bg-transparent p-2 pr-8 text-sm font-semibold focus:outline-none appearance-none cursor-pointer"
                                                    value={expenseForm.tripType} onChange={(e) => setExpenseForm({ ...expenseForm, tripType: e.target.value })}>
                                                    <option value="One-way">One-way</option>
                                                    <option value="Round-trip">Round-trip</option>
                                                </select>
                                                <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-1 border-b border-slate-100 pb-2 relative cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Start Date</label>
                                            <input
                                                type="date"
                                                className="w-full bg-transparent p-2 text-sm font-semibold focus:outline-none cursor-pointer"
                                                value={expenseForm.startDate}
                                                onChange={(e) => setExpenseForm({ ...expenseForm, startDate: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <FiCalendar className="absolute right-2 bottom-3 text-slate-400 pointer-events-none" />
                                        </div>
                                        <div className="space-y-1 border-b border-slate-100 pb-2 relative cursor-pointer" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">End Date</label>
                                            <input
                                                type="date"
                                                className="w-full bg-transparent p-2 text-sm font-semibold focus:outline-none cursor-pointer"
                                                value={expenseForm.endDate}
                                                onChange={(e) => setExpenseForm({ ...expenseForm, endDate: e.target.value })}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <FiCalendar className="absolute right-2 bottom-3 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {expenseForm.category === 'Travel' && (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                            <div className="space-y-1 border-b border-slate-100 pb-2">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Start Location</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent p-2 text-sm font-semibold placeholder:font-normal focus:outline-none"
                                                    placeholder="Enter City/Area..."
                                                    value={expenseForm.fromLocation || ''}
                                                    onChange={e => setExpenseForm({ ...expenseForm, fromLocation: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1 border-b border-slate-100 pb-2">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">End Location</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent p-2 text-sm font-semibold focus:outline-none"
                                                    placeholder="Enter Destination..."
                                                    value={expenseForm.toLocation || ''}
                                                    onChange={e => setExpenseForm({ ...expenseForm, toLocation: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1 border-b border-slate-100 pb-2">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Distance (KM) / Miles</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-transparent p-2 text-sm font-bold focus:outline-none"
                                                    value={expenseForm.distance}
                                                    onChange={(e) => setExpenseForm({ ...expenseForm, distance: e.target.value })}
                                                    placeholder="0.0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1 border-b border-slate-100 pb-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Description</label>
                                    <input type="text" className="w-full bg-transparent p-2 text-sm font-semibold placeholder:font-normal focus:outline-none" placeholder="Type..." value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                                </div>

                                {expenseForm.category === 'Travel' && !['Bike', 'Scooter'].includes(expenseForm.travelMode) && (
                                    <div className="space-y-1 border-b border-slate-100 pb-3 pt-2">
                                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                                            <FiPaperclip size={14} className="text-[#10B981]" /> Attach Receipt / Ticket (Mandatory)
                                        </label>
                                        <div className="flex items-center gap-4 mt-2">
                                            <button type="button" onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 transition-all shadow-sm active:scale-95">
                                                <FiUpload size={14} />
                                                {attachment ? 'Change File' : 'Upload Receipt'}
                                            </button>
                                            <input type="file" ref={fileInputRef} onChange={(e) => setAttachment(e.target.files[0])} className="hidden" accept="image/*,application/pdf" />
                                            {attachment && (
                                                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                                    <FiCheck size={14} />
                                                    <span className="max-w-[150px] truncate">{attachment.name}</span>
                                                    <button type="button" onClick={() => setAttachment(null)} className="text-rose-500 hover:text-rose-600 ml-1 p-0.5 hover:bg-rose-50 rounded-full transition-colors">
                                                        <FiX size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-center pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!expenseForm.amount || !expenseForm.fromLocation || !expenseForm.toLocation) {
                                                showToast('Please fill all travel details before adding', 'warning');
                                                return;
                                            }
                                            const newItem = { ...expenseForm, id: Date.now() };
                                            setItems([...items, newItem]);

                                            // Prepare for next entry: carry over toLocation as new fromLocation
                                            setExpenseForm(prev => ({
                                                ...prev,
                                                fromLocation: prev.toLocation,
                                                toLocation: '',
                                                distance: '',
                                                amount: '',
                                                description: ''
                                            }));
                                            showToast('Entry added to list', 'success');
                                        }}
                                        className="flex items-center gap-2 px-8 py-2.5 rounded-lg border-2 border-[#10B981] text-[#10B981] font-bold hover:bg-[#10B981] hover:text-white transition-all shadow-sm"
                                    >
                                        <FiPlus strokeWidth={3} /> ADD EXPENSE
                                    </button>
                                </div>
                            </form>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-sm border-2 border-dashed border-slate-200 p-4 flex items-center justify-center gap-4 hover:border-[#10B981] hover:bg-emerald-50/30 transition-all group cursor-pointer"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#10B981] transition-all">
                                <FiUpload size={18} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-sm font-bold text-slate-700">Drag & Drop bills or <span className="text-[#10B981] underline">Browse</span></h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">TIFF, JPG, PNG, PDF (Max 100MB)</p>
                            </div>
                        </motion.div>
                    </div>

                    <div className="space-y-6">
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-[#10B981] pl-3 mb-6">Expense Details</h2>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {items.map((item, idx) => (
                                    <div key={item.id} className="relative pl-10 pb-6 border-l-2 border-slate-100 last:border-0 last:pb-0">
                                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-sm">
                                            {item.category === 'Travel' ? <FiMapPin size={8} className="text-slate-400" /> : <FiCoffee size={8} className="text-slate-400" />}
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="text-[12px] font-bold text-slate-800 mb-1">
                                                    ENTRY #{idx + 1}
                                                </h4>
                                                <div className="grid grid-cols-1 gap-0.5">
                                                    <div className="text-[11px] font-medium text-slate-500">
                                                        <span className="text-slate-400 font-bold uppercase text-[9px] mr-2">Start:</span> {item.fromLocation}
                                                    </div>
                                                    <div className="text-[11px] font-medium text-slate-500">
                                                        <span className="text-slate-400 font-bold uppercase text-[9px] mr-2">End:</span> {item.toLocation}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[12px] font-bold text-slate-800">₹{item.amount}</div>
                                                {item.distance && <div className="text-[10px] font-bold text-[#10B981]">{item.distance} KM</div>}
                                                <button
                                                    onClick={() => setItems(items.filter(i => i.id !== item.id))}
                                                    className="text-rose-500 hover:text-rose-600 mt-1 transition-colors"
                                                >
                                                    <FiTrash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Real-time Current Entry Preview */}
                                <div className="relative pl-10 pb-6 border-l-2 border-[#10B981] last:border-0 last:pb-0">
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-[#10B981] border-2 border-white flex items-center justify-center shadow-sm">
                                        {expenseForm.category === 'Travel' ? <FiMapPin size={8} className="text-white" /> : <FiCoffee size={8} className="text-white" />}
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[8px] font-black text-[#10B981] uppercase tracking-widest mb-1 italic">Draft Entry</div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {expenseForm.category === 'Travel'
                                                    ? `${expenseForm.fromLocation || 'Starting Point'} → ${expenseForm.toLocation || 'Destination'}`
                                                    : expenseForm.category}
                                            </h4>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                {expenseForm.startDate} {expenseForm.endDate !== expenseForm.startDate ? ` - ${expenseForm.endDate}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-slate-800 leading-none">₹{expenseForm.amount || '0.00'}</div>
                                            {expenseForm.distance && <div className="text-[10px] font-bold text-[#10B981] mt-1">{expenseForm.distance} KM</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Combined Total Amount</span>
                                    <span className="font-bold text-slate-800 text-lg">
                                        ₹{(items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) + parseFloat(expenseForm.amount || 0)).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Total Combined Mileage</span>
                                    <span className="font-bold text-[#10B981]">
                                        {(items.reduce((sum, item) => sum + parseFloat(item.distance || 0), 0) + parseFloat(expenseForm.distance || 0)).toFixed(1)} KM
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                        <div className="bg-[#F9FEFB] rounded-xl p-6 border border-slate-200">
                            <div className="flex items-center gap-3 mb-4">
                                <FiInfo className="text-[#10B981]" size={20} />
                                <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">Total Mileage Amount will be calculated after submission & response from SAP</p>
                            </div>
                        </div>
                    </div>
                </div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-5 h-5 accent-[#10B981] rounded border-slate-300" checked={expenseForm.settleAdvance} onChange={(e) => setExpenseForm({ ...expenseForm, settleAdvance: e.target.checked })} />
                        <span className="text-sm font-bold text-slate-700">Do you want to settle your advance?</span>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <textarea className="w-full bg-[#F9FEFB] p-4 rounded-xl text-sm italic focus:outline-none border-none resize-none" rows="3" placeholder="Reason/Business justification for this claim" value={expenseForm.justification} onChange={e => setExpenseForm({ ...expenseForm, justification: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-4 pt-6 pb-12">
                        <button onClick={() => navigate('/expenses')} className="px-10 py-3 rounded-xl bg-slate-200 text-slate-500 font-bold hover:bg-slate-300 transition-all">Cancel</button>
                        <button
                            form="claim-form"
                            type="submit"
                            disabled={submitting || !isFormValid()}
                            className="px-12 py-3 rounded-xl bg-[#10B981] text-white font-bold shadow-lg shadow-[#10B981]/30 hover:bg-[#059669] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'PROCESSING...' : (id ? 'UPDATE CLAIM' : 'SUBMIT CLAIM')}
                        </button>
                    </div>
                </motion.div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .pac-container { z-index: 10000 !important; border-radius: 1rem; border: none; margin-top: 5px; box-shadow: 0 20px 25px -5px rgb(0 0 0/0.1); font-family: inherit; padding: 0.5rem; }
                .pac-item { padding: 10px; border: none; cursor: pointer; border-radius: 0.5rem; color: #64748b; }
                .pac-item:hover { background-color: #f1f5f9; }
                .pac-item-query { color: #0f172a; font-size: 14px; }
                .pac-logo:after { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                
                /* Hide native calendar icon to prevent double icons */
                input[type="date"]::-webkit-calendar-picker-indicator {
                    background: transparent;
                    bottom: 0;
                    color: transparent;
                    cursor: pointer;
                    height: auto;
                    left: 0;
                    position: absolute;
                    right: 0;
                    top: 0;
                    width: auto;
                }
            `}} />
        </div>
    );
};

export default ExpenseCreatePage;
