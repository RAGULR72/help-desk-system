import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSend, IoClose, IoChatbubblesOutline, IoPeopleOutline, IoSearch, IoAdd, IoArrowBack } from 'react-icons/io5';
import { useChat } from './ChatContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ChatInterface = () => {
    const { user } = useAuth();
    const {
        rooms, setRooms, messages, setMessages,
        activeRoom, setActiveRoom, sendMessage, sendTyping, typingStatus
    } = useChat();

    const getFullAvatarUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const finalBaseUrl = `http://${window.location.hostname}:8000`;
        return `${finalBaseUrl}${normalizedPath}`;
    };

    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const scrollRef = useRef(null);

    // Fetch rooms on open
    useEffect(() => {
        if (isOpen && rooms.length === 0) {
            fetchRooms();
        }
    }, [isOpen]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeRoom]);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/chat/rooms');
            setRooms(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/chat/users');
            setAvailableUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMessages = async (roomId) => {
        try {
            const res = await api.get(`/api/chat/rooms/${roomId}/messages`);
            setMessages(prev => ({ ...prev, [roomId]: res.data }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelectRoom = (room) => {
        setActiveRoom(room);
        setShowNewChat(false);
        if (!messages[room.id]) {
            fetchMessages(room.id);
        }
    };

    const handleStartNewChat = async (targetUser) => {
        try {
            const res = await api.post('/api/chat/rooms', {
                participant_ids: [targetUser.id],
                room_type: 'direct'
            });

            // Refresh rooms and select the new one
            await fetchRooms();
            const newRoom = {
                id: res.data.id,
                name: targetUser.full_name,
                room_type: 'direct'
            };
            handleSelectRoom(newRoom);
            setShowNewChat(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleNewChatClick = () => {
        setShowNewChat(true);
        setActiveRoom(null);
        fetchUsers();
    };

    const handleSend = () => {
        if (!inputValue.trim() || !activeRoom) return;
        sendMessage(activeRoom.id, inputValue);
        setInputValue('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else {
            sendTyping(activeRoom?.id);
        }
    };

    // Filter users based on search
    const filteredUsers = availableUsers.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Don't show chat if user is not logged in

    // WhatsApp-style date formatter
    const formatMessageTime = (timestamp) => {
        const msgDate = new Date(timestamp);
        const now = new Date();
        const diffMs = now - msgDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Same day - show time only
        if (now.toDateString() === msgDate.toDateString()) {
            return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Yesterday
        if (diffDays === 1) {
            return 'Yesterday';
        }

        // Within this week (last 7 days) - show day name
        if (diffDays < 7) {
            return msgDate.toLocaleDateString('en-US', { weekday: 'long' }); // Monday, Tuesday, etc.
        }

        // Older than a week - show date
        return msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); // 23 Dec 2025
    };

    const getStatusString = (room) => {
        if (!room) return '';
        if (room.room_type === 'group') return 'Group Chat';
        if (room.is_online) return 'Online';
        if (room.last_seen) {
            const date = new Date(room.last_seen);
            const isToday = new Date().toDateString() === date.toDateString();
            if (isToday) {
                return `Last seen at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            return `Last seen on ${date.toLocaleDateString()}`;
        }
        return 'Offline';
    };

    // Sync activeRoom with heart-beat updates
    useEffect(() => {
        if (activeRoom && rooms.length > 0) {
            const updated = rooms.find(r => r.id === activeRoom.id);
            if (updated && (updated.is_online !== activeRoom.is_online || updated.last_seen !== activeRoom.last_seen)) {
                setActiveRoom(updated);
            }
        }
    }, [rooms]);

    if (!user) return null;

    return (
        <>
            {/* Floating Toggle Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl z-[9999] overflow-hidden"
                style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
            >
                {isOpen ? <IoClose size={28} /> : <IoChatbubblesOutline size={28} />}
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-24 right-6 w-[450px] h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex overflow-hidden border border-gray-100 dark:bg-slate-900 dark:border-slate-800"
                    >
                        {/* Sidebar */}
                        <div className="w-1/3 border-r border-gray-100 dark:border-slate-800 flex flex-col">
                            <div className="p-3 border-b border-gray-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                                        <IoPeopleOutline /> Chats
                                    </h3>
                                    <button
                                        onClick={handleNewChatClick}
                                        className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 transition-colors"
                                        title="New Chat"
                                    >
                                        <IoAdd size={18} />
                                    </button>
                                </div>
                                <div className="relative">
                                    <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                                ) : rooms.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        No conversations yet.<br />
                                        <button onClick={handleNewChatClick} className="text-indigo-600 mt-2 hover:underline">Start a new chat</button>
                                    </div>
                                ) : (
                                    rooms.map(room => (
                                        <div
                                            key={room.id}
                                            onClick={() => handleSelectRoom(room)}
                                            className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${activeRoom?.id === room.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                                        {room.avatar ? (
                                                            <img src={getFullAvatarUrl(room.avatar)} className="w-full h-full object-cover" />
                                                        ) : (
                                                            (room.name?.[0]?.toUpperCase() || '?')
                                                        )}
                                                    </div>
                                                    {room.room_type === 'direct' && (
                                                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 ${room.is_online ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-xs font-semibold truncate dark:text-white">{room.name}</p>
                                                        {room.last_message_at && (
                                                            <span className="text-[8px] text-gray-400">
                                                                {formatMessageTime(room.last_message_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 truncate">{room.last_message || 'No messages yet'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900/50">
                            {showNewChat ? (
                                // New Chat - User Selection View
                                <div className="flex-1 flex flex-col">
                                    <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
                                        <button onClick={() => setShowNewChat(false)} className="text-gray-500 hover:text-gray-700">
                                            <IoArrowBack size={20} />
                                        </button>
                                        <h4 className="font-bold dark:text-white">New Chat</h4>
                                    </div>
                                    <div className="p-3">
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex-1 overflow-y-auto px-3">
                                        {filteredUsers.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => handleStartNewChat(u)}
                                                className="p-3 flex items-center gap-3 bg-white dark:bg-slate-800 rounded-lg mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                    {u.full_name?.[0]?.toUpperCase() || u.username?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold dark:text-white">{u.full_name || u.username}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <p className="text-center text-gray-500 text-sm py-4">No users found</p>
                                        )}
                                    </div>
                                </div>
                            ) : activeRoom ? (
                                <>
                                    <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold dark:text-white text-sm">{activeRoom.name}</h4>
                                            <p className={`text-[10px] ${activeRoom.is_online ? 'text-green-500' : 'text-gray-500'}`}>
                                                {getStatusString(activeRoom)}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        ref={scrollRef}
                                        className="flex-1 p-4 overflow-y-auto space-y-4"
                                    >
                                        {(messages[activeRoom.id] || []).map((msg, i) => (
                                            <div
                                                key={i}
                                                className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender_id === user.id
                                                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                                                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-white rounded-tl-none shadow-sm'
                                                    }`}>
                                                    {msg.content}
                                                    <div className={`text-[10px] mt-1 opacity-60 ${msg.sender_id === user.id ? 'text-right' : 'text-left'}`}>
                                                        {formatMessageTime(msg.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Typing Indicator */}
                                        {Object.keys(typingStatus[activeRoom.id] || {}).length > 0 && (
                                            <div className="flex justify-start">
                                                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-xs text-gray-500 animate-pulse">
                                                    Someone is typing...
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                                        <div className="relative">
                                            <textarea
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                                placeholder="Type a message..."
                                                rows="1"
                                                className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-slate-800 border-none outline-none focus:outline-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none dark:text-white"
                                            />
                                            <button
                                                onClick={handleSend}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                            >
                                                <IoSend size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                        <IoChatbubblesOutline size={40} />
                                    </div>
                                    <h3 className="font-bold text-lg dark:text-white">Your Messages</h3>
                                    <p className="text-sm mt-2">Select a conversation or start a new one to begin chatting.</p>
                                    <button
                                        onClick={handleNewChatClick}
                                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                                    >
                                        Start New Chat
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatInterface;
