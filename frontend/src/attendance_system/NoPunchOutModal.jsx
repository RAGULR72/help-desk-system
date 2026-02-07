import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiCalendar, FiClock, FiMessageSquare, FiSend, FiX } from 'react-icons/fi';
import api from '../api/axios';

const NoPunchOutModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [pendingRecords, setPendingRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        checkPendingRecords();
    }, []);

    const checkPendingRecords = async () => {
        try {
            const res = await api.get('/api/attendance/no-punch-out/pending');
            if (res.data && res.data.length > 0) {
                setPendingRecords(res.data);
                setSelectedRecord(res.data[0]);
                setIsOpen(true);
            }
        } catch (err) {
            console.error("Failed to check pending no punch-out records", err);
        }
    };

    const handleSubmitReason = async () => {
        if (!selectedRecord || !reason.trim()) return;

        setLoading(true);
        try {
            await api.post('/api/attendance/no-punch-out/submit-reason', {
                attendance_id: selectedRecord.id,
                reason: reason.trim()
            });

            setSuccess(true);

            // Remove submitted record from list
            const remaining = pendingRecords.filter(r => r.id !== selectedRecord.id);
            setPendingRecords(remaining);

            if (remaining.length > 0) {
                setSelectedRecord(remaining[0]);
                setReason('');
                setSuccess(false);
            } else {
                setTimeout(() => {
                    setIsOpen(false);
                }, 1500);
            }
        } catch (err) {
            console.error("Failed to submit reason", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                <FiAlertTriangle size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Missing Punch-Out</h2>
                                <p className="text-white/80 text-sm">Please provide a reason for not checking out</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {success ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiSend className="text-green-600" size={28} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Reason Submitted!</h3>
                                <p className="text-gray-500 mt-2">Thank you for your response.</p>
                            </div>
                        ) : (
                            <>
                                {/* Date Selection */}
                                {pendingRecords.length > 1 && (
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                            Select Date
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {pendingRecords.map(record => (
                                                <button
                                                    key={record.id}
                                                    onClick={() => {
                                                        setSelectedRecord(record);
                                                        setReason('');
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedRecord?.id === record.id
                                                            ? 'bg-amber-500 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {record.date}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Selected Record Info */}
                                {selectedRecord && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <FiCalendar className="text-amber-600" />
                                            <span className="font-semibold text-gray-900">{selectedRecord.date}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <FiClock className="text-amber-600" />
                                            <span className="text-gray-600">Check-in: <strong>{selectedRecord.check_in}</strong></span>
                                            <span className="text-red-500 font-semibold ml-auto">No Check-out</span>
                                        </div>
                                    </div>
                                )}

                                {/* Reason Input */}
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <FiMessageSquare size={14} />
                                        Reason for No Punch-Out
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Please explain why you didn't punch out..."
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSubmitReason}
                                        disabled={loading || !reason.trim()}
                                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <FiSend />
                                                Submit Reason
                                            </>
                                        )}
                                    </button>
                                </div>

                                <p className="text-xs text-gray-400 text-center mt-4">
                                    This information is required by HR for attendance tracking.
                                </p>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default NoPunchOutModal;
