import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiUser, FiMoreVertical, FiAlertCircle, FiPlus, FiTool, FiLock } from 'react-icons/fi';

const KANBAN_COLUMNS = [
    { id: 'open', label: 'Open', color: 'bg-primary/5', accent: 'primary', icon: <FiAlertCircle size={14} /> },
    { id: 'in_progress', label: 'In Progress', color: 'bg-amber-500/5', accent: 'amber-500', icon: <FiClock size={14} /> },
    { id: 'repairing', label: 'Repairing', color: 'bg-indigo-500/5', accent: 'indigo-500', icon: <FiTool size={14} /> },
    { id: 'hold', label: 'Hold', color: 'bg-rose-500/5', accent: 'rose-500', icon: <FiLock size={14} /> },
    { id: 'resolved', label: 'Resolved', color: 'bg-emerald-500/5', accent: 'emerald-500', icon: <FiUser size={14} /> }
];

const TicketCard = ({ ticket, onDragStart, onClick }) => {
    const priorityColor = {
        Critical: 'text-red-500 bg-red-500/10 border-red-500/20',
        High: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
        Medium: 'text-primary bg-primary/10 border-primary/20',
        Low: 'text-muted bg-white/5 border-card-border/50'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            draggable
            onDragStart={(e) => onDragStart(e, ticket.id)}
            onClick={() => onClick(ticket.id)}
            className="glass-card p-5 border-none bg-white/5 cursor-pointer active:cursor-grabbing hover:bg-white/10 transition-all shadow-lg group relative overflow-hidden transform hover:-translate-y-1"
        >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-40 transition-opacity">
                <FiMoreVertical className="text-main" />
            </div>

            <div className="flex items-center gap-3 mb-4">
                <span className="text-[9px] font-mono font-black text-muted tracking-wider group-hover:text-primary transition-colors whitespace-nowrap">{ticket.id}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest border ${priorityColor[ticket.priority] || priorityColor.Medium}`}>
                    {ticket.priority}
                </span>
            </div>

            <h4 className="font-black text-sm text-main mb-5 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {ticket.title}
            </h4>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-card-border/30">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-[10px] shadow-inner border border-primary/20">
                        {ticket.requester.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-bold text-muted truncate max-w-[100px] uppercase tracking-widest">{ticket.requester}</span>
                </div>

                {ticket.sla_deadline && (
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-md uppercase tracking-[0.1em]">
                        <FiClock size={11} className="animate-pulse" />
                        <span>SLA</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const TicketKanbanBoard = ({ tickets, onStatusChange, onTicketClick }) => {
    const [draggedTicketId, setDraggedTicketId] = useState(null);

    const handleDragStart = (e, id) => {
        setDraggedTicketId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        const ticketId = draggedTicketId;
        if (!ticketId) return;

        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket && ticket.status.toLowerCase().replace(' ', '_') !== targetStatus) {
            onStatusChange(ticketId, targetStatus);
        }
        setDraggedTicketId(null);
    };

    // Group tickets
    const columns = {
        open: [],
        in_progress: [],
        repairing: [],
        hold: [],
        resolved: []
    };

    tickets.forEach(ticket => {
        const statusKey = ticket.status.toLowerCase().replace(' ', '_');
        if (columns[statusKey]) {
            columns[statusKey].push(ticket);
        } else {
            columns['open'].push(ticket);
        }
    });

    return (
        <div className="flex gap-6 h-full overflow-x-auto pb-8 items-start custom-scrollbar-hidden">
            {KANBAN_COLUMNS.map(col => (
                <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className={`flex-shrink-0 w-80 flex flex-col h-full glass-card border-none bg-white/5 relative group transition-all duration-500`}
                >
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl blur-2xl" />

                    {/* Column Header */}
                    <div className="p-6 relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-${col.accent}/10 text-${col.accent} shadow-inner`}>
                                {col.icon}
                            </div>
                            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-main">{col.label}</h3>
                        </div>
                        <span className="text-[10px] font-black text-muted bg-white/5 border border-card-border/50 px-3 py-1 rounded-full shadow-inner">
                            {columns[col.id].length}
                        </span>
                    </div>

                    {/* Draggable Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-10">
                        <AnimatePresence mode="popLayout">
                            {columns[col.id].map(ticket => (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    onDragStart={handleDragStart}
                                    onClick={onTicketClick}
                                />
                            ))}
                        </AnimatePresence>

                        {columns[col.id].length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-40 border-2 border-dashed border-card-border/30 rounded-[1.5rem] flex flex-col items-center justify-center text-muted gap-3 bg-white/5 group-hover:bg-white/10 transition-colors"
                            >
                                <div className="p-3 bg-white/5 rounded-full">
                                    <FiPlus size={20} className="opacity-20" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30">Pipeline Clear</span>
                            </motion.div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TicketKanbanBoard;
