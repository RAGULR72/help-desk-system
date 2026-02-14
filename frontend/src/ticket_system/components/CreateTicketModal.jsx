import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiArrowLeft, FiMonitor, FiCpu, FiLock, FiDownload, FiWifi, FiKey, FiUsers, FiGlobe, FiClock, FiSave, FiSend, FiFileText, FiUploadCloud, FiBold, FiItalic, FiList, FiInfo, FiPaperclip, FiZap, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import AIAssistantButton from '../../components/AIAssistantButton';

const CreateTicketModal = ({ isOpen, onClose, onCreate, onUpdate, initialTicket, preFilledData }) => {
    const isEditMode = !!initialTicket;
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        requesterName: '',
        email: '',
        department: 'IT',
        category: '',
        subcategory: '',
        impact: 'Individual',
        urgency: 'Medium',
        priority: '',
        subject: '',
        description: '',
        relatedAsset: ''
    });
    const [categories, setCategories] = useState([]);
    const [loadingCats, setLoadingCats] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [kbSuggestions, setKbSuggestions] = useState([]);
    const [loadingKB, setLoadingKB] = useState(false);
    const [smartSuggestion, setSmartSuggestion] = useState(null);
    const [loadingSmart, setLoadingSmart] = useState(false);
    const [isAiCategorizing, setIsAiCategorizing] = useState(false);

    useEffect(() => {
        const fetchCats = async () => {
            setLoadingCats(true);
            try {
                const res = await api.get('/api/workflows/categories/public');
                setCategories(res.data);
            } catch (err) {
                console.error("Failed to fetch categories", err);
            } finally {
                setLoadingCats(false);
            }
        };

        if (isOpen) {
            fetchCats();
            if (initialTicket) {
                setFormData({
                    requesterName: initialTicket.customer_name || initialTicket.requester || initialTicket.owner?.full_name || initialTicket.owner?.username || '',
                    email: initialTicket.email || initialTicket.owner?.email || '',
                    department: initialTicket.department || 'IT',
                    category: initialTicket.category || '',
                    subcategory: initialTicket.subcategory || '',
                    impact: initialTicket.impact || 'Individual',
                    urgency: initialTicket.urgency || 'Medium',
                    priority: initialTicket.priority || '',
                    subject: initialTicket.title || initialTicket.subject || '',
                    description: initialTicket.description || '',
                    relatedAsset: initialTicket.relatedAsset || ''
                });
                let parsedAttachments = [];
                if (initialTicket.attachments) {
                    if (Array.isArray(initialTicket.attachments)) {
                        parsedAttachments = initialTicket.attachments.map(name => ({ name }));
                    } else if (typeof initialTicket.attachments === 'string') {
                        parsedAttachments = initialTicket.attachments.split(',').map(name => ({ name: name.trim() }));
                    }
                }
                setAttachments(parsedAttachments);
            } else if (user) {
                setFormData({
                    requesterName: user.full_name || user.username,
                    email: user.email,
                    department: 'IT',
                    category: '',
                    subcategory: '',
                    impact: 'Individual',
                    urgency: 'Medium',
                    priority: '',
                    subject: '',
                    description: '',
                    relatedAsset: ''
                });
                setAttachments([]);
            }

            if (preFilledData) {
                setFormData(prev => ({
                    ...prev,
                    subject: preFilledData.subject || prev.subject,
                    description: preFilledData.description || prev.description,
                    category: preFilledData.category || prev.category,
                    subcategory: preFilledData.subcategory || prev.subcategory,
                    priority: preFilledData.priority || prev.priority
                }));
            }
        }
    }, [user, isOpen, initialTicket, preFilledData]);

    useEffect(() => {
        const fetchCategorization = async () => {
            if (formData.subject.length < 5) return;
            if (formData.category && formData.priority) return;

            setIsAiCategorizing(true);
            try {
                const res = await api.post('/api/ai/categorize', {
                    subject: formData.subject,
                    description: formData.description
                });

                if (res.data) {
                    setFormData(prev => ({
                        ...prev,
                        category: prev.category || res.data.category || '',
                        subcategory: prev.subcategory || res.data.subcategory || '',
                        priority: prev.priority || (res.data.priority ? (res.data.priority.charAt(0).toUpperCase() + res.data.priority.slice(1)) : '')
                    }));
                }
            } catch (err) {
                console.error("AI Categorization failed", err);
            } finally {
                setIsAiCategorizing(false);
            }
        };

        const timeoutId = setTimeout(fetchCategorization, 1500);
        return () => clearTimeout(timeoutId);
    }, [formData.subject, formData.description]);

    useEffect(() => {
        const fetchKBSuggestions = async () => {
            if (formData.subject.length < 3 && formData.description.length < 5) {
                setKbSuggestions([]);
                return;
            }
            setLoadingKB(true);
            try {
                const search = formData.subject || formData.description;
                const res = await api.get(`/api/kb/articles?search=${encodeURIComponent(search)}`);
                setKbSuggestions(res.data.slice(0, 3));
            } catch (err) {
                console.error("Failed to fetch KB suggestions", err);
            } finally {
                setLoadingKB(false);
            }
        };

        const timeoutId = setTimeout(fetchKBSuggestions, 1000);
        return () => clearTimeout(timeoutId);
    }, [formData.subject, formData.description]);

    useEffect(() => {
        const fetchSmartSuggestions = async () => {
            if (formData.subject.length < 10) {
                setSmartSuggestion(null);
                return;
            }
            setLoadingSmart(true);
            try {
                const res = await api.post('/api/ai/smart-suggestions', {
                    subject: formData.subject,
                    description: formData.description
                });
                setSmartSuggestion(res.data.suggestion);
            } catch (err) {
                console.error("Smart suggestions failed", err);
            } finally {
                setLoadingSmart(false);
            }
        };

        const timeoutId = setTimeout(fetchSmartSuggestions, 2000);
        return () => clearTimeout(timeoutId);
    }, [formData.subject]);

    const [attachments, setAttachments] = useState([]);

    const templates = [
        { icon: <FiFileText />, title: 'Blank Ticket', desc: 'Start from scratch' },
        { icon: <FiDownload />, title: 'Software Installation', desc: 'Request new software or application' },
        { icon: <FiMonitor />, title: 'Hardware Issue', desc: 'Repair equipment problems' },
        { icon: <FiKey />, title: 'Access Request', desc: 'System or application access' },
        { icon: <FiLock />, title: 'Password Issues', desc: 'Reset account password' },
        { icon: <FiWifi />, title: 'Network Issue', desc: 'Report connectivity problems' }
    ];

    const subcategoryMapping = {
        'Hardware': ['Desktop/Laptop', 'Printer/Scanner', 'Mobile Device', 'Peripheral Equipment'],
        'Software': ['Installation', 'License Issue', 'Bug/Error', 'Upgrade Request'],
        'Network': ['Connectivity', 'VPN Access', 'WiFi Issues', 'Speed/Performance', 'Firewall', 'Switch', 'Network Down'],
        'Account Management': ['Password Reset', 'Account Locked', 'Account Creation'],
        'Email & Communication': ['Email Access', 'Spam/Phishing', 'Distribution List']
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            setAttachments([...attachments, ...Array.from(e.target.files)]);
        }
    };

    const removeAttachment = (index) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isSubmitting) return;

        if (!formData.subject.trim()) {
            alert('Please enter a subject');
            return;
        }
        if (!formData.description.trim()) {
            alert('Please enter a description');
            return;
        }
        if (!formData.category) {
            alert('Please select a category');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditMode) {
                await onUpdate({
                    ...initialTicket,
                    subject: formData.subject,
                    description: formData.description,
                    priority: formData.priority,
                    category: formData.category,
                    subcategory: formData.subcategory,
                    attachments: attachments.map(f => f.name).join(',')
                });
            } else {
                const newTicket = {
                    id: `#TKT-${Math.floor(Math.random() * 10000)}`,
                    title: formData.subject,
                    status: 'Open',
                    priority: formData.priority || 'Medium',
                    requester: formData.requesterName,
                    category: formData.category,
                    subcategory: formData.subcategory,
                    description: formData.description,
                    created_at: new Date().toISOString(),
                    attachments: attachments.map(f => f.name).join(',')
                };
                await onCreate(newTicket);
            }
            onClose();
        } catch (error) {
            console.error("Submission failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const subcategoryDefaults = {
        'Desktop/Laptop': { impact: 'Individual', urgency: 'Medium', priority: 'Medium', subject: 'Hardware Issue: Desktop/Laptop', description: 'Issue with computer hardware. \n\nSerial Number:\nSymptoms:\nError messages:' },
        'Printer/Scanner': { impact: 'Team', urgency: 'Medium', priority: 'Low', subject: 'Printer/Scanner Issue', description: 'Connectivity or hardware issue with printer/scanner. \n\nPrinter Name/Model:\nLocation:\nProblem description:' },
        'Mobile Device': { impact: 'Individual', urgency: 'Medium', priority: 'Medium', subject: 'Mobile Device Support', description: 'Issue with company-issued mobile device. \n\nDevice Model:\nOS Version:\nIssue description:' },
        'Peripheral Equipment': { impact: 'Individual', urgency: 'Low', priority: 'Low', subject: 'Peripheral Equipment Issue', description: 'Issue with mouse, keyboard, monitor, or other peripherals. \n\nEquipment type:\nAsset ID (if any):\nSymptoms:' },
        'Installation': { impact: 'Individual', urgency: 'Medium', priority: 'Low', subject: 'Software Installation Request', description: 'Requesting installation of new software. \n\nSoftware Name:\nVersion:\nReason for request:' },
        'License Issue': { impact: 'Individual', urgency: 'Medium', priority: 'Medium', subject: 'Software License/Activation Issue', description: 'Problem with software licensing or activation. \n\nSoftware Name:\nLicense Key (if known):\nError message:' },
        'Bug/Error': { impact: 'Individual', urgency: 'High', priority: 'High', subject: 'Software Bug/Error Report', description: 'Reporting a bug or error in a system. \n\nApplication name:\nSteps to reproduce:\nExpected vs Actual behavior:' },
        'Upgrade Request': { impact: 'Individual', urgency: 'Low', priority: 'Low', subject: 'Software Upgrade Request', description: 'Requesting an upgrade to an existing software application. \n\nSoftware Name:\nCurrent Version:\nRequested Version:' },
        'Connectivity': { impact: 'Team', urgency: 'High', priority: 'High', subject: 'Network Connectivity Issue', description: 'Problem connecting to the network/internet. \n\nLocation:\nWired or Wireless?:\nIs it affecting others?:' },
        'VPN Access': { impact: 'Individual', urgency: 'High', priority: 'High', subject: 'VPN Access Issue / Setup', description: 'Issue with VPN connection. \n\nVPN Client Version:\nError Code:\nInternet Connection Type:' },
        'WiFi Issues': { impact: 'Team', urgency: 'Medium', priority: 'Medium', subject: 'WiFi Connection Issue', description: 'Signal strength or connection issues with WiFi. \n\nLocation:\nSSID (WiFi Name):\nDevice type:' },
        'Speed/Performance': { impact: 'Team', urgency: 'Medium', priority: 'Medium', subject: 'Network Speed/Performance Issue', description: 'Slowness or lag on the network. \n\nType of activity (Browsing, Video, etc):\nLocation:\nTime of occurrence:' },
        'Firewall': { impact: 'Organization', urgency: 'High', priority: 'Critical', subject: 'Firewall Access/Issue Request', description: 'Request for Firewall rule change. \n\nSource IP:\nDestination IP:\nPort Number:\nBusiness Reason:' },
        'Switch': { impact: 'Organization', urgency: 'High', priority: 'Critical', subject: 'Network Switch Issue', description: 'Reporting a problem with a network switch. \n\nSwitch ID/Location:\nSymptoms:\nNumber of ports affected:' },
        'Network Down': { impact: 'Organization', urgency: 'High', priority: 'Critical', subject: 'MAJOR INCIDENT: Network Down', description: 'The entire network is unavailable. \n\nLocation/Building:\nNumber of users affected:\nStatus of lights on router/switch:' },
        'Password Reset': { impact: 'Individual', urgency: 'High', priority: 'Medium', subject: 'Password Reset Request', description: 'Requesting a password reset for my account.' },
        'Account Locked': { impact: 'Individual', urgency: 'High', priority: 'Medium', subject: 'Account Locked Out', description: 'My account is locked and I cannot log in. \n\nUsername:\nSystem Name:' },
        'Account Creation': { impact: 'Individual', urgency: 'Medium', priority: 'Medium', subject: 'New Account Creation Request', description: 'Requesting creation of a new user account. \n\nFull Name:\nJob Title:\nDepartment:\nRequired access levels:' },
        'Email Access': { impact: 'Individual', urgency: 'High', priority: 'High', subject: 'Email Access Issue', description: 'Cannot access email or sending/receiving issues. \n\nEmail Client (Outlook, Web, etc):\nError message:\nWhen did it start:' },
        'Spam/Phishing': { impact: 'Organization', urgency: 'High', priority: 'High', subject: 'Spam/Phishing Report', description: 'Reporting a suspicious email. \n\nSender address:\nSubject line:\nDid you click any links? (Yes/No):' },
        'Distribution List': { impact: 'Team', urgency: 'Low', priority: 'Low', subject: 'Distribution List Management', description: 'Request to add/remove members or create a distribution list. \n\nDL Name:\nMembers to Add/Remove:\nPurpose:' }
    };

    const handleSubcategoryChange = (sub) => {
        const defaults = subcategoryDefaults[sub];
        if (defaults) {
            setFormData(prev => ({ ...prev, subcategory: sub, ...defaults }));
        } else {
            setFormData(prev => ({ ...prev, subcategory: sub }));
        }
    };

    const handleTemplateClick = (template) => {
        const baseData = { ...formData, category: '', subcategory: '', priority: '', impact: 'Individual', urgency: 'Medium', subject: '', description: '' };
        switch (template.title) {
            case 'Blank Ticket': setFormData(baseData); break;
            case 'Software Installation': setFormData({ ...baseData, category: 'Software', subcategory: 'Installation', priority: 'Medium', subject: 'Software Installation Request', description: 'I would like to request the installation of the following software: \n\nSoftware Name:\nVersion (if known):\nBusiness Justification:' }); break;
            case 'Hardware Issue': setFormData({ ...baseData, category: 'Hardware', subcategory: 'Desktop/Laptop', priority: 'High', subject: 'Hardware Maintenance Required', description: 'I am reporting a hardware issue with my equipment. \n\nAsset ID:\nSymptoms:\nWhen did it start:' }); break;
            case 'Access Request': setFormData({ ...baseData, category: 'Account Management', subcategory: 'Account Creation', priority: 'Medium', subject: 'System/Application Access Request', description: 'I need access to the following system/application: \n\nSystem Name:\nAccess Level:\nManager Approval Reference:' }); break;
            case 'Password Issues': setFormData({ ...baseData, category: 'Account Management', subcategory: 'Password Reset', priority: 'Medium', urgency: 'High', subject: 'Password Reset Request', description: 'I am unable to login and require a password reset for my account.' }); break;
            case 'Network Issue': setFormData({ ...baseData, category: 'Network', subcategory: 'Connectivity', priority: 'High', impact: 'Team', subject: 'Network Connectivity Problem', description: 'I am experiencing network issues. \n\nLocation:\nError Message (if any):\nIs it affecting others?' }); break;
            default: break;
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto custom-scrollbar">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="min-h-screen bg-white"
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                                <FiArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{isEditMode ? 'Edit Ticket' : 'Create New Ticket'}</h1>
                                <p className="text-sm text-gray-500">{isEditMode ? `Updating ticket ${initialTicket.id}` : 'Submit a new IT support request'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="hidden md:block px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
                            <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">
                                <FiSave /> Save Draft
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm flex items-center gap-2 transition-all ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {isSubmitting ? <FiRefreshCw className="animate-spin" /> : (isEditMode ? <FiSave /> : <FiSend />)}
                                {isSubmitting ? 'Submitting...' : (isEditMode ? 'Update Ticket' : 'Submit Ticket')}
                            </button>
                        </div>
                    </div>

                    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                        {/* Templates */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <FiFileText className="text-indigo-600" /> Quick Templates
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                {templates.map((t, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleTemplateClick(t)}
                                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-center group"
                                    >
                                        <div className="p-3 bg-gray-50 text-gray-500 rounded-lg group-hover:bg-white group-hover:text-indigo-600 shadow-sm transition-colors mb-2">
                                            {t.icon}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-700 leading-tight">{t.title}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Requester Info */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-6 flex items-center gap-2">
                                <FiUsers className="text-indigo-600" /> Requester Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                                    <input type="text" value={formData.requesterName} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                                    <input type="email" value={formData.email} readOnly className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none" />
                                </div>
                            </div>
                        </section>

                        {/* Classification */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-2"><FiGlobe className="text-indigo-600" /> Ticket Classification</div>
                                {isAiCategorizing && <div className="text-[10px] text-indigo-500 animate-pulse flex items-center gap-1"><FiZap className="animate-bounce" /> AI Routing...</div>}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Department</label>
                                    <select className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                                        <option value="IT">IT</option><option value="HR">HR</option><option value="Accounts">Accounts</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Category</label>
                                    <select className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}>
                                        <option value="">Select Category</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                        {Object.keys(subcategoryMapping).map(cat => !categories.find(c => c.name === cat) && <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Subcategory</label>
                                    <select disabled={!formData.category} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" value={formData.subcategory} onChange={(e) => handleSubcategoryChange(e.target.value)}>
                                        <option value="">Select Subcategory</option>
                                        {formData.category && (subcategoryMapping[formData.category] || ['General']).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Description & AI Suggestion */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Issue Subject</label>
                                        <AIAssistantButton text={formData.subject} onPolished={(val) => setFormData(prev => ({ ...prev, subject: val }))} contextType="general" />
                                    </div>
                                    <input type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="Briefly describe the issue..." value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />

                                    {/* Glassmorphic AI Suggestions */}
                                    <AnimatePresence>
                                        {(loadingSmart || smartSuggestion) && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                                className="mt-4 p-5 rounded-[2rem] border border-indigo-200/50 bg-indigo-50/40 backdrop-blur-xl overflow-hidden relative group shadow-xl shadow-indigo-100/20"
                                            >
                                                {loadingSmart && (
                                                    <motion.div animate={{ top: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-indigo-400/10 to-transparent z-0" />
                                                )}
                                                <div className="relative z-10">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200"><FiZap className="text-white" size={14} /></div>
                                                            <div>
                                                                <span className="block text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em] italic">Proserve Smart Fix</span>
                                                                <span className="block text-[8px] font-bold text-indigo-400 uppercase tracking-tighter">AI Diagnostic Powered</span>
                                                            </div>
                                                        </div>
                                                        {loadingSmart && <div className="flex items-center gap-2 bg-white/50 px-2 py-1 rounded-full border border-indigo-100"><FiRefreshCw className="animate-spin text-indigo-500" size={10} /><span className="text-[8px] font-black text-indigo-500 uppercase">Analyzing...</span></div>}
                                                    </div>
                                                    {smartSuggestion ? (
                                                        <div className="text-[11px] text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">{smartSuggestion}</div>
                                                    ) : (
                                                        <div className="space-y-2 py-2"><div className="h-1.5 w-3/4 bg-indigo-200/40 rounded-full animate-pulse" /><div className="h-1.5 w-1/2 bg-indigo-200/20 rounded-full animate-pulse delay-75" /></div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Description</label>
                                        <AIAssistantButton text={formData.description} onPolished={(val) => setFormData(prev => ({ ...prev, description: val }))} contextType="general" additionalContext={`Subject: ${formData.subject}`} />
                                    </div>
                                    <textarea rows="6" className="w-full px-4 py-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none" placeholder="Provide full details..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                                </div>
                            </div>
                        </section>

                        {/* Priority */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-6 flex items-center gap-2">
                                <FiClock className="text-indigo-600" /> Priority Selection
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {['Low', 'Medium', 'High', 'Critical'].map((level) => (
                                    <button key={level} onClick={() => setFormData({ ...formData, priority: level })} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${formData.priority === level ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-gray-50 hover:bg-gray-50'}`}>
                                        <span className={`text-xs font-black uppercase tracking-widest ${formData.priority === level ? 'text-indigo-600' : 'text-gray-400'}`}>{level}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Knowledge Base Integration */}
                        {kbSuggestions.length > 0 && (
                            <section className="bg-blue-50/50 border border-blue-100 rounded-[2.5rem] p-8 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><FiFileText size={120} /></div>
                                <h3 className="text-xs font-black text-blue-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <FiInfo className="text-blue-600" /> Recommended KB Articles
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                                    {kbSuggestions.map((art) => (
                                        <a key={art.id} href={`/kb/${art.id}`} target="_blank" rel="noreferrer" className="bg-white p-5 rounded-3xl border border-blue-100/50 hover:shadow-xl hover:-translate-y-1 transition-all group">
                                            <h4 className="text-xs font-black text-gray-900 mb-2 truncate group-hover:text-blue-600">{art.title}</h4>
                                            <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{art.excerpt || art.content}</p>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Attachments */}
                        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm text-center">
                            <input type="file" multiple className="hidden" id="file" onChange={handleFileChange} />
                            <label htmlFor="file" className="cursor-pointer flex flex-col items-center py-10 border-2 border-dashed border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors">
                                <FiUploadCloud className="text-indigo-400 mb-2" size={32} />
                                <span className="text-xs font-bold text-gray-900">Drop files or click to upload</span>
                            </label>
                            {attachments.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {attachments.map((f, i) => (
                                        <div key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg flex items-center gap-2">
                                            {f.name} <FiX className="cursor-pointer" onClick={() => removeAttachment(i)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                            <button onClick={onClose} className="px-8 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-colors">Cancel</button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`px-10 py-3 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateTicketModal;
