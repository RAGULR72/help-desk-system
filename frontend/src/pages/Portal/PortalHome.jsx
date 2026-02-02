import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    MagnifyingGlassIcon,
    TicketIcon,
    BookOpenIcon,
    ChatBubbleBottomCenterTextIcon,
    PlayCircleIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';

const PortalHome = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/portal/kb?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    const categories = [
        { title: 'Getting Started', desc: 'New to Proserve? Start here.', icon: PlayCircleIcon, color: 'bg-blue-100 text-blue-600' },
        { title: 'Account Settings', desc: 'Billing, profile, and security.', icon: CheckBadgeIcon, color: 'bg-indigo-100 text-indigo-600' },
        { title: 'Troubleshooting', desc: 'Fix common issues instantly.', icon: BookOpenIcon, color: 'bg-amber-100 text-amber-600' },
        { title: 'Developers', desc: 'API docs and integrations.', icon: ChatBubbleBottomCenterTextIcon, color: 'bg-purple-100 text-purple-600' },
    ];

    return (
        <div className="space-y-16">
            {/* Hero Section */}
            <section className="text-center space-y-8 py-12">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight"
                >
                    How can we <span className="text-indigo-600">help you</span> today?
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="max-w-2xl mx-auto"
                >
                    <form onSubmit={handleSearch} className="relative group">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search for articles, guides, and tutorials..."
                            className="w-full pl-12 pr-4 py-5 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Search
                        </button>
                    </form>
                </motion.div>
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/portal/track" className="group">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <TicketIcon className="w-8 h-8" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-bold text-slate-900">Track Ticket</h3>
                                <p className="text-slate-500 text-sm">Check status using ID & Email</p>
                            </div>
                        </div>
                    </div>
                </Link>

                <Link to="/login" className="group">
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <PlayCircleIcon className="w-8 h-8" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-bold text-slate-900">Open a Ticket</h3>
                                <p className="text-slate-500 text-sm">Submit your issue to our team</p>
                            </div>
                        </div>
                    </div>
                </Link>
            </section>

            {/* Popular Categories */}
            <section className="space-y-8">
                <h2 className="text-2xl font-bold text-slate-900 text-center">Browse by Category</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categories.map((cat, idx) => (
                        <motion.div
                            key={cat.title}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer text-center group"
                        >
                            <div className={`w-12 h-12 ${cat.color} rounded-xl mx-auto flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                <cat.icon className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-800 mb-1">{cat.title}</h3>
                            <p className="text-slate-500 text-sm">{cat.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* FAQ Section */}
            <section className="bg-indigo-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
                        <p className="text-indigo-200">
                            Can't find what you're looking for? Browse our most common queries or contact our support team.
                        </p>
                        <div className="flex space-x-4">
                            <Link to="/portal/kb?category=FAQ" className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors text-center w-full sm:w-auto">
                                View All FAQs
                            </Link>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {[
                            "How do I reset my password?",
                            "What is the SLA for critical tickets?",
                            "How to track asset repair status?",
                            "Can I reopen a closed ticket?"
                        ].map(q => (
                            <div key={q} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 hover:bg-white/20 cursor-pointer transition-all flex justify-between items-center group">
                                <span className="font-medium text-indigo-50">{q}</span>
                                <PlayCircleIcon className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            </section>
        </div>
    );
};

export default PortalHome;
