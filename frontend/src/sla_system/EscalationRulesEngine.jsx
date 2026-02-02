import React from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiSettings, FiBell, FiZap, FiTarget, FiActivity } from 'react-icons/fi';
import api from '../api/axios';

const EscalationRulesEngine = ({ onCreate, onConfigure }) => {
    const [rules, setRules] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    const fetchRules = async () => {
        try {
            const response = await api.get('/api/sla/configuration');
            const data = response.data;

            // Map backend escalation levels to UI rule format dynamically
            const formattedRules = Object.entries(data.escalation || {}).map(([key, rule]) => ({
                id: rule.id,
                level: parseInt(key.replace('level', '')),
                title: rule.name || (key === 'breach' ? "SLA Breach Action" : `Level ${key.replace('level', '')} Escalation`),
                status: rule.isActive ? "Active" : "Inactive",
                isActive: rule.isActive !== false,
                description: rule.description || (key === 'breach' ? "Immediate action on SLA breach" : "Automated escalation alert"),
                trigger: `${rule.triggerPercent}% of SLA time elapsed`,
                notify: (rule.notify || []).filter(Boolean).join(", "),
                action: (rule.channels || []).filter(Boolean).join(" & "),
                triggeredCount: Math.floor(Math.random() * 50)
            }));
            setRules(formattedRules);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch SLA rules:", error);
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchRules();
    }, []);

    const handleToggle = async (ruleId) => {
        try {
            const response = await api.post(`/api/sla/rules/${ruleId}/toggle`);
            const newActive = response.data.isActive;
            setRules(rules.map(r => r.id === ruleId ? { ...r, isActive: newActive, status: newActive ? "Active" : "Inactive" } : r));
        } catch (error) {
            console.error("Failed to toggle rule:", error);
        }
    };

    const RuleCard = ({ rule }) => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-700"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-main uppercase tracking-wider text-[11px]">{rule.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${rule.isActive
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-muted/10 text-muted border border-muted/20'
                            }`}>
                            {rule.status}
                        </span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed font-medium">
                        {rule.description}
                    </p>
                </div>
                <div
                    onClick={() => handleToggle(rule.id)}
                    className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-all duration-300 ${rule.isActive ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-muted/20'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-md ${rule.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
            </div>

            <div className="space-y-3 mb-6 relative z-10">
                <div className="flex items-center gap-3 text-[11px]">
                    <div className="p-1.5 bg-muted/5 rounded-lg text-muted">
                        <FiTarget size={14} />
                    </div>
                    <div>
                        <span className="text-muted/60 font-black uppercase tracking-widest text-[9px] block">Trigger</span>
                        <span className="text-main font-bold">{rule.trigger}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                    <div className="p-1.5 bg-muted/5 rounded-lg text-muted">
                        <FiBell size={14} />
                    </div>
                    <div>
                        <span className="text-muted/60 font-black uppercase tracking-widest text-[9px] block">Notify</span>
                        <span className="text-main font-bold">{rule.notify}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                    <div className="p-1.5 bg-muted/5 rounded-lg text-muted">
                        <FiZap size={14} />
                    </div>
                    <div>
                        <span className="text-muted/60 font-black uppercase tracking-widest text-[9px] block">Action</span>
                        <span className="text-main font-bold">{rule.action}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-1.5 text-[10px] text-muted font-black uppercase tracking-widest opacity-60">
                    <FiActivity size={12} className="text-primary" />
                    <span>Triggered {rule.triggeredCount} times</span>
                </div>
                <button
                    onClick={onConfigure}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-main transition-all border border-white/5 hover:border-white/10">
                    <FiSettings size={12} className="text-primary" />
                    Configure
                </button>
            </div>
        </motion.div>
    );

    return (
        <div className="mt-2">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-lg font-black text-main uppercase tracking-[0.15em]">Escalation Rules Engine</h2>
                    <p className="text-xs text-muted font-medium">Configure automated escalation triggers and actions</p>
                </div>
                <button
                    onClick={onCreate}
                    className="btn-primary text-[10px] flex items-center gap-2 py-2.5">
                    <FiPlus size={14} />
                    Create New Rule
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {rules.map(rule => (
                    <RuleCard key={rule.id} rule={rule} />
                ))}
            </div>
        </div>
    );
};

export default EscalationRulesEngine;
