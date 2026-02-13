import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import {
    FiMonitor, FiDisc, FiWifi, FiServer, FiLock, FiLifeBuoy,
    FiArrowRight, FiActivity, FiMessageSquare, FiCheckCircle, FiPhone,
    FiDownload, FiCheck, FiPlusCircle
} from 'react-icons/fi';
import CreateTicketModal from './components/CreateTicketModal';
import api from '../api/axios';
import ResultModal from '../components/ResultModal';

const TicketPage = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [portalSettings, setPortalSettings] = useState({ active: false, allowed: false });
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') navigate('/dashboard/admin');
            else if (user.role === 'manager') navigate('/dashboard/manager');
            else if (user.role === 'technician') navigate('/dashboard/technician');
            else navigate('/dashboard/user');
        }
    }, [user, navigate]);

    useEffect(() => {
        const checkPortal = async () => {
            try {
                const res = await api.get('/api/portal/settings');
                const userRole = user?.role || 'public';
                setPortalSettings({
                    active: res.data.active,
                    allowed: res.data.allowed_roles.includes(userRole)
                });
            } catch (error) {
                console.error("Portal settings fetch failed", error);
            }
        };
        checkPortal();
    }, [user]);

    const services = [
        {
            id: 'hardware',
            title: 'Hardware',
            description: 'Devices, peripherals, workstation issues',
            icon: <FiMonitor size={32} className="text-blue-500" />,
            color: 'bg-blue-50',
            issues: [
                "Screen & Battery Replacement",
                "Printer Connectivity",
                "Motherboard Repair",
                "Custom PC Assembly",
                "Data Recovery"
            ]
        },
        {
            id: 'software',
            title: 'Software',
            description: 'Applications, updates, licenses',
            icon: <FiDisc size={32} className="text-purple-500" />,
            color: 'bg-purple-50',
            issues: [
                "OS Installation & Upgrades",
                "Office 365 Setup",
                "Virus Removal",
                "License Management",
                "Driver Updates"
            ]
        },
        {
            id: 'network',
            title: 'Network',
            description: 'Connectivity, VPN, routing',
            icon: <FiWifi size={32} className="text-cyan-500" />,
            color: 'bg-cyan-50',
            issues: [
                "Wi-Fi Signal Optimization",
                "VPN Setup",
                "Firewall Config",
                "Router Management",
                "Cabling Issues"
            ]
        },
        {
            id: 'server',
            title: 'Server',
            description: 'Deployments, uptime, backups',
            icon: <FiServer size={32} className="text-green-500" />,
            color: 'bg-green-50',
            issues: [
                "Active Directory Admin",
                "RAID Recovery",
                "Virtualization (VMware)",
                "Automated Backups",
                "Cloud Migration"
            ]
        },
        {
            id: 'security',
            title: 'Security',
            description: 'Access, compliance, alerts',
            icon: <FiLock size={32} className="text-red-500" />,
            color: 'bg-red-50',
            issues: [
                "Ransomware Protection",
                "Antivirus Management",
                "2FA Setup",
                "Security Audits",
                "Intrusion Detection"
            ]
        },
        {
            id: 'support',
            title: 'Support',
            description: 'General helpdesk assistance',
            icon: <FiLifeBuoy size={32} className="text-orange-500" />,
            color: 'bg-orange-50',
            issues: [
                "Password Resets",
                "User Account Creation",
                "Remote Assistance",
                "Error Troubleshooting",
                "System Diagnostics"
            ]
        }
    ];

    const steps = [
        {
            icon: <FiMessageSquare size={24} />,
            title: "1. Submit Request",
            desc: "Choose a category above and describe your issue. Our system automatically routes it to the right expert."
        },
        {
            icon: <FiActivity size={24} />,
            title: "2. Expert Analysis",
            desc: "Our certified technicians review your ticket, prioritize it, and begin working on a solution immediately."
        },
        {
            icon: <FiCheckCircle size={24} />,
            title: "3. Fast Resolution",
            desc: "We fix the issue and verify with you that everything is working perfectly before closing the ticket."
        }
    ];

    const faqs = [
        {
            question: "What is the typical response time?",
            answer: "For standard priority tickets, we typically respond within 4 hours. Critical issues allow for a 15-minute response time guaranteed by our SLA."
        },
        {
            question: "How can I track my ticket status?",
            answer: "Once logged in, your dashboard provides real-time updates on all your active tickets, including technician comments and status changes."
        },
        {
            question: "Do you offer remote support?",
            answer: "Yes! Most software and configuration issues can be resolved remotely. Please download our remote support tool below to get started."
        },
        {
            question: "Can I upgrade my service level?",
            answer: "Absolutely. Contact our sales team or select 'Billing' in the ticket category to discuss upgrading your support package."
        }
    ];

    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const handleServiceClick = (category) => {
        if (user) {
            setSelectedCategory(category);
            setIsCreateModalOpen(true);
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen flex flex-col transition-colors duration-300">
            <Header />

            <div className="flex-grow pt-32 pb-20 px-4">
                <div className="container mx-auto max-w-6xl">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                            {t('ticket_page.hero_title')}
                        </h1>
                        <p className="text-xl text-muted max-w-2xl mx-auto font-medium">
                            {t('ticket_page.hero_subtitle')}
                        </p>
                    </div>

                    {/* Stats Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 glass-card p-8 shadow-xl">
                        <div className="text-center border-r border-card-border">
                            <div className="text-3xl font-black text-primary mb-1">99.9%</div>
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none">Uptime</div>
                        </div>
                        <div className="text-center border-r border-card-border px-4">
                            <div className="text-3xl font-black text-primary mb-1">&lt; 15m</div>
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none">Response</div>
                        </div>
                        <div className="text-center border-r border-card-border px-4">
                            <div className="text-3xl font-bold text-primary mb-1">10k+</div>
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none">Solved</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-3xl font-bold text-primary mb-1">24/7</div>
                            <div className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none">Support</div>
                        </div>
                    </div>

                    {/* Services Grid (Main Categories with Integrated Issues) */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                        {services.map((service) => (
                            <div
                                onClick={() => handleServiceClick(service.title)}
                                key={service.id}
                                className="glass-card p-8 cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-card-border"
                            >
                                <div className={`p-4 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-lg shadow-primary/10`}>
                                    {service.icon}
                                </div>
                                <h3 className="text-xl font-bold text-main mb-3 tracking-tight">{service.title}</h3>
                                <p className="text-muted text-sm mb-6 leading-relaxed font-normal">{service.description}</p>

                                {/* Integrated Issues List */}
                                <div className="space-y-3 mb-8 border-t border-card-border pt-6">
                                    {service.issues.slice(0, 4).map((issue, idx) => (
                                        <div key={idx} className="flex items-center gap-3 text-sm text-muted">
                                            <FiCheck className="text-primary" />
                                            <span className="font-medium">{issue}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center text-primary font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all duration-300">
                                    <span>{t('ticket_page.create_request')}</span>
                                    <FiArrowRight />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Content Split: How It Works & Downloads */}
                    <div className="grid lg:grid-cols-3 gap-12 mb-24">
                        <div className="lg:col-span-2">
                            <div className="text-left mb-8">
                                <h2 className="text-3xl font-bold mb-4">How Support Works</h2>
                                <p className="text-gray-600">Our streamlined process ensures your issues are resolved quickly and efficiently.</p>
                            </div>
                            <div className="space-y-6">
                                {steps.map((step, index) => (
                                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-6 items-start hover:shadow-md transition-shadow">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex-shrink-0 flex items-center justify-center text-xl font-bold">
                                            {step.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                                            <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <div className="bg-indigo-900 text-white rounded-2xl p-8 h-full relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <FiDownload /> Useful Tools
                                </h3>
                                <p className="text-indigo-200 mb-8">Download these improved tools to help our technicians assist you remotely.</p>

                                <div className="space-y-4">
                                    <button className="w-full bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl flex items-center justify-between transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-500/20 p-2 rounded-lg">
                                                <FiMonitor className="text-red-400" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold">AnyDesk</div>
                                                <div className="text-xs text-indigo-300">Remote Desktop</div>
                                            </div>
                                        </div>
                                        <FiArrowRight className="opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </button>

                                    <button className="w-full bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl flex items-center justify-between transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-500/20 p-2 rounded-lg">
                                                <FiMonitor className="text-blue-400" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold">TeamViewer</div>
                                                <div className="text-xs text-indigo-300">Quick Support</div>
                                            </div>
                                        </div>
                                        <FiArrowRight className="opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </button>
                                    <button className="w-full bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl flex items-center justify-between transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-green-500/20 p-2 rounded-lg">
                                                <FiCheckCircle className="text-green-400" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold">SysCheck</div>
                                                <div className="text-xs text-indigo-300">Diagnostics</div>
                                            </div>
                                        </div>
                                        <FiArrowRight className="opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Self-Service Portal CTA */}
                    {portalSettings.active && portalSettings.allowed && (
                        <div className="mb-24 bg-gradient-to-r from-indigo-600 to-violet-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <h2 className="text-3xl font-bold mb-4">Want instant answers?</h2>
                                    <p className="text-indigo-100 mb-8 text-lg">
                                        Our new Self-Service Portal lets you search the knowledge base
                                        and track tickets without logging in.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <button
                                            onClick={() => navigate('/portal')}
                                            className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-lg"
                                        >
                                            Visit Help Center
                                        </button>
                                        <button
                                            onClick={() => navigate('/portal/track')}
                                            className="bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-400 transition-all border border-indigo-400"
                                        >
                                            Track Ticket Status
                                        </button>
                                    </div>
                                </div>
                                <div className="hidden md:flex justify-center">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                                            <div className="text-2xl font-bold mb-1">KB</div>
                                            <div className="text-xs text-indigo-200">Knowledge Base</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                                            <div className="text-2xl font-bold mb-1">AI</div>
                                            <div className="text-xs text-indigo-200">Smart Chatbot</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                                            <div className="text-2xl font-bold mb-1">ID</div>
                                            <div className="text-xs text-indigo-200">Easy Tracking</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                                            <div className="text-2xl font-bold mb-1">🛠️</div>
                                            <div className="text-xs text-indigo-200">Easy Tools</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        </div>
                    )}

                    {/* FAQ Accordion */}
                    <div className="mb-24 max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
                            <p className="text-gray-600">Quick answers to common questions about our support services.</p>
                        </div>
                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <div key={index} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <button
                                        className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                                        onClick={() => toggleFaq(index)}
                                    >
                                        <span className="font-semibold text-lg text-gray-900">{faq.question}</span>
                                        <div className={`transform transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}>
                                            <FiArrowRight className="text-primary-500 rotate-90" />
                                        </div>
                                    </button>
                                    <div
                                        className={`px-6 transition-all duration-300 ease-in-out overflow-hidden ${openFaq === index ? 'max-h-40 py-4 border-t border-gray-50' : 'max-h-0'}`}
                                    >
                                        <p className="text-gray-600">{faq.answer}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>



                </div>
            </div>

            <Footer />
            <CreateTicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                initialTicket={selectedCategory ? { category: selectedCategory } : null}
                onCreate={async (newTicketData) => {
                    try {
                        const payload = {
                            subject: newTicketData.title || newTicketData.subject,
                            description: newTicketData.description,
                            priority: (newTicketData.priority || 'Medium').toLowerCase(),
                            category: newTicketData.category,
                            subcategory: newTicketData.subcategory,
                            attachments: newTicketData.attachments
                        };

                        await api.post('/api/tickets/', payload);
                        setResultModal({
                            isOpen: true,
                            type: 'success',
                            title: t('result_modal.success_title'),
                            message: t('result_modal.success_message')
                        });
                        setIsCreateModalOpen(false);
                        // Navigate happens after closing the modal, or maybe immediately?
                        // Let's keep it here so background updates, modal shows success.
                        // But modal is separate from CreateTicketModal.
                        // CreateTicketModal closes, ResultModal opens.
                    } catch (error) {
                        console.error("Failed to create ticket", error);
                        let errorMessage = t('result_modal.error_message_default');
                        if (error.response?.data?.detail) {
                            if (Array.isArray(error.response.data.detail)) {
                                errorMessage = error.response.data.detail.map(err => err.msg).join(', ');
                            } else {
                                errorMessage = error.response.data.detail;
                            }
                        }
                        setResultModal({
                            isOpen: true,
                            type: 'error',
                            title: t('result_modal.error_title'),
                            message: errorMessage
                        });
                    }
                }}
            />

            <ResultModal
                isOpen={resultModal.isOpen}
                type={resultModal.type}
                title={resultModal.title}
                message={resultModal.message}
                onClose={() => {
                    setResultModal({ ...resultModal, isOpen: false });
                    if (resultModal.type === 'success') {
                        navigate('/dashboard/user');
                    }
                }}
            />
        </div>
    );
};

export default TicketPage;
