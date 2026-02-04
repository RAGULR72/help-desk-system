import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSend, IoChatbubblesOutline, IoSearch, IoAdd, IoArrowBack, IoImage, IoVideocam, IoMic, IoClose, IoPeople, IoShieldCheckmark, IoCheckmark, IoCheckmarkDone, IoTrash, IoInformationCircle, IoCall, IoEllipse, IoCreate, IoCamera, IoAttach, IoDocument, IoDownload } from 'react-icons/io5';
import { useChat } from './ChatContext'; // Relative import after move
import { useAuth } from '../context/AuthContext';
import api, { baseURL } from '../api/axios';
import DashboardLayout from '../ticket_system/components/DashboardLayout';

const ChatPage = () => {
    const { user } = useAuth();
    const {
        rooms, setRooms, messages, setMessages,
        activeRoom, setActiveRoom, sendMessage, sendTyping, typingStatus
    } = useChat();

    // State
    const [inputValue, setInputValue] = useState('');
    const lastTypingTime = useRef(0);
    const [loading, setLoading] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false); // Toggle search bar in sidebar
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop sidebar toggle
    const [isMessageSearching, setIsMessageSearching] = useState(false); // Search within a room
    const [msgSearchQuery, setMsgSearchQuery] = useState('');
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    // Group Creation State
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isRestrictedGroup, setIsRestrictedGroup] = useState(false);

    // Media State
    const fileInputRef = useRef(null);
    const fileInputDocRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Security State
    const [isBlur, setIsBlur] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    // Selection & Actions
    const [selectedMsgs, setSelectedMsgs] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [msgInfo, setMsgInfo] = useState(null); // Data for info modal

    // Group Info
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [roomDetails, setRoomDetails] = useState(null);
    const [addMemberQuery, setAddMemberQuery] = useState("");
    const [searchedMembers, setSearchedMembers] = useState([]);
    const [pendingMembers, setPendingMembers] = useState([]);

    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState("");
    const groupAvatarInputRef = useRef(null);
    const [viewingProfile, setViewingProfile] = useState(null); // User object for profile modal
    const [isEditingUserAccount, setIsEditingUserAccount] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const editAvatarInputRef = useRef(null);

    const [confirmDialog, setConfirmDialog] = useState({
        show: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'confirm' // confirm or alert
    });

    const [undoDeletion, setUndoDeletion] = useState(null); // { ids, type, countdown, roomId }
    const undoTimerRef = useRef(null);
    const lastTypingSent = useRef(0);

    const isWithin24Hours = (timestamp) => {
        if (!timestamp) return true; // Fallback to allowed if no timestamp
        const msgTime = new Date(timestamp).getTime();
        const now = new Date().getTime();
        return (now - msgTime) < 24 * 60 * 60 * 1000;
    };

    const showConfirm = (title, message, onConfirm) => {
        setConfirmDialog({ show: true, title, message, onConfirm, type: 'confirm' });
    };

    const showAlert = (title, message) => {
        setConfirmDialog({ show: true, title, message, onConfirm: null, type: 'alert' });
    };

    const handleStartEditUser = (participant) => {
        setUserToEdit({
            id: participant.user_id,
            full_name: participant.name,
            email: participant.email,
            phone: participant.phone,
            job_title: participant.job_title,
            department: participant.department,
            avatar: participant.avatar,
            role: participant.role || 'user'
        });
        setIsEditingUserAccount(true);
    };

    const handleUpdateUserAccount = async (edits) => {
        try {
            await api.put(`/api/admin/users/${userToEdit.id}`, edits);
            // Refresh room details to show updated info
            const infoRes = await api.get(`/api/chat/rooms/${activeRoom.id}/info`);
            setRoomDetails(infoRes.data);
            setIsEditingUserAccount(false);
            setUserToEdit(null);
            showAlert("Success", "User profile updated successfully");
        } catch (err) {
            showAlert("Error", err.response?.data?.detail || "Could not update user profile");
        }
    };

    const handleDeleteUser = async (userId) => {
        setConfirmDialog({
            show: true,
            title: "Delete User?",
            message: "This action is permanent and will remove the user from the system. Continue?",
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await api.delete(`/api/admin/users/${userId}`);
                    showAlert("Success", "User deleted successfully");
                    setShowGroupInfo(false);
                    fetchRooms();
                } catch (err) {
                    showAlert("Error", err.response?.data?.detail || "Could not delete user");
                }
            }
        });
    };

    useEffect(() => {
        return () => {
            if (undoTimerRef.current) clearInterval(undoTimerRef.current);
        };
    }, []);

    const handleAdminAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post(`/api/admin/users/${userToEdit.id}/avatar`, formData);
            setUserToEdit(prev => ({ ...prev, avatar: res.data.avatar_url }));
            const infoRes = await api.get(`/api/chat/rooms/${activeRoom.id}/info`);
            setRoomDetails(infoRes.data);
            showAlert("Success", "Avatar updated successfully");
        } catch (err) {
            showAlert("Error", "Could not upload avatar");
        }
    };

    const scrollRef = useRef(null);
    const canCreateGroup = ['admin', 'manager'].includes(user?.role) || (user?.permissions && (typeof user.permissions === 'string' ? JSON.parse(user.permissions).can_create_group : user.permissions.can_create_group));

    // Fetch rooms on mount
    useEffect(() => {
        fetchRooms();
    }, []);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeRoom]);

    // Mark Read on Room Entry
    useEffect(() => {
        if (activeRoom) {
            api.post(`/api/chat/rooms/${activeRoom.id}/read`).catch(console.error);
            setSelectedMsgs([]); // Clear selection on room change
        }
    }, [activeRoom]);

    // Sync activeRoom with updated rooms data for real-time status dots/text
    useEffect(() => {
        if (activeRoom && rooms.length > 0) {
            const updated = rooms.find(r => r.id === activeRoom.id);
            if (updated && (updated.is_online !== activeRoom.is_online || updated.last_seen !== activeRoom.last_seen)) {
                setActiveRoom(updated);
            }
        }
    }, [rooms]);

    const formatLastMessage = (room) => {
        const { last_message: content, last_message_type: type } = room;
        if (!content) return <span className="italic opacity-70">Start a conversation</span>;
        if (content === "This message was deleted") return <span className="flex items-center gap-1 italic text-gray-400"><IoTrash size={14} /> Message deleted</span>;

        if (type === 'image' || content.startsWith('[image]:')) return <span className="flex items-center gap-1"><IoImage className="text-indigo-500" size={14} /> Image</span>;
        if (type === 'video' || content.startsWith('[video]:')) return <span className="flex items-center gap-1"><IoVideocam className="text-pink-500" size={14} /> Video</span>;
        if (type === 'audio' || content.startsWith('[audio]:')) return <span className="flex items-center gap-1"><IoMic className="text-orange-500" size={14} /> Voice Message</span>;
        if (type === 'file' || content.startsWith('[file]:')) return <span className="flex items-center gap-1"><IoDocument className="text-blue-500" size={14} /> {content.startsWith('[file]:') ? 'Document' : content}</span>;

        return content;
    };

    const getFullAvatarUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    // Handle Blur for Restricted Rooms
    useEffect(() => {
        const handleBlur = () => {
            if (activeRoom?.is_restricted) setIsBlur(true);
        };
        const handleFocus = () => {
            setIsBlur(false);
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [activeRoom]);

    const handleMessageClick = (msg) => {
        if (msg.is_deleted) return;
        // If selection mode is active or long press (simulated by toggle)
        if (selectedMsgs.length > 0) {
            toggleSelection(msg.id);
        } else {
            // Preview logic handled in render
        }
    };

    const toggleSelection = (msgId) => {
        setSelectedMsgs(prev =>
            prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
        );
    };

    const handleDeleteSelected = (deleteType) => {
        const msgsToDelete = [...selectedMsgs];
        const currentRoomId = activeRoom?.id;

        setSelectedMsgs([]);
        setShowDeleteModal(false);

        // Start local undo state
        setUndoDeletion({
            ids: msgsToDelete,
            type: deleteType,
            countdown: 5,
            roomId: currentRoomId
        });

        // Timer for actual API call
        let count = 5;
        if (undoTimerRef.current) clearInterval(undoTimerRef.current);

        undoTimerRef.current = setInterval(async () => {
            count -= 1;
            setUndoDeletion(prev => prev ? { ...prev, countdown: count } : null);

            if (count <= 0) {
                clearInterval(undoTimerRef.current);
                await performActualDeletion(msgsToDelete, deleteType, currentRoomId);
            }
        }, 1000);
    };

    const performActualDeletion = async (ids, deleteType, roomId) => {
        try {
            await Promise.all(ids.map(id => api.delete(`/api/chat/messages/${id}?delete_type=${deleteType}`)));
            setUndoDeletion(null);
            // Only refresh if we are still in the same room
            fetchMessages(roomId);
        } catch (err) {
            showAlert("Action Failed", err.response?.data?.detail || "Delete failed");
            setUndoDeletion(null);
        }
    };

    const handleUndoDeletion = () => {
        if (undoTimerRef.current) clearInterval(undoTimerRef.current);
        setUndoDeletion(null);
        // Messages will naturally reappear because we stop filtering them
    };


    const handleFetchInfo = async () => {
        if (selectedMsgs.length !== 1) return;
        try {
            const res = await api.get(`/api/chat/messages/${selectedMsgs[0]}/info`);
            setMsgInfo(res.data);
            setShowInfoModal(true);
        } catch (err) { console.error(err); }
    };

    const handleFetchRoomInfo = async () => {
        if (!activeRoom) return;
        try {
            const res = await api.get(`/api/chat/rooms/${activeRoom.id}/info`);
            setRoomDetails(res.data);
            setShowGroupInfo(true);
        } catch (err) { console.error(err); }
    };

    const handleSelectMember = (user) => {
        if (pendingMembers.find(u => u.id === user.id)) return;
        setPendingMembers([...pendingMembers, user]);
        setAddMemberQuery("");
        setSearchedMembers([]);
    };

    const confirmAddMembers = async () => {
        if (pendingMembers.length === 0) return;
        try {
            await Promise.all(pendingMembers.map(u =>
                api.post(`/api/chat/rooms/${activeRoom.id}/participants`, { user_id: u.id })
            ));
            handleFetchRoomInfo();
            setPendingMembers([]);
            showAlert("Success", `${pendingMembers.length} members added`);
        } catch (err) {
            console.error(err);
            showAlert("Error", "Failed to add some members");
        }
    };

    const handleRemoveMember = async (userId) => {
        showConfirm(
            "Remove Member",
            "Are you sure you want to remove this user from the group?",
            async () => {
                try {
                    await api.delete(`/api/chat/rooms/${activeRoom.id}/participants/${userId}`);
                    handleFetchRoomInfo(); // Refresh list
                } catch (err) { showAlert("Error", "Failed to remove member"); }
            }
        );
    };

    const handleUpdateRoomName = async () => {
        if (!editedName.trim() || editedName === roomDetails?.room.name) {
            setIsEditingName(false);
            return;
        }
        try {
            await api.patch(`/api/chat/rooms/${activeRoom.id}`, { name: editedName });
            setRoomDetails(prev => ({ ...prev, room: { ...prev.room, name: editedName } }));
            setIsEditingName(false);
            fetchRooms(); // Refresh sidebar list
        } catch (err) { showAlert("Error", "Failed to update group name"); }
    };

    const handleUpdateRoomDescription = async () => {
        if (editedDescription === roomDetails?.room.description) {
            setIsEditingDescription(false);
            return;
        }
        try {
            await api.patch(`/api/chat/rooms/${activeRoom.id}`, { description: editedDescription });
            setRoomDetails(prev => ({ ...prev, room: { ...prev.room, description: editedDescription } }));
            setIsEditingDescription(false);
            fetchRooms();
        } catch (err) { showAlert("Error", "Failed to update group description"); }
    };

    const handleGroupAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post(`/api/chat/rooms/${activeRoom.id}/avatar`, formData);
            setRoomDetails(prev => ({ ...prev, room: { ...prev.room, avatar: res.data.avatar_url } }));
            fetchRooms();
            showAlert("Success", "Group image updated");
        } catch (err) { showAlert("Error", "Could not upload group image"); }
    };
    const handleViewProfile = async (userId) => {
        try {
            const res = await api.get(`/api/chat/users/${userId}/profile`);
            setViewingProfile(res.data);
        } catch (err) { showAlert("Error", "Could not load profile"); }
    };

    // Search users for adding to group
    useEffect(() => {
        if (!addMemberQuery) { setSearchedMembers([]); return; }
        const timeout = setTimeout(async () => {
            const res = await api.get('/api/chat/users');
            const filtered = res.data.filter(u =>
                (u.full_name || u.username).toLowerCase().includes(addMemberQuery.toLowerCase()) &&
                !roomDetails?.participants.some(p => p.user_id === u.id) // Exclude existing
            );
            setSearchedMembers(filtered);
        }, 300);
        return () => clearTimeout(timeout);
    }, [addMemberQuery, roomDetails]);

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
        setShowCreateGroup(false);
        setIsBlur(false);
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

            await fetchRooms();
            const newRoom = { id: res.data.id, name: targetUser.full_name, room_type: 'direct' };
            handleSelectRoom(newRoom);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName || selectedUsers.length === 0) return;
        try {
            const res = await api.post('/api/chat/rooms', {
                participant_ids: selectedUsers,
                name: groupName,
                description: groupDescription,
                room_type: 'group',
                is_restricted: isRestrictedGroup // Send security flag
            });

            await fetchRooms();
            const newRoom = { id: res.data.id, name: groupName, room_type: 'group', is_restricted: isRestrictedGroup };
            handleSelectRoom(newRoom);
            setGroupName('');
            setGroupDescription('');
            setSelectedUsers([]);
            setIsRestrictedGroup(false);
            setShowCreateGroup(false);
        } catch (err) {
            console.error(err);
            showAlert("Failed", err.response?.data?.detail || "Failed to create group.");
        }
    };

    // --- Media Handling ---

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeRoom) return;

        // Show loading state/spinner if needed
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/api/chat/upload', formData);

            let fileType = 'file';
            if (file.type.startsWith('image/')) fileType = 'image';
            else if (file.type.startsWith('video/')) fileType = 'video';
            else if (file.type.startsWith('audio/')) fileType = 'audio';

            // We still send formatted content for backward compatibility in the renderer
            // but the database now has message_type and attachment_url separated.
            const content = fileType === 'file' ? file.name : `[${fileType}]:${res.data.url}`;
            sendMessage(activeRoom.id, content, fileType, res.data.url);

        } catch (err) {
            console.error("Upload failed", err);
            showAlert("Upload Error", "Could not upload file.");
        } finally {
            e.target.value = ''; // Clear input
        }
    };

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Microphone access is not supported in this browser or requires HTTPS.");
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([audioBlob], "voice_msg.webm", { type: 'audio/webm' });

                const formData = new FormData();
                formData.append('file', file);
                try {
                    const res = await api.post('/api/chat/upload', formData);
                    const content = `[audio]:${res.data.url}`;
                    sendMessage(activeRoom.id, content, 'audio', res.data.url);
                } catch (e) { console.error(e); }

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic error", err);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // --- Rendering Messages ---

    const renderMessageContent = (msg) => {
        const { content, message_type, attachment_url } = msg;
        if (!content && !attachment_url) return null;

        let type = message_type || 'text';
        let url = attachment_url ? `${baseURL}${attachment_url.startsWith('/') ? '' : '/'}${attachment_url}` : null;

        // Backward compatibility
        if (type === 'text' && content && content.startsWith('[')) {
            const match = content.match(/^\[(image|video|audio|file)\]:(.*)/);
            if (match) {
                type = match[1];
                url = `${baseURL}${match[2].startsWith('/') ? '' : '/'}${match[2]}`;
            }
        }

        const isRestricted = activeRoom?.is_restricted;
        const isMe = msg.sender_id === user.id;

        switch (type) {
            case 'image':
                return (
                    <div className="relative group">
                        {isRestricted && <div className="absolute inset-0 z-10" onContextMenu={(e) => e.preventDefault()}></div>}
                        <img
                            src={url}
                            alt="Shared"
                            className="max-w-[280px] sm:max-w-xs rounded-xl select-none cursor-pointer hover:brightness-95 transition-all shadow-sm border border-black/5"
                            draggable="false"
                            onContextMenu={(e) => isRestricted && e.preventDefault()}
                            onClick={() => !isRestricted && setPreviewImage(url)}
                        />
                    </div>
                );
            case 'video':
                return (
                    <div className="relative">
                        <video
                            src={url}
                            controls={!isRestricted}
                            className="max-w-[280px] sm:max-w-xs rounded-xl shadow-sm border border-black/5"
                        />
                    </div>
                );
            case 'audio':
                return (
                    <div className={`p-2 rounded-xl border ${isMe ? 'bg-emerald-700/50 border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
                        <audio
                            src={url}
                            controls
                            className="max-w-[240px] h-8"
                        />
                    </div>
                );
            case 'file':
                return (
                    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isMe
                        ? 'bg-emerald-700/30 border-emerald-500/50'
                        : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                        } min-w-[220px] max-w-sm group/file hover:bg-opacity-50`}>
                        <div className={`p-3 rounded-2xl shadow-lg ${isMe ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'}`}>
                            <IoDocument size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${isMe ? 'text-white' : 'dark:text-white'}`}>{content || "Document"}</p>
                            <p className="text-[10px] opacity-60 uppercase font-black tracking-widest mt-0.5">
                                {content?.split('.').pop() || 'File'}
                            </p>
                        </div>
                        {!isRestricted && (
                            <a
                                href={url}
                                download
                                className={`p-2.5 rounded-xl transition-all ${isMe ? 'hover:bg-emerald-600 text-white' : 'hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-500'}`}
                            >
                                <IoDownload size={22} />
                            </a>
                        )}
                    </div>
                );
            default:
                return <span className={`text-[15px] leading-relaxed ${isRestricted ? "select-none" : ""}`}>{content}</span>;
        }
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
            const now = Date.now();
            if (now - lastTypingSent.current > 2000) {
                sendTyping(activeRoom?.id);
                lastTypingSent.current = now;
            }
        }
    };

    // Filter users
    const filteredUsers = availableUsers.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
            // If today, show time, else show date
            const isToday = new Date().toDateString() === date.toDateString();
            if (isToday) {
                return `Last seen at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            return `Last seen on ${date.toLocaleDateString()}`;
        }
        return 'Offline';
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);
    };

    const scrollToBottom = () => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    };

    if (!user) return null;

    return (
        <DashboardLayout activeTab="chats" userRole={user.role}>
            <style>
                {`
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    .chat-bg {
                        background-color: #efeae2;
                        background-image: url("https://w0.peakpx.com/wallpaper/580/630/HD-wallpaper-whatsapp-background-dark-background-whatsapp-drawing-minimalism.jpg");
                        background-blend-mode: overlay;
                    }
                    .dark .chat-bg {
                        background-color: #0b141a;
                        background-blend-mode: soft-light;
                    }
                `}
            </style>
            <div className="flex h-full bg-[#efeae2] dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 overflow-hidden relative">

                {/* Sidebar */}
                <motion.div
                    animate={{ width: isSidebarCollapsed ? 0 : (window.innerWidth < 768 ? '100%' : 320) }}
                    className={`border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full transition-all duration-300 overflow-hidden ${activeRoom || showNewChat || showCreateGroup ? 'hidden md:flex' : 'flex'}`}
                >
                    <div className="min-w-[320px] h-full flex flex-col">
                        <div className="p-3 bg-[#f0f2f5] dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                    {isSearching ? 'Search' : 'Chats'}
                                </h2>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setIsSearching(!isSearching)}
                                        className={`p-2 rounded-full transition-colors ${isSearching ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        <IoSearch size={20} />
                                    </button>
                                    {canCreateGroup && (
                                        <button
                                            onClick={() => { setShowCreateGroup(true); setShowNewChat(false); fetchUsers(); }}
                                            className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                                            title="Create Group"
                                        >
                                            <IoPeople size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setShowNewChat(true); setShowCreateGroup(false); fetchUsers(); }}
                                        className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                                        title="New Chat"
                                    >
                                        <IoAdd size={24} />
                                    </button>
                                </div>
                            </div>
                            <AnimatePresence>
                                {isSearching && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="relative overflow-hidden"
                                    >
                                        <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search or start new chat"
                                            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 dark:text-white shadow-sm"
                                            autoFocus
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            {rooms.map(room => (
                                <div
                                    key={room.id}
                                    onClick={() => handleSelectRoom(room)}
                                    className={`p-4 cursor-pointer transition-all duration-300 border-b border-gray-50 dark:border-slate-800/50 group/room ${activeRoom?.id === room.id
                                        ? 'bg-emerald-50 dark:bg-emerald-900/10'
                                        : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-white font-bold text-xl shadow-md transition-all ${room.room_type === 'group'
                                                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-500'
                                                    : 'bg-gradient-to-tr from-indigo-500 to-blue-500'
                                                    }`}>
                                                {room.room_type === 'group' ? (
                                                    <IoPeople size={28} />
                                                ) : room.avatar ? (
                                                    <img src={getFullAvatarUrl(room.avatar)} className="w-full h-full rounded-[1.25rem] object-cover" />
                                                ) : (
                                                    (room.name?.[0]?.toUpperCase() || '?')
                                                )}
                                            </motion.div>
                                            {room.room_type === 'direct' && (
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${room.is_online ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-300'}`} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <p className={`font-semibold transition-colors ${activeRoom?.id === room.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'}`}>{room.name}</p>
                                                    {room.is_restricted && <IoShieldCheckmark className="text-emerald-500" size={12} title="Secure Chat" />}
                                                </div>
                                                {room.last_message_at && (
                                                    <span className={`text-[10px] ${room.unread_count > 0 ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                                                        {formatMessageTime(room.last_message_at)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <p className={`text-[13px] truncate flex items-center gap-1.5 ${room.unread_count > 0 ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-500'}`}>
                                                    {formatLastMessage(room)}
                                                </p>
                                                {room.unread_count > 0 && (
                                                    <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center bg-emerald-500 text-white text-[10px] font-black rounded-full shadow-sm">
                                                        {room.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Sidebar Toggle Button (Desktop) */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-[70] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 w-5 h-10 items-center justify-center rounded-r-lg shadow-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                    style={{ left: isSidebarCollapsed ? 0 : 320 }}
                >
                    {isSidebarCollapsed ? <IoChevronForward size={14} className="text-gray-400" /> : <IoChevronBack size={14} className="text-gray-400" />}
                </button>

                {/* Main Content */}
                <div className={`flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] h-full relative overflow-hidden transition-all duration-300 ${!activeRoom && !showNewChat && !showCreateGroup ? 'hidden md:flex' : 'flex'}`}>

                    {/* Security Blur Overlay */}
                    {activeRoom?.is_restricted && isBlur && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl z-[9999] flex items-center justify-center">
                            <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl">
                                <IoShieldCheckmark size={48} className="mx-auto text-green-500 mb-4" />
                                <h3 className="text-xl font-bold dark:text-white">Secure Chat</h3>
                                <p className="text-gray-500 dark:text-gray-400">Content hidden for privacy.</p>
                            </div>
                        </div>
                    )}

                    {/* Watermark for Restricted Rooms */}
                    {activeRoom?.is_restricted && (
                        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.03] select-none flex flex-wrap content-center justify-center items-center gap-12" style={{ transform: 'rotate(-20deg) scale(1.5)' }}>
                            {Array.from({ length: 40 }).map((_, i) => (
                                <span key={i} className="text-xl font-bold text-black dark:text-white whitespace-nowrap">
                                    {user.username} {new Date().toLocaleDateString()}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Create Group Modal */}
                    {showCreateGroup ? (
                        <div className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900 absolute inset-0 z-[100]">
                            <div className="max-w-xl mx-auto w-full p-4 sm:p-8 space-y-5">
                                <div className="mb-6 flex items-center gap-4">
                                    <button onClick={() => setShowCreateGroup(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                        <IoArrowBack size={20} className="dark:text-white" />
                                    </button>
                                    <h2 className="text-xl font-bold dark:text-white">Create New Group</h2>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Group Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. IT Team, Project Alpha"
                                            value={groupName}
                                            onChange={e => setGroupName(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Group Description</label>
                                        <textarea
                                            placeholder="What is this group about?"
                                            value={groupDescription}
                                            onChange={e => setGroupDescription(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none h-24 dark:text-white"
                                        />
                                    </div>

                                    {user.role === 'admin' && (
                                        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700/50">
                                            <input
                                                type="checkbox"
                                                checked={isRestrictedGroup}
                                                onChange={e => setIsRestrictedGroup(e.target.checked)}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                                id="restrict-mode"
                                            />
                                            <label htmlFor="restrict-mode" className="flex-1 cursor-pointer">
                                                <span className="block font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <IoShieldCheckmark className="text-green-500" /> High Security Mode
                                                </span>
                                                <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                    Prevents downloading media, blocks screenshots (watermark/blur), and disables right-click.
                                                </span>
                                            </label>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Select Members</label>
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mb-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
                                        />
                                        <div className="max-h-56 overflow-y-auto border border-gray-100 dark:border-slate-800 rounded-xl divide-y dark:divide-slate-800/50 bg-gray-50/50 dark:bg-slate-900/50">
                                            {filteredUsers.map(u => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => {
                                                        if (selectedUsers.includes(u.id)) {
                                                            setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                                        } else {
                                                            setSelectedUsers([...selectedUsers, u.id]);
                                                        }
                                                    }}
                                                    className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 ${selectedUsers.includes(u.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs">{u.full_name?.[0]}</div>
                                                        <div>
                                                            <p className="text-sm font-medium dark:text-white">{u.full_name}</p>
                                                            <p className="text-xs text-gray-500">{u.role}</p>
                                                        </div>
                                                    </div>
                                                    {selectedUsers.includes(u.id) && <IoPeople className="text-indigo-600" />}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-bold uppercase tracking-tight ml-1">{selectedUsers.length} members selected</p>
                                    </div>

                                    <button
                                        onClick={handleCreateGroup}
                                        disabled={!groupName || selectedUsers.length === 0}
                                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-[0.98]"
                                    >
                                        Create Group
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : showNewChat ? (
                        <div className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900 absolute inset-0 z-[100]">
                            <div className="max-w-xl mx-auto w-full p-4 sm:p-8 space-y-5">
                                <div className="mb-6 flex items-center gap-4">
                                    <button onClick={() => setShowNewChat(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                        <IoArrowBack size={20} className="dark:text-white" />
                                    </button>
                                    <h2 className="text-xl font-bold dark:text-white">New Direct Message</h2>
                                </div>
                                <div className="relative">
                                    <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search people..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white shadow-sm"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1 mt-4">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Suggested Contacts</label>
                                    {filteredUsers.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => handleStartNewChat(u)}
                                            className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-all group/user"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm group-hover/user:scale-105 transition-transform">
                                                {u.full_name?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-[15px] dark:text-white truncate">{u.full_name}</p>
                                                <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : activeRoom ? (
                        <>
                            {/* Header: Normal or Selection Mode */}
                            <div className="p-3 bg-[#f0f2f5] dark:bg-slate-800/80 border-b dark:border-slate-700 flex items-center justify-between sticky top-0 z-[60] backdrop-blur-md">
                                {selectedMsgs.length > 0 ? (
                                    <div className="flex items-center gap-4 w-full h-10">
                                        <button onClick={() => setSelectedMsgs([])}><IoClose size={24} className="dark:text-white" /></button>
                                        <span className="font-semibold dark:text-white">{selectedMsgs.length} Selected</span>
                                        <div className="flex-1" />
                                        {selectedMsgs.length === 1 && (
                                            <button onClick={handleFetchInfo} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-slate-800 focus:outline-none">
                                                <IoInformationCircle size={24} className="text-gray-500 dark:text-gray-400" />
                                            </button>
                                        )}
                                        <button onClick={() => setShowDeleteModal(true)} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-slate-800 text-red-500 focus:outline-none">
                                            <IoTrash size={24} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 cursor-pointer w-full" onClick={handleFetchRoomInfo}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveRoom(null);
                                                setShowNewChat(false);
                                                setShowCreateGroup(false);
                                            }}
                                            className="md:hidden p-1 -ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <IoArrowBack size={24} className="dark:text-white" />
                                        </button>
                                        <div className="relative">
                                            {activeRoom.avatar ? (
                                                <img src={getFullAvatarUrl(activeRoom.avatar)} alt="Avatar" className="w-10 h-10 rounded-full bg-indigo-100 object-cover" />
                                            ) : (
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${activeRoom.room_type === 'group' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                                                    {activeRoom.room_type === 'group' ? <IoPeople size={20} /> : (activeRoom.name?.[0]?.toUpperCase() || '#')}
                                                </div>
                                            )}
                                            {activeRoom.room_type === 'direct' && (
                                                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#f0f2f5] dark:border-slate-800 ${activeRoom.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold dark:text-gray-200 truncate pr-2">{activeRoom.name || 'Chat'}</h3>
                                            <p className={`text-[11px] truncate ${activeRoom.is_online ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {activeRoom.is_restricted ? (
                                                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                                                        <IoShieldCheckmark size={12} /> Secure Encryption
                                                    </span>
                                                ) : getStatusString(activeRoom)}
                                            </p>
                                        </div>
                                        <div className="flex gap-4 px-2">
                                            <IoCall className="text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50" size={20} />
                                            <button onClick={(e) => { e.stopPropagation(); setIsMessageSearching(!isMessageSearching); }}>
                                                <IoSearch className={isMessageSearching ? "text-emerald-600" : "text-gray-500 dark:text-gray-400"} size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Message Search Bar */}
                            <AnimatePresence>
                                {isMessageSearching && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="bg-white dark:bg-slate-800 p-2 px-4 shadow-sm border-b dark:border-slate-700 z-50 flex items-center gap-2"
                                    >
                                        <div className="flex-1 relative">
                                            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={msgSearchQuery}
                                                onChange={(e) => setMsgSearchQuery(e.target.value)}
                                                placeholder="Search messages..."
                                                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 dark:text-white"
                                                autoFocus
                                            />
                                        </div>
                                        <button onClick={() => { setIsMessageSearching(false); setMsgSearchQuery(''); }} className="p-2 text-gray-500 hover:text-emerald-600">
                                            <IoClose size={20} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {/* Messages Area */}
                            <div
                                ref={scrollRef}
                                onScroll={handleScroll}
                                className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 relative z-10 no-scrollbar chat-bg"
                                onContextMenu={(e) => activeRoom.is_restricted && e.preventDefault()}
                            >
                                <div className="absolute inset-0 bg-transparent dark:bg-black/20 -z-10" />

                                {(messages[activeRoom.id] || [])
                                    .filter(m => !undoDeletion?.ids.includes(m.id))
                                    .filter(m => !msgSearchQuery || (m.content && m.content.toLowerCase().includes(msgSearchQuery.toLowerCase())) || (m.type === 'file' && m.file_name && m.file_name.toLowerCase().includes(msgSearchQuery.toLowerCase())))
                                    .map((msg, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 30, scale: 0.8 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{
                                                type: 'spring',
                                                damping: 15,
                                                stiffness: 150,
                                                mass: 0.8
                                            }}
                                            key={msg.id || i}
                                            className={`flex gap-2 mb-4 ${msg.sender_id === user.id ? 'flex-row-reverse' : 'flex-row'} items-end group`}
                                        >
                                            {/* Avatar only for others in groups */}
                                            {msg.sender_id !== user.id && activeRoom.room_type === 'group' && (
                                                <div
                                                    className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mb-1 shadow-sm border-2 border-white dark:border-slate-800 cursor-pointer hover:scale-110 transition-transform"
                                                    onClick={() => handleViewProfile(msg.sender_id)}
                                                >
                                                    {msg.sender_avatar ? (
                                                        <img
                                                            src={getFullAvatarUrl(msg.sender_avatar)}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                        />
                                                    ) : null}
                                                    <div className="w-full h-full items-center justify-center bg-gradient-to-tr from-indigo-500 to-purple-500 text-white text-[10px] font-bold" style={{ display: msg.sender_avatar ? 'none' : 'flex' }}>
                                                        {msg.sender_name?.[0]?.toUpperCase()}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`flex flex-col ${msg.sender_id === user.id ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
                                                {/* Show sender name in groups */}
                                                {activeRoom.room_type === 'group' && msg.sender_id !== user.id && (
                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 ml-1 mb-0.5 font-bold">{msg.sender_name}</span>
                                                )}

                                                <div
                                                    className={`px-3 py-1.5 rounded-xl break-words relative cursor-pointer outline-none transition-all shadow-sm ${selectedMsgs.includes(msg.id) ? 'bg-indigo-300 dark:bg-indigo-900 ring-2 ring-indigo-500' :
                                                        msg.sender_id === user.id
                                                            ? 'bg-[#dcf8c6] dark:bg-emerald-900/40 text-gray-800 dark:text-gray-100 rounded-tr-none'
                                                            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-tl-none'
                                                        } ${isBlur && activeRoom.is_restricted ? 'blur-sm select-none' : ''}`}
                                                    style={{ minWidth: '60px' }}
                                                    onClick={() => selectedMsgs.length > 0 ? toggleSelection(msg.id) : null}
                                                    onContextMenu={(e) => { e.preventDefault(); toggleSelection(msg.id); }}
                                                >
                                                    {/* Render Content */}
                                                    <div className="pb-3 pr-2">
                                                        {renderMessageContent(msg)}
                                                    </div>

                                                    {/* WhatsApp style metadata - inside bubble bottom right */}
                                                    <div className={`absolute bottom-1 right-2 flex items-center gap-1`}>
                                                        <span className={`text-[9px] ${msg.sender_id === user.id ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'}`}>
                                                            {formatMessageTime(msg.created_at)}
                                                        </span>
                                                        {msg.sender_id === user.id && (
                                                            msg.read_status === 'read'
                                                                ? <IoCheckmarkDone size={12} className="text-blue-500" />
                                                                : <IoCheckmark size={12} className="text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                {Object.keys(typingStatus[activeRoom.id] || {}).length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-2 text-gray-500 text-[10px] ml-2 mb-2 font-bold uppercase tracking-wider"
                                    >
                                        <div className="flex gap-2 items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-emerald-200 dark:border-emerald-900/30">
                                            <div className="flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                            </div>
                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                {Object.values(typingStatus[activeRoom.id]).join(', ')}
                                                {Object.keys(typingStatus[activeRoom.id]).length > 1 ? ' are typing' : ' is typing'}...
                                            </span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Scroll to Bottom Button */}
                                <AnimatePresence>
                                    {showScrollBottom && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            onClick={scrollToBottom}
                                            className="fixed bottom-24 right-6 z-[60] w-10 h-10 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center shadow-lg border border-gray-100 dark:border-slate-700 hover:bg-gray-50 transition-all"
                                        >
                                            <IoChevronDown size={20} />
                                            {activeRoom && (rooms.find(r => r.id === activeRoom.id)?.unread_count || 0) > 0 && (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                                                    {rooms.find(r => r.id === activeRoom.id).unread_count}
                                                </span>
                                            )}
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Input Area (Rich Media) */}
                            <div className="p-2 sm:p-3 bg-[#f0f2f5] dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 relative z-20">
                                <div className="relative flex items-center gap-2 max-w-5xl mx-auto">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        accept="image/*,video/*"
                                    />

                                    <input
                                        type="file"
                                        ref={fileInputDocRef}
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                                    />

                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors" title="Upload Image/Video">
                                        <IoImage size={24} />
                                    </button>

                                    <button onClick={() => fileInputDocRef.current?.click()} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors" title="Upload Document">
                                        <IoAttach size={24} />
                                    </button>

                                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl px-4 py-2 flex items-center shadow-sm border border-gray-200 dark:border-slate-700">
                                        <textarea
                                            value={inputValue}
                                            onChange={(e) => {
                                                setInputValue(e.target.value);
                                                const now = Date.now();
                                                if (now - lastTypingTime.current > 3000) {
                                                    if (activeRoom) sendTyping(activeRoom.id);
                                                    lastTypingTime.current = now;
                                                }
                                            }}
                                            onKeyDown={handleKeyPress}
                                            placeholder="Type a message"
                                            rows="1"
                                            className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[15px] max-h-32 min-h-[20px] resize-none dark:text-white"
                                            style={{ height: 'auto', }}
                                        />
                                    </div>

                                    <div className="flex items-center">
                                        {inputValue.trim() ? (
                                            <button
                                                onClick={handleSend}
                                                className="w-11 h-11 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700 transition-all shadow-md active:scale-90"
                                            >
                                                <IoSend size={20} className="ml-1" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={isRecording ? stopRecording : startRecording}
                                                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 ${isRecording ? 'text-white bg-rose-500 animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                            >
                                                <IoMic size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <div className="w-32 h-32 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                <IoChatbubblesOutline size={64} className="opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Select a conversation</h3>
                            <button
                                onClick={() => { setShowNewChat(true); fetchUsers(); }}
                                className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                            >
                                Start New Chat
                            </button>
                        </div>
                    )}
                </div>

                {/* Delete Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg w-80 shadow-xl">
                            <h3 className="font-bold mb-4 dark:text-white">Delete Message(s)?</h3>
                            <div className="space-y-3">
                                <button onClick={() => handleDeleteSelected('me')} className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded dark:text-gray-300">
                                    Delete for me
                                </button>
                                {/* Only show 'For Everyone' if: sender is user/admin AND within 24h limit */}
                                {(user.role === 'admin' || selectedMsgs.every(id => messages[activeRoom?.id]?.find(m => m.id === id)?.sender_id === user.id)) &&
                                    selectedMsgs.every(id => isWithin24Hours(messages[activeRoom?.id]?.find(m => m.id === id)?.created_at)) && (
                                        <button onClick={() => handleDeleteSelected('everyone')} className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-red-500 dark:text-red-400">
                                            Delete for everyone
                                        </button>
                                    )}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Undo Toast */}
                <AnimatePresence>
                    {undoDeletion && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-slate-900/90 backdrop-blur text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10"
                        >
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold">Deleting {undoDeletion.ids.length} message{undoDeletion.ids.length > 1 ? 's' : ''}...</span>
                                <span className="text-[10px] text-gray-400">Executing in {undoDeletion.countdown}s</span>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <button
                                onClick={handleUndoDeletion}
                                className="text-indigo-400 font-bold text-sm hover:text-indigo-300 transition-colors uppercase tracking-wider"
                            >
                                Undo
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Info Modal */}
                {showInfoModal && msgInfo && (
                    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center" onClick={() => setShowInfoModal(false)}>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg w-96 shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h3 className="font-bold mb-4 dark:text-white">Message Info</h3>
                            <div className="space-y-4">
                                {msgInfo.map((p) => (
                                    <div key={p.user_id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <span>{p.name[0]}</span>}
                                            </div>
                                            <span className="font-medium text-sm dark:text-gray-200">{p.name}</span>
                                        </div>
                                        <div className="text-right">
                                            {p.status === 'read' ? <IoCheckmarkDone className="text-blue-500 inline mr-1" /> : <IoCheckmark className="text-gray-400 inline mr-1" />}
                                            <span className="text-xs text-gray-500 block">{p.read_at ? new Date(p.read_at).toLocaleString() : p.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={() => setShowInfoModal(false)} className="px-4 py-2 text-sm text-gray-500">Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Group Info Modal */}
                {showGroupInfo && roomDetails && (
                    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-end" onClick={() => setShowGroupInfo(false)}>
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            className="bg-white dark:bg-slate-900 w-80 h-full p-6 shadow-xl relative overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setShowGroupInfo(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors z-10">
                                <IoClose size={24} className="dark:text-white" />
                            </button>
                            <h2 className="text-xl font-bold mb-6 dark:text-white">
                                {activeRoom.room_type === 'group' ? 'Group Info' : 'User Profile'}
                            </h2>

                            <div className="flex flex-col items-center mb-8">
                                {activeRoom.room_type === 'group' ? (
                                    <>
                                        <div className="relative group/avatar mb-4">
                                            <div className="w-24 h-24 rounded-3xl bg-indigo-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden">
                                                {roomDetails.room.avatar ? (
                                                    <img src={getFullAvatarUrl(roomDetails.room.avatar)} className="w-full h-full object-cover" />
                                                ) : (
                                                    (roomDetails.room.name?.[0] || activeRoom?.name?.[0] || '?').toUpperCase()
                                                )}
                                            </div>
                                            {(roomDetails.room.creator_id === user.id || ['admin', 'manager'].includes(user.role)) && (
                                                <button
                                                    onClick={() => groupAvatarInputRef.current?.click()}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-3xl"
                                                >
                                                    <IoCamera size={24} />
                                                </button>
                                            )}
                                            <input type="file" ref={groupAvatarInputRef} className="hidden" accept="image/*" onChange={handleGroupAvatarUpload} />
                                        </div>

                                        {isEditingName ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    className="bg-gray-100 dark:bg-slate-800 border-none rounded px-2 py-1 text-center font-bold dark:text-white focus:ring-1 focus:ring-indigo-500 text-lg"
                                                    autoFocus
                                                    onBlur={handleUpdateRoomName}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateRoomName()}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group/name">
                                                <h3 className="font-bold text-xl dark:text-white">{roomDetails.room.name}</h3>
                                                {(roomDetails.room.creator_id === user.id || ['admin', 'manager'].includes(user.role)) && (
                                                    <button
                                                        onClick={() => { setIsEditingName(true); setEditedName(roomDetails.room.name); }}
                                                        className="p-1 opacity-0 group-hover/name:opacity-100 text-gray-400 hover:text-indigo-500 transition-opacity"
                                                    >
                                                        <IoCreate size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-4 w-full text-center">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Description</h4>
                                            {isEditingDescription ? (
                                                <textarea
                                                    value={editedDescription}
                                                    onChange={(e) => setEditedDescription(e.target.value)}
                                                    className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-sm dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 resize-none h-20"
                                                    autoFocus
                                                    onBlur={handleUpdateRoomDescription}
                                                />
                                            ) : (
                                                <div className="group/desc relative">
                                                    <p className="text-sm dark:text-gray-300 px-4 italic">
                                                        {roomDetails.room.description || "No description set"}
                                                    </p>
                                                    {(roomDetails.room.creator_id === user.id || ['admin', 'manager'].includes(user.role)) && (
                                                        <button
                                                            onClick={() => { setIsEditingDescription(true); setEditedDescription(roomDetails.room.description || ""); }}
                                                            className="absolute -right-2 top-0 p-1 opacity-0 group-hover/desc:opacity-100 text-gray-400 hover:text-indigo-500 transition-opacity"
                                                        >
                                                            <IoCreate size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-center mt-4">
                                            <p className="text-[10px] text-gray-400">Created {new Date(roomDetails.room.created_at).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">By {roomDetails.room.creator_name}</p>
                                        </div>
                                    </>
                                ) : (
                                    roomDetails.participants.filter(p => p.user_id !== user.id).map(p => (
                                        <div key={p.user_id} className="flex flex-col items-center px-4 w-full">
                                            <div className="w-28 h-28 rounded-full bg-indigo-500 flex items-center justify-center text-white text-4xl font-bold mb-4 shadow-xl overflow-hidden border-4 border-white dark:border-slate-800">
                                                {p.avatar ? (
                                                    <img src={getFullAvatarUrl(p.avatar)} className="w-full h-full object-cover" />
                                                ) : (
                                                    p.name?.[0]?.toUpperCase()
                                                )}
                                            </div>
                                            <h3 className="font-bold text-2xl dark:text-white text-center mb-1">{p.name}</h3>
                                            <div className="flex items-center gap-2 mb-6">
                                                <div className={`w-2 h-2 rounded-full ${p.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {p.is_online ? 'Active Now' : (p.last_seen ? `Last seen ${new Date(p.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline')}
                                                </span>
                                            </div>

                                            <div className="w-full space-y-5 pt-6 border-t border-gray-100 dark:border-slate-800">
                                                {p.job_title && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Position</span>
                                                        <span className="text-sm dark:text-gray-200 font-medium">{p.job_title}</span>
                                                    </div>
                                                )}
                                                {p.department && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Department</span>
                                                        <span className="text-sm dark:text-gray-200 font-medium">{p.department}</span>
                                                    </div>
                                                )}
                                                {p.email && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Email Address</span>
                                                        <a href={`mailto:${p.email}`} className="text-sm text-indigo-500 dark:text-indigo-400 font-medium hover:underline">{p.email}</a>
                                                    </div>
                                                )}
                                                {p.phone && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Mobile Number</span>
                                                        <span className="text-sm dark:text-gray-200 font-medium">{p.phone}</span>
                                                    </div>
                                                )}

                                                {/* Admin Actions for Direct Chats */}
                                                {user.role === 'admin' && (
                                                    <div className="w-full mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
                                                        <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-4">Admin Controls</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleStartEditUser(p); }}
                                                                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-xs font-bold"
                                                            >
                                                                <IoCreate size={16} /> Edit
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(p.user_id); }}
                                                                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-xs font-bold"
                                                            >
                                                                <IoTrash size={16} /> Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add Member (Group Only - Admin/Manager/Creator) */}
                            {roomDetails.room.room_type === 'group' && (roomDetails.room.creator_id === user.id || ['admin', 'manager'].includes(user.role)) && (
                                <div className="mb-6 relative">
                                    <h4 className="font-semibold mb-2 dark:text-white">Add Members</h4>
                                    <div className="flex gap-2">
                                        <input
                                            value={addMemberQuery}
                                            onChange={e => setAddMemberQuery(e.target.value)}
                                            placeholder="Search user..."
                                            className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-sm outline-none dark:text-white"
                                        />
                                    </div>
                                    {searchedMembers.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 shadow-xl rounded-lg mt-1 z-10 max-h-40 overflow-y-auto border dark:border-slate-700">
                                            {searchedMembers.map(u => (
                                                <div key={u.id} onClick={() => handleSelectMember(u)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs">{u.full_name[0]}</div>
                                                    <span className="text-sm dark:text-gray-200">{u.full_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Selected Pending Members */}
                                    {pendingMembers.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {pendingMembers.map(u => (
                                                <div key={u.id} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                                    {u.full_name}
                                                    <button onClick={() => setPendingMembers(pendingMembers.filter(p => p.id !== u.id))} className="hover:text-indigo-800 dark:hover:text-indigo-200">
                                                        <IoClose size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {pendingMembers.length > 0 && (
                                        <button
                                            onClick={confirmAddMembers}
                                            className="w-full mt-3 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                                        >
                                            Add {pendingMembers.length} Members
                                        </button>
                                    )}
                                </div>
                            )}

                            {activeRoom.room_type === 'group' && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                                    <h4 className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-4">Participants ({roomDetails.participants.length})</h4>
                                    <div className="space-y-3">
                                        {roomDetails.participants.map(p => (
                                            <div key={p.user_id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-2xl transition-all group/p">
                                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewProfile(p.user_id)}>
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover/p:border-indigo-400 transition-all">
                                                            {p.avatar ? (
                                                                <img src={getFullAvatarUrl(p.avatar)} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">{p.name[0]}</div>
                                                            )}
                                                        </div>
                                                        {p.is_online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm dark:text-gray-200">{p.name} {p.user_id === user.id && '(You)'}</p>
                                                        <p className="text-[10px] text-gray-500 capitalize">{p.role}</p>
                                                    </div>
                                                </div>
                                                {p.user_id !== user.id && (['admin', 'manager'].includes(user.role) || roomDetails.participants.find(mp => mp.user_id === user.id && mp.role === 'admin')) && (
                                                    <button onClick={() => handleRemoveMember(p.user_id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                                        <IoTrash size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}

                {/* Custom Confirm/Alert Dialog */}
                {confirmDialog.show && (
                    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-slate-800"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${confirmDialog.type === 'confirm' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {confirmDialog.type === 'confirm' ? <IoInformationCircle size={28} /> : <IoClose size={28} />}
                                </div>
                                <h3 className="text-xl font-bold dark:text-white">{confirmDialog.title}</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                {confirmDialog.message}
                            </p>
                            <div className="flex gap-3">
                                {confirmDialog.type === 'confirm' && (
                                    <button
                                        onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
                                        className="flex-1 py-3 px-4 rounded-2xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                                        setConfirmDialog({ ...confirmDialog, show: false });
                                    }}
                                    className={`flex-1 py-3 px-4 rounded-2xl font-semibold text-white shadow-lg transition-transform active:scale-95 ${confirmDialog.type === 'confirm' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                                >
                                    {confirmDialog.type === 'confirm' ? 'Confirm' : 'OK'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
                <AnimatePresence>
                    {previewImage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPreviewImage(null)}
                            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                        >
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-[101]"
                            >
                                <IoClose size={32} />
                            </button>
                            <motion.img
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                src={previewImage}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
                                onClick={(e) => e.stopPropagation()}
                                draggable="false"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Profile Modal */}
                <AnimatePresence>
                    {viewingProfile && (
                        <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingProfile(null)}>
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                                <button onClick={() => setViewingProfile(null)} className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full transition-colors"><IoClose size={24} /></button>

                                <div className="relative flex flex-col items-center pt-8 overflow-y-auto custom-scrollbar">
                                    <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 bg-gray-100 overflow-hidden shadow-lg mb-4 flex items-center justify-center relative flex-shrink-0 aspect-square">
                                        {viewingProfile.avatar_url ? (
                                            <img
                                                src={getFullAvatarUrl(viewingProfile.avatar_url)}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div className="w-full h-full items-center justify-center text-3xl font-bold text-emerald-500" style={{ display: viewingProfile.avatar_url ? 'none' : 'flex' }}>
                                            {viewingProfile.full_name[0]}
                                        </div>
                                        {/* Status Dot */}
                                        <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 ${viewingProfile.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    </div>
                                    <h3 className="text-2xl font-bold dark:text-white text-center">{viewingProfile.full_name}</h3>
                                    <div className="flex items-center gap-2 mb-6">
                                        <p className="text-emerald-500 font-semibold flex items-center gap-1">@{viewingProfile.username} • {viewingProfile.role}</p>
                                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${viewingProfile.is_online ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <IoEllipse size={8} /> {viewingProfile.is_online ? 'ONLINE' : 'OFFLINE'}
                                        </div>
                                    </div>
                                    <div className="w-full space-y-3 overflow-y-auto max-h-[350px] pr-1">
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${viewingProfile.is_online ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                                <IoInformationCircle size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Activity Status</p>
                                                <p className="text-sm font-medium dark:text-white">
                                                    {viewingProfile.is_online ? 'Available Now' : (viewingProfile.last_seen ? `Last seen ${new Date(viewingProfile.last_seen).toLocaleString()}` : 'Last seen recently')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><IoCall size={20} /></div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Phone Number</p>
                                                <p className="text-sm font-medium dark:text-white">{viewingProfile.phone || 'Not provided'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600"><IoPeople /></div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Department & Team</p>
                                                <p className="text-sm font-medium dark:text-white">{viewingProfile.department || 'General'} • {viewingProfile.team || 'Staff'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600"><IoChatbubblesOutline /></div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Job Title</p>
                                                <p className="text-sm font-medium dark:text-white">{viewingProfile.job_title || 'Employee'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl">
                                            <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-600"><IoSearch /></div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400">Email Address</p>
                                                <p className="text-sm font-medium dark:text-white truncate">{viewingProfile.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {viewingProfile.id !== user.id && (
                                        <button
                                            onClick={() => {
                                                const existing = rooms.find(r => r.room_type === 'direct' && r.other_participants?.some(p => p.id === viewingProfile.id));
                                                if (existing) { handleSelectRoom(existing); }
                                                else { handleStartNewChat(viewingProfile); }
                                                setViewingProfile(null);
                                                setShowGroupInfo(false);
                                            }}
                                            className="w-full mt-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 flex-shrink-0 mb-2"
                                        >
                                            <IoSend /> Send Message
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {isEditingUserAccount && userToEdit && (
                        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden"
                            >
                                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50">
                                    <h3 className="font-bold text-lg dark:text-white">Edit User Profile</h3>
                                    <button
                                        onClick={() => { setIsEditingUserAccount(false); setUserToEdit(null); }}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                    >
                                        <IoClose size={20} className="dark:text-white" />
                                    </button>
                                </div>

                                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex flex-col items-center mb-8">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl overflow-hidden border-4 border-white dark:border-slate-800">
                                                {userToEdit.avatar ? (
                                                    <img src={getFullAvatarUrl(userToEdit.avatar)} className="w-full h-full object-cover" />
                                                ) : (
                                                    userToEdit.full_name?.[0]?.toUpperCase()
                                                )}
                                            </div>
                                            <button
                                                onClick={() => editAvatarInputRef.current?.click()}
                                                className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors border-2 border-white dark:border-slate-800"
                                            >
                                                <IoCamera size={16} />
                                            </button>
                                            <input
                                                type="file"
                                                ref={editAvatarInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleAdminAvatarUpload}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Click camera to change photo</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={userToEdit.full_name || ''}
                                                onChange={e => setUserToEdit({ ...userToEdit, full_name: e.target.value })}
                                                className="w-full mt-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Job Title</label>
                                                <input
                                                    type="text"
                                                    value={userToEdit.job_title || ''}
                                                    onChange={e => setUserToEdit({ ...userToEdit, job_title: e.target.value })}
                                                    className="w-full mt-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Department</label>
                                                <input
                                                    type="text"
                                                    value={userToEdit.department || ''}
                                                    onChange={e => setUserToEdit({ ...userToEdit, department: e.target.value })}
                                                    className="w-full mt-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                                            <input
                                                type="email"
                                                value={userToEdit.email || ''}
                                                onChange={e => setUserToEdit({ ...userToEdit, email: e.target.value })}
                                                className="w-full mt-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Phone Number</label>
                                            <input
                                                type="text"
                                                value={userToEdit.phone || ''}
                                                onChange={e => setUserToEdit({ ...userToEdit, phone: e.target.value })}
                                                className="w-full mt-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex gap-3">
                                    <button
                                        onClick={() => { setIsEditingUserAccount(false); setUserToEdit(null); }}
                                        className="flex-1 py-3 px-4 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleUpdateUserAccount({
                                            full_name: userToEdit.full_name,
                                            email: userToEdit.email,
                                            phone: userToEdit.phone,
                                            job_title: userToEdit.job_title,
                                            department: userToEdit.department
                                        })}
                                        className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
};

export default ChatPage;
