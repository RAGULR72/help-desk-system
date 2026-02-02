import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MagnifyingGlassIcon,
    BookOpenIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    ChevronRightIcon,
    VideoCameraIcon,
    DocumentTextIcon,
    QueueListIcon
} from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';


const KBPortal = () => {
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState(null);

    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const search = params.get('search');
        const cat = params.get('category');
        if (search) setSearchQuery(search);
        if (cat) setSelectedCategory(cat);

        fetchCategories();
        fetchArticles(search, cat);
    }, [location.search]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/api/kb/categories');
            setCategories(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchArticles = async (search = searchQuery, category = selectedCategory) => {
        setLoading(true);
        try {
            const res = await api.get('/api/kb/articles', {
                params: {
                    search: search || undefined,
                    category: category || undefined
                }
            });
            setArticles(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (articleId, helpful) => {
        try {
            await api.post(`/api/kb/articles/${articleId}/vote`, null, {
                params: { helpful }
            });
            // Update local state to show feedback
            if (selectedArticle && selectedArticle.id === articleId) {
                setSelectedArticle({
                    ...selectedArticle,
                    helpful_count: helpful ? selectedArticle.helpful_count + 1 : selectedArticle.helpful_count,
                    not_helpful_count: !helpful ? selectedArticle.not_helpful_count + 1 : selectedArticle.not_helpful_count
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Categories */}
            <aside className="w-full lg:w-72 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                        <QueueListIcon className="w-4 h-4 mr-2" />
                        Categories
                    </h3>
                    <nav className="space-y-1">
                        <button
                            onClick={() => { setSelectedCategory(null); fetchArticles(searchQuery, null); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedCategory ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            All Articles
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setSelectedCategory(cat); fetchArticles(searchQuery, cat); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </nav>
                </div>

            </aside>

            {/* Main Content */}
            <div className="flex-1 space-y-8">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search articles..."
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyUp={(e) => e.key === 'Enter' && fetchArticles()}
                    />
                </div>

                <AnimatePresence mode="wait">
                    {selectedArticle ? (
                        <motion.div
                            key="article"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl"
                        >
                            <button
                                onClick={() => setSelectedArticle(null)}
                                className="text-indigo-600 text-sm font-bold mb-6 flex items-center hover:underline"
                            >
                                ← Back to results
                            </button>

                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <h1 className="text-3xl font-extrabold text-slate-900">{selectedArticle.title}</h1>
                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                        {selectedArticle.category}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-4 text-sm text-slate-400">
                                    <span>Last updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{selectedArticle.views_count} views</span>
                                </div>

                                <div
                                    className="prose prose-indigo max-w-none text-slate-600"
                                    dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                                />

                                <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Was this article helpful?</h3>
                                    <div className="flex justify-center space-x-4">
                                        <button
                                            onClick={() => handleVote(selectedArticle.id, true)}
                                            className="flex items-center space-x-2 px-6 py-2 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all group"
                                        >
                                            <HandThumbUpIcon className="w-5 h-5 group-hover:fill-emerald-700" />
                                            <span className="font-bold">Yes</span>
                                            <span className="text-xs text-slate-400">({selectedArticle.helpful_count})</span>
                                        </button>
                                        <button
                                            onClick={() => handleVote(selectedArticle.id, false)}
                                            className="flex items-center space-x-2 px-6 py-2 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all group"
                                        >
                                            <HandThumbDownIcon className="w-5 h-5 group-hover:fill-red-700" />
                                            <span className="font-bold">No</span>
                                            <span className="text-xs text-slate-400">({selectedArticle.not_helpful_count})</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                            {loading ? (
                                Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl" />
                                ))
                            ) : articles.length > 0 ? (
                                articles.map(article => (
                                    <div
                                        key={article.id}
                                        onClick={() => setSelectedArticle(article)}
                                        className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                {article.category === 'Video' ? <VideoCameraIcon className="w-6 h-6" /> : <DocumentTextIcon className="w-6 h-6" />}
                                            </div>
                                            <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                            {article.title}
                                        </h3>
                                        <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                                            {article.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                        </p>
                                        <div className="flex items-center text-xs text-slate-400 space-x-3">
                                            <span className="font-bold text-indigo-600">{article.category}</span>
                                            <span>•</span>
                                            <span>{article.views_count} views</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BookOpenIcon className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">No articles found</h3>
                                    <p className="text-slate-500">Try adjusting your search or category filters.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default KBPortal;
