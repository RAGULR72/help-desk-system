
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiTool, FiTruck, FiMapPin, FiCheckCircle, FiClock,
    FiCamera, FiFileText, FiUser, FiHome, FiAlertCircle
} from 'react-icons/fi';
import api from '../../api/axios';
import AIAssistantButton from '../../components/AIAssistantButton';

const StepParams = {
    pickup: { icon: FiTool, label: 'Taken for Repair', color: 'blue' },
    departure: { icon: FiTruck, label: 'Tech Departed', color: 'indigo' },
    arrival: { icon: FiMapPin, label: 'Tech Arrived', color: 'purple' },
    report: { icon: FiFileText, label: 'Issue Checked/Fixed', color: 'orange' },
    delivery: { icon: FiHome, label: 'Delivered', color: 'green' },
    closed: { icon: FiCheckCircle, label: 'Ticket Resolved', color: 'green' }
};

const TimelineItem = ({ step, timestamp, isCompleted, isCurrent, user }) => {
    const { icon: Icon, label, color } = StepParams[step];

    return (
        <div className={`relative flex gap-4 ${isCompleted || isCurrent ? 'opacity-100' : 'opacity-40 grayscale'}`}>
            <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg z-10 
                    ${isCompleted ? `bg-${color}-600` : isCurrent ? `bg-${color}-500 ring-4 ring-${color}-100` : 'bg-gray-300'}`}>
                    <Icon size={18} />
                </div>
                {step !== 'closed' && (
                    <div className={`w-0.5 h-16 ${isCompleted ? `bg-${color}-600` : 'bg-gray-200'}`} />
                )}
            </div>
            <div className="pb-8">
                <h4 className={`text-sm font-bold ${isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                    {label}
                </h4>
                {timestamp && (
                    <p className="text-xs font-mono text-gray-500 mt-1 flex items-center gap-1">
                        <FiClock size={10} /> {new Date(timestamp).toLocaleString()}
                    </p>
                )}
                {user && (
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wider">
                        By: {user.full_name || user.username}
                    </p>
                )}
            </div>
        </div>
    );
};

export const RepairInitiationModal = ({ isOpen, onClose, ticket, onInit }) => {
    const [title, setTitle] = useState('');
    const [reason, setReason] = useState('');
    const [pickupLocation, setPickupLocation] = useState('Proserve Office');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title || !reason) return alert("Title and Reason are required");
        setLoading(true);
        try {
            await onInit({
                issue_title: title,
                reason_for_repair: reason,
                pickup_location: pickupLocation
            });
        } catch (e) {
            console.error(e);
            alert("Failed to initiate repair");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
                <h2 className="text-xl font-bold mb-4 dark:text-white">Take to Repair</h2>

                <div className="space-y-4">
                    {/* Auto Fetched Details */}
                    <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Customer:</span>
                            <span className="font-bold dark:text-white">{ticket.owner?.full_name || ticket.owner?.username || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Address:</span>
                            <span className="font-bold dark:text-white">{ticket.owner?.location || "Location not found"}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Issue Title</label>
                        <input
                            value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-transparent focus:border-indigo-500 border-2 outline-none transition-all dark:text-white"
                            placeholder="e.g., Screen Replacement"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Reason for Repair</label>
                            <AIAssistantButton
                                text={reason}
                                onPolished={setReason}
                                contextType="ticket_resolution"
                                additionalContext={`Item: ${title}`}
                            />
                        </div>
                        <textarea
                            value={reason} onChange={e => setReason(e.target.value)}
                            className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-transparent focus:border-indigo-500 border-2 outline-none transition-all h-24 resize-none dark:text-white"
                            placeholder="Detailed reason..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Technician Pickup Location</label>
                        <input
                            value={pickupLocation} onChange={e => setPickupLocation(e.target.value)}
                            className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-transparent focus:border-indigo-500 border-2 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200"
                    >
                        {loading ? 'Processing...' : 'Start Repair Workflow'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


export const SiteReportModal = ({ isOpen, onClose, ticket, onSubmit }) => {
    const [machinePhoto, setMachinePhoto] = useState('');
    const [condition, setCondition] = useState('');
    const [description, setDescription] = useState('');
    const [solution, setSolution] = useState('');
    const [outputImage, setOutputImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    if (!isOpen) return null;

    const handleFileUpload = async (e, setUrl) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        setUploading(true);

        try {
            const res = await api.post("/api/upload/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setUrl(res.data.url);
        } catch (err) {
            console.error(err);
            alert("Image upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!outputImage) return alert("Output/Result Image is mandatory");
        setLoading(true);
        try {
            await onSubmit({
                machine_photo: machinePhoto,
                machine_condition: condition,
                issue_description: description,
                solution_provided: solution,
                output_image: outputImage
            });
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to submit report");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl h-[90vh] overflow-y-auto"
            >
                <h2 className="text-xl font-bold mb-4 dark:text-white">Site Visit Report</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Machine Photo</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, setMachinePhoto)}
                                className="block w-full text-sm text-slate-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-indigo-50 file:text-indigo-700
                                  hover:file:bg-indigo-100"
                            />
                            {machinePhoto && <img src={machinePhoto} alt="Machine" className="h-10 w-10 rounded object-cover border" />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Machine Condition</label>
                        <input value={condition} onChange={e => setCondition(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-indigo-500 outline-none dark:text-white" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Issue Description</label>
                            <AIAssistantButton
                                text={description}
                                onPolished={setDescription}
                                contextType="ticket_resolution"
                            />
                        </div>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-indigo-500 outline-none h-24 resize-none dark:text-white" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Solution Provided</label>
                            <AIAssistantButton
                                text={solution}
                                onPolished={setSolution}
                                contextType="ticket_resolution"
                                additionalContext={`Issue was: ${description}`}
                            />
                        </div>
                        <textarea value={solution} onChange={e => setSolution(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-gray-200 dark:border-slate-700 focus:border-indigo-500 outline-none h-24 resize-none dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-red-500 uppercase mb-1">Output/Result Image (Mandatory)</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, setOutputImage)}
                                className="block w-full text-sm text-slate-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-red-50 file:text-red-700
                                  hover:file:bg-red-100"
                            />
                            {outputImage && <img src={outputImage} alt="Output" className="h-10 w-10 rounded object-cover border" />}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading || uploading} className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 disabled:opacity-50">
                        {uploading ? 'Uploading...' : loading ? 'Submitting...' : 'Mark Resolved'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export const DeliveryCloseModal = ({ isOpen, onClose, ticket, onSubmit }) => {
    const [details, setDetails] = useState('');
    const [images, setImages] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSubmit({
                overall_solution_details: details,
                final_images: images,
                delivery_time: new Date().toISOString() // Or user input
            });
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to Resolve ticket");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
                <h2 className="text-xl font-bold mb-4 dark:text-white">Delivery & Final Resolve</h2>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Overall Solution Details</label>
                            <AIAssistantButton
                                text={details}
                                onPolished={setDetails}
                                contextType="ticket_resolution"
                            />
                        </div>
                        <textarea value={details} onChange={e => setDetails(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none h-32 resize-none dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Final Images (Comma separated URLs)</label>
                        <input value={images} onChange={e => setImages(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white" />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200">
                        {loading ? 'Resolving...' : 'Resolve Ticket'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export const RepairWorkflow = ({ ticket, onUpdate, currentUserId }) => { // Assuming currentUserId passed or obtained via hook
    const rd = ticket.repair_details;
    const [showReportModal, setShowReportModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);

    // We can't use useAuth here easily if it's not passed, but let's assume parent passes it or we import
    // Ideally we pass onUpdate which refetches ticket. 

    if (!rd) return null;

    const handleStep = async (field, value = new Date().toISOString()) => {
        try {
            await api.put(`/api/tickets/${ticket.id}/repair/update`, { [field]: value });
            onUpdate({}); // Trigger refresh
        } catch (e) { alert("Action failed"); }
    };

    const handleAssignVisit = async (techId, type) => {
        try {
            await api.put(`/api/tickets/${ticket.id}/repair/update`, {
                visiting_tech_id: techId,
                visit_type: type
            });
            onUpdate({});
        } catch (e) { alert("Assignment failed"); }
    };

    const handleReportSubmit = async (data) => {
        await api.put(`/api/tickets/${ticket.id}/repair/report`, data);
        onUpdate({});
    };

    const handleCloseSubmit = async (data) => {
        await api.put(`/api/tickets/${ticket.id}/repair/close`, data);
        onUpdate({});
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <SiteReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} onSubmit={handleReportSubmit} />
            <DeliveryCloseModal isOpen={showCloseModal} onClose={() => setShowCloseModal(false)} onSubmit={handleCloseSubmit} />

            {/* Left: Timeline */}
            <div className="md:col-span-1 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800">
                <h3 className="text-lg font-black mb-6 dark:text-white">Repair Timeline</h3>
                <div className="space-y-0">
                    <TimelineItem step="pickup" timestamp={rd.pickup_time} isCompleted={!!rd.pickup_time} isCurrent={!rd.tech_left_time} />
                    <TimelineItem step="departure" timestamp={rd.tech_left_time} isCompleted={!!rd.tech_left_time} isCurrent={!!rd.pickup_time && !rd.tech_left_time} />
                    <TimelineItem step="arrival" timestamp={rd.tech_reached_time} isCompleted={!!rd.tech_reached_time} isCurrent={!!rd.tech_left_time && !rd.tech_reached_time} />
                    <TimelineItem step="report" timestamp={rd.resolution_timestamp} isCompleted={!!rd.resolution_timestamp} isCurrent={!!rd.tech_reached_time && !rd.resolution_timestamp} />
                    <TimelineItem step="delivery" timestamp={rd.delivery_time} isCompleted={!!rd.delivery_time} isCurrent={!!rd.resolution_timestamp && !rd.delivery_time} />
                    <TimelineItem step="closed" timestamp={rd.closing_timestamp} isCompleted={!!rd.closing_timestamp} />
                </div>
            </div>

            {/* Right: Actions & Details */}
            <div className="md:col-span-2 space-y-6">

                {/* Status Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 opacity-80">
                            <FiTool /> <span className="text-xs font-black uppercase tracking-widest">{rd.pickup_location}</span>
                        </div>
                        <h2 className="text-3xl font-black mb-2">{rd.issue_title}</h2>
                        <p className="opacity-90">{rd.reason_for_repair}</p>
                    </div>
                </div>

                {/* VISITING TECH DETAILS */}
                {rd.visiting_tech_id && (
                    <div className="bg-orange-50 dark:bg-slate-800 p-4 rounded-xl flex items-center gap-3 border border-orange-100 dark:border-slate-700">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                            <FiUser />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Assigned Technician</p>
                            <p className="font-bold dark:text-white">Technician ID: {rd.visiting_tech_id} ({rd.visit_type})</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {!rd.closing_timestamp && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {!rd.tech_left_time && (
                            <ActionButton onClick={() => handleStep('tech_left_time')} icon={FiTruck} label="Depart for Customer" color="indigo" />
                        )}
                        {rd.tech_left_time && !rd.tech_reached_time && (
                            <ActionButton onClick={() => handleStep('tech_reached_time')} icon={FiMapPin} label="Arrived at Location" color="purple" />
                        )}

                        {/* Assignment Logic Area */}
                        {rd.tech_reached_time && !rd.visiting_tech_id && (
                            <AssignVisitPanel onAssign={handleAssignVisit} currentUserId={currentUserId} />
                        )}

                        {/* Report Form Trigger */}
                        {rd.visiting_tech_id && !rd.resolution_timestamp && (
                            <ActionButton onClick={() => setShowReportModal(true)} icon={FiFileText} label="Fixed / Resolve Issue" color="orange" />
                        )}

                        {/* Delivery/Close Trigger */}
                        {rd.resolution_timestamp && !rd.delivery_time && (
                            <ActionButton onClick={() => setShowCloseModal(true)} icon={FiCheckCircle} label="Deliver & Resolve" color="green" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const ActionButton = ({ onClick, icon: Icon, label, color }) => (
    <button
        onClick={onClick}
        className={`p-6 rounded-2xl bg-${color}-50 dark:bg-${color}-900/10 border-2 border-${color}-100 dark:border-${color}-500/20 
        hover:border-${color}-500 dark:hover:border-${color}-400 transition-all text-left group`}
    >
        <div className={`w-12 h-12 rounded-xl bg-${color}-500 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
        </div>
        <h3 className={`text-lg font-bold text-${color}-700 dark:text-${color}-300`}>{label}</h3>
    </button>
);

const AssignVisitPanel = ({ onAssign, currentUserId }) => {
    const [technicians, setTechnicians] = useState([]);
    const [selectedTech, setSelectedTech] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTechs = async () => {
            try {
                const res = await api.get('/api/tickets/technicians');
                setTechnicians(res.data);
            } catch (e) {
                console.error("Failed to load technicians");
            } finally {
                setLoading(false);
            }
        }
        fetchTechs();
    }, []);

    return (
        <div className="col-span-2 bg-gray-50 dark:bg-slate-800 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <h4 className="font-bold text-gray-500 mb-4 dark:text-gray-400">Assign Visiting Technician</h4>

            <div className="space-y-6">
                {/* Quick Self Assign */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Quick Asign: Me</label>
                    <div className="flex gap-3">
                        <button onClick={() => onAssign(currentUserId, 'Check')} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition">
                            Assign Self (Check)
                        </button>
                        <button onClick={() => onAssign(currentUserId, 'Fix')} className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-purple-700 transition">
                            Assign Self (Fix)
                        </button>
                    </div>
                </div>

                {/* Assign Other */}
                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Assign Another Technician</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select
                            className="flex-1 p-3 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-indigo-500"
                            onChange={(e) => setSelectedTech(e.target.value)}
                            value={selectedTech}
                        >
                            <option value="">Select Staff Member...</option>
                            {technicians.filter(t => t.id !== currentUserId).map(t => (
                                <option key={t.id} value={t.id}>{t.full_name || t.username} ({t.role})</option>
                            ))}
                        </select>

                        <div className="flex gap-2">
                            <button
                                disabled={!selectedTech}
                                onClick={() => onAssign(selectedTech, 'Check')}
                                className="px-6 py-2 bg-gray-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition"
                            >
                                Check
                            </button>
                            <button
                                disabled={!selectedTech}
                                onClick={() => onAssign(selectedTech, 'Fix')}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
                            >
                                Assign to Repair
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
