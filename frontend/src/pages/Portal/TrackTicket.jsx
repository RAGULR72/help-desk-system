import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MagnifyingGlassIcon,
    TicketIcon,
    EnvelopeIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = 'http://localhost:8000';

const TrackTicket = () => {
    const [ticketId, setTicketId] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [ticket, setTicket] = useState(null);

    const handleTrack = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setTicket(null);

        try {
            const response = await axios.get(`${API_BASE_URL}/api/portal/track-ticket`, {
                params: { ticket_id: ticketId, email: email }
            });
            setTicket(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to track ticket. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const statusColors = {
        open: 'bg-blue-100 text-blue-700 border-blue-200',
        in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
        resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        closed: 'bg-slate-100 text-slate-700 border-slate-200'
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold text-slate-900">Track Your Ticket Status</h1>
                <p className="text-slate-500">Enter your Ticket ID and the email address used to submit the request.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                <form onSubmit={handleTrack} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Ticket ID</label>
                        <div className="relative">
                            <TicketIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="e.g. TKT-2024-001"
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                value={ticketId}
                                onChange={(e) => setTicketId(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                        <div className="relative">
                            <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="email"
                                placeholder="your@email.com"
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-200"
                        >
                            {loading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <MagnifyingGlassIcon className="w-6 h-6" />}
                            <span>{loading ? 'Finding Ticket...' : 'Track Ticket'}</span>
                        </button>
                    </div>
                </form>
            </div>

            <AnimatePresence mode="wait">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-4 text-red-700"
                    >
                        <ExclamationCircleIcon className="w-8 h-8 flex-shrink-0" />
                        <p className="font-medium">{error}</p>
                    </motion.div>
                )}

                {ticket && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-white overflow-hidden rounded-3xl border border-slate-200 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Ticket Details</p>
                                <h2 className="text-2xl font-bold">{ticket.custom_id || `#${ticket.id}`}</h2>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full border text-sm font-bold flex items-center space-x-2 ${statusColors[ticket.status] || statusColors.open}`}>
                                <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-1 space-y-6">
                                    <div>
                                        <h3 className="text-slate-400 text-sm font-medium mb-1 italic">Subject</h3>
                                        <p className="text-xl font-bold text-slate-800">{ticket.subject}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-400 text-sm font-medium mb-1 italic">Category</h3>
                                        <p className="font-semibold px-3 py-1 bg-slate-100 rounded-lg inline-block text-slate-700">{ticket.category}</p>
                                    </div>
                                </div>
                                <div className="w-full md:w-64 space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <div className="flex items-center space-x-3">
                                        <ClockIcon className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Created</p>
                                            <p className="text-sm font-semibold">{new Date(ticket.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <ArrowPathIcon className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Last Updated</p>
                                            <p className="text-sm font-semibold">{new Date(ticket.updated_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Tracker */}
                            <div className="pt-8 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Current Status</h3>
                                <div className="relative">
                                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-100" />

                                    <div className="space-y-10 relative">
                                        <div className="flex items-start space-x-6">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center z-10 transition-colors ${['open', 'in_progress', 'resolved', 'closed'].includes(ticket.status) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                                                <CheckBadgeIcon className="w-8 h-8" />
                                            </div>
                                            <div className="pt-2">
                                                <p className="font-bold text-slate-800">Request Received</p>
                                                <p className="text-slate-500 text-sm">Your ticket has been logged in our system.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-6">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center z-10 transition-colors ${['in_progress', 'resolved', 'closed'].includes(ticket.status) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                                                <ArrowPathIcon className="w-8 h-8" />
                                            </div>
                                            <div className="pt-2">
                                                <p className="font-bold text-slate-800">Processing</p>
                                                <p className="text-slate-500 text-sm">A technician is investigating the issue.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-6">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center z-10 transition-colors ${['resolved', 'closed'].includes(ticket.status) ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                                                <CheckCircleIcon className="w-8 h-8" />
                                            </div>
                                            <div className="pt-2">
                                                <p className="font-bold text-slate-800">Resolution</p>
                                                <p className="text-slate-500 text-sm">The issue has been marked as fixed.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper icon
const CheckBadgeIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21a3.745 3.745 0 01-3.068-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
);

export default TrackTicket;
