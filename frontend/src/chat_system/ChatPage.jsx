import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSend, IoChatbubblesOutline, IoSearch, IoAdd, IoArrowBack, IoImage, IoVideocam, IoMic, IoClose, IoPeople, IoShieldCheckmark, IoCheckmark, IoCheckmarkDone, IoTrash, IoInformationCircle, IoCall, IoEllipse, IoCreate, IoCamera, IoAttach, IoDocument, IoDownload, IoChevronBack, IoChevronForward, IoChevronDown, IoEllipsisHorizontal, IoHappyOutline } from 'react-icons/io5';
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

    const [sidebarTab, setSidebarTab] = useState('All');

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
            setShowGroupInfo(false);
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
        let url = getFullAvatarUrl(attachment_url);

        // Backward compatibility
        if (type === 'text' && content && content.startsWith('[')) {
            const match = content.match(/^\[(image|video|audio|file)\]:(.*)/);
            if (match) {
                type = match[1];
                url = getFullAvatarUrl(match[2]);
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
                    <div className={`p-2 rounded-xl border ${isMe ? 'bg-violet-600/20 border-violet-500/30' : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
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
                        ? 'bg-violet-600 text-white border-violet-500'
                        : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                        } min-w-[220px] max-w-sm group/file hover:bg-opacity-90`}>
                        <div className={`p-3 rounded-2xl shadow-sm ${isMe ? 'bg-white/20 text-white' : 'bg-white text-violet-600'}`}>
                            <IoDocument size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${isMe ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{content || "Document"}</p>
                            <p className={`text-[10px] opacity-70 uppercase font-bold tracking-widest mt-0.5 ${isMe ? 'text-white' : 'text-slate-500'}`}>
                                {content?.split('.').pop() || 'File'}
                            </p>
                        </div>
                        {!isRestricted && (
                            <a
                                href={url}
                                download
                                className={`p-2.5 rounded-xl transition-all ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white hover:bg-slate-50 text-slate-500 shadow-sm'}`}
                            >
                                <IoDownload size={18} />
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

    const getFilteredRooms = () => {
        let filtered = rooms.filter(r =>
            (r.name || r.users?.[0]?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (sidebarTab === 'Team') {
            filtered = filtered.filter(r => r.room_type === 'group');
        } else if (sidebarTab === 'Personal') {
            filtered = filtered.filter(r => r.room_type === 'direct');
        }
        return filtered;
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
                    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
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
                {/* 1. LEFT SIDEBAR */}
                <div className={`w-full md:w-[340px] flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 ${activeRoom ? 'hidden md:flex' : 'flex'}`}>

                    {/* Sidebar Header */}
                    <div className="p-5 pb-0">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <img
                                        src={getFullAvatarUrl(user.avatar) || `https://ui-avatars.com/api/?name=${user.full_name}`}
                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-700 shadow-sm"
                                        alt="User"
                                    />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                </div>
                                <div>
                                    <h2 className="font-bold text-sm dark:text-white leading-tight">{user.full_name}</h2>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">@{user.username}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setShowNewChat(true); setShowCreateGroup(false); fetchUsers(); }} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:text-violet-600 transition-colors">
                                    <IoCreate size={16} />
                                </button>
                                <button onClick={() => setShowCreateGroup(true)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:text-violet-600 transition-colors">
                                    <IoPeople size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-4">
                            <IoSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search here..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-slate-800 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-violet-500 transition-all dark:text-white placeholder-gray-400 font-medium"
                            />
                        </div>



                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1 pb-4">
                        {getFilteredRooms().map(room => {
                            const isActive = activeRoom?.id === room.id;
                            const isUnread = room.unread_count > 0;

                            return (
                                <div
                                    key={room.id}
                                    onClick={() => handleSelectRoom(room)}
                                    className={`p-3.5 rounded-3xl cursor-pointer transition-all duration-200 flex gap-4 items-center group relative ${isActive ? 'bg-violet-600 shadow-lg shadow-violet-200 dark:shadow-none' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-12 h-12 rounded-full overflow-hidden ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>
                                            <img
                                                src={getFullAvatarUrl(room.room_type === 'group' ? room.avatar : room.users?.find(u => u.id !== user.id)?.avatar) || `https://ui-avatars.com/api/?name=${room.name}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {room.room_type === 'direct' && room.is_online && (
                                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h4 className={`font-bold text-[15px] truncate ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'} ${isUnread && !isActive ? 'font-extrabold' : ''}`}>
                                                {room.name}
                                            </h4>
                                            <span className={`text-[11px] font-medium ${isActive ? 'text-violet-200' : (isUnread ? 'text-violet-600' : 'text-gray-400')}`}>
                                                {formatMessageTime(room.last_message_at)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center h-5">
                                            <p className={`text-xs truncate max-w-[150px] ${isActive ? 'text-violet-100' : 'text-gray-500 dark:text-gray-400'} ${isUnread && !isActive ? 'font-semibold text-gray-800 dark:text-gray-200' : ''}`}>
                                                {typingStatus[room.id] && Object.keys(typingStatus[room.id]).length > 0 ? (
                                                    <span className={`${isActive ? 'text-white' : 'text-violet-500'} font-bold animate-pulse`}>Typing...</span>
                                                ) : formatLastMessage(room)}
                                            </p>
                                            {isUnread && (
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${isActive ? 'bg-white text-violet-600' : 'bg-red-500 text-white shadow-red-200'}`}>
                                                    {room.unread_count}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Main Content */}
                {/* 2. MAIN CHAT AREA */}
                <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-[#0c111d] h-full relative transition-all duration-300 ${!activeRoom && !showNewChat && !showCreateGroup ? 'hidden md:flex' : 'flex'}`}>

                    {/* Security Blur Overlay */}
                    {activeRoom?.is_restricted && isBlur && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl z-[9999] flex items-center justify-center">
                            <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700">
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

                    {(showNewChat || showCreateGroup) ? (
                        /* New Chat / Create Group View in Main Pane */
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center bg-white dark:bg-slate-900 absolute inset-0 z-50">
                            {showCreateGroup ? (
                                <div className="bg-white dark:bg-slate-900 p-0 sm:p-8 rounded-3xl w-full max-w-lg">
                                    <div className="flex items-center gap-4 mb-6">
                                        <button onClick={() => setShowCreateGroup(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><IoArrowBack size={20} className="dark:text-white" /></button>
                                        <h2 className="text-xl font-bold dark:text-white">Create Group</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group Name" className="w-full p-3.5 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-violet-500 dark:text-white border border-transparent focus:border-violet-500 transition-all font-medium" />
                                        <textarea value={groupDescription} onChange={e => setGroupDescription(e.target.value)} placeholder="Description (Optional)" className="w-full p-3.5 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-violet-500 dark:text-white border border-transparent focus:border-violet-500 transition-all font-medium resize-none h-24" />

                                        {/* Simplified User Selection for Creation */}
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select Members</p>
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar border border-gray-100 dark:border-slate-800 rounded-xl p-2">
                                                {availableUsers.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                                                    <div key={u.id} onClick={() => {
                                                        if (selectedUsers.includes(u.id)) setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                                        else setSelectedUsers([...selectedUsers, u.id]);
                                                    }} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer ${selectedUsers.includes(u.id) ? 'bg-violet-50 dark:bg-violet-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedUsers.includes(u.id) ? 'bg-violet-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                            {selectedUsers.includes(u.id) ? <IoCheckmark size={16} /> : u.full_name[0]}
                                                        </div>
                                                        <span className="text-sm font-medium dark:text-white">{u.full_name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button onClick={handleCreateGroup} disabled={!groupName || selectedUsers.length === 0} className="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-bold hover:bg-violet-700 transition shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed">Create Group</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 p-0 sm:p-8 rounded-3xl w-full max-w-lg">
                                    <div className="flex items-center gap-4 mb-6">
                                        <button onClick={() => setShowNewChat(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><IoArrowBack size={20} className="dark:text-white" /></button>
                                        <h2 className="text-xl font-bold dark:text-white">New Chat</h2>
                                    </div>
                                    <div className="relative mb-4">
                                        <IoSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search people..." className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-violet-500 dark:text-white transition-all font-medium" />
                                    </div>
                                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        {filteredUsers.map(u => (
                                            <div key={u.id} onClick={() => handleStartNewChat(u)} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl cursor-pointer transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold shadow-sm">{u.full_name[0]}</div>
                                                <div>
                                                    <p className="text-sm font-bold dark:text-white">{u.full_name}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : activeRoom ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-20 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0 border-b border-gray-50 dark:border-slate-800 sticky top-0 z-20">
                                <div className="flex items-center gap-4 cursor-pointer" onClick={() => { if (!showGroupInfo) handleFetchRoomInfo(); else setShowGroupInfo(false); }}>
                                    <button onClick={(e) => { e.stopPropagation(); setActiveRoom(null); }} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600"><IoArrowBack size={22} /></button>
                                    <div className="relative">
                                        <img src={getFullAvatarUrl(activeRoom.room_type === 'group' ? activeRoom.avatar : activeRoom.users?.find(u => u.id !== user.id)?.avatar) || `https://ui-avatars.com/api/?name=${activeRoom.name}`} className="w-10 h-10 rounded-full object-cover shadow-sm bg-gray-100" />
                                        {activeRoom.room_type === 'direct' && activeRoom.is_online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-base dark:text-white leading-tight flex items-center gap-2">
                                            {activeRoom.name}
                                            {activeRoom.room_type === 'group' && <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 text-[10px] rounded-md font-bold uppercase tracking-wider">Group</span>}
                                        </h2>
                                        <p className="text-xs text-green-500 font-bold tracking-wide">
                                            {getStatusString(activeRoom)}
                                        </p>
                                    </div>
                                </div>

                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth custom-scrollbar relative z-0" ref={scrollRef} onScroll={handleScroll}>
                                <div className="space-y-6">
                                    {/* Date Separator Example */}
                                    <div className="flex justify-center mb-6 sticky top-0 z-10">
                                        <span className="px-3 py-1 bg-gray-100/90 dark:bg-slate-800/90 backdrop-blur text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">Today</span>
                                    </div>

                                    {messages[activeRoom.id]?.map((msg) => {
                                        const isMe = msg.sender_id === user.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-3 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                                {!isMe && (
                                                    <img src={getFullAvatarUrl(msg.sender_avatar) || `https://ui-avatars.com/api/?name=${msg.sender_name}`} className="w-8 h-8 rounded-full mb-1 object-cover shadow-sm bg-gray-100" />
                                                )}

                                                <div className={`max-w-[75%] sm:max-w-[70%] relative group/msg`}>
                                                    {activeRoom.room_type === 'group' && !isMe && <p className="text-[10px] text-gray-400 ml-1 mb-1 font-bold">{msg.sender_name}</p>}

                                                    <div
                                                        className={`px-5 py-3 text-[15px] shadow-sm leading-relaxed ${isMe
                                                            ? 'bg-violet-600 text-white rounded-2xl rounded-tr-sm'
                                                            : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-slate-800'}`}
                                                    >
                                                        {renderMessageContent(msg)}
                                                    </div>

                                                    <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${isMe ? 'justify-end text-gray-300' : 'justify-start text-gray-400'}`}>
                                                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {isMe && (msg.read_status === 'read' ? <IoCheckmarkDone className="text-violet-500" size={14} /> : <IoCheckmark size={14} />)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {Object.keys(typingStatus[activeRoom.id] || {}).length > 0 && (
                                        <div className="flex items-center gap-2 ml-11">
                                            <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={scrollRef} />
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-50 dark:border-slate-800 shrink-0 z-20">
                                <div className="max-w-4xl mx-auto flex items-end gap-3">
                                    <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors flex-shrink-0">
                                        <IoAdd size={24} />
                                    </button>
                                    <div className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center p-1.5 focus-within:ring-2 focus-within:ring-violet-100 dark:focus-within:ring-violet-900/30 border border-transparent focus-within:border-violet-200 dark:focus-within:border-violet-800 transition-all">
                                        <button className="p-2 text-gray-400 hover:text-amber-500 transition-colors"><IoHappyOutline size={22} /></button>
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-gray-800 dark:text-white placeholder-gray-400 h-10 font-medium"
                                        />
                                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><IoImage size={20} /></button>
                                        <button onClick={() => fileInputDocRef.current?.click()} className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><IoAttach size={20} /></button>
                                    </div>
                                    {inputValue.trim() ? (
                                        <button onClick={handleSend} className="p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg shadow-violet-200 dark:shadow-none transition-all transform active:scale-95 flex-shrink-0">
                                            <IoSend size={20} />
                                        </button>
                                    ) : (
                                        <button onClick={isRecording ? stopRecording : startRecording} className={`p-3 rounded-full transition-all flex-shrink-0 shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                                            <IoMic size={20} />
                                        </button>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*,video/*" />
                                <input type="file" ref={fileInputDocRef} hidden onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-violet-200 shadow-sm mb-6 animate-bounce-slow">
                                <IoChatbubblesOutline size={48} />
                            </div>
                            <h3 className="font-bold text-xl text-gray-700 dark:text-white mb-2">Welcome to Chat</h3>
                            <p className="text-gray-400 max-w-xs text-center font-medium">Select a conversation from the sidebar or start a new one to begin messaging.</p>
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
                                                {p.avatar ? <img src={getFullAvatarUrl(p.avatar)} className="w-full h-full object-cover" /> : <span>{p.name[0]}</span>}
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

                {/* 3. RIGHT SIDEBAR (DETAILS) */}
                {showGroupInfo && roomDetails && (
                    <div className="w-full xl:w-[320px] lg:w-[300px] md:w-[280px] bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800 flex flex-col h-full overflow-y-auto custom-scrollbar flex-shrink-0 z-10 absolute md:relative right-0 top-0 shadow-2xl md:shadow-none transition-all duration-300">
                        {/* Header */}
                        <div className="p-6 pb-4 flex flex-col items-center border-b border-gray-50 dark:border-slate-800 relative">
                            <button onClick={() => setShowGroupInfo(false)} className="absolute top-4 right-4 p-2 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full transition-colors md:hidden">
                                <IoClose size={20} />
                            </button>

                            <div className="relative group/avatar mb-4">
                                <div className="w-24 h-24 rounded-full p-1 border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-violet-500 transition-colors cursor-pointer">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                        <img src={getFullAvatarUrl(roomDetails.room.avatar || activeRoom.avatar) || `https://ui-avatars.com/api/?name=${roomDetails.room.name}`} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                                {(roomDetails.room.creator_id === user.id || ['admin', 'manager'].includes(user.role)) && activeRoom.room_type === 'group' && (
                                    <button onClick={() => groupAvatarInputRef.current?.click()} className="absolute bottom-1 right-1 p-2 bg-violet-600 text-white rounded-full shadow-md hover:bg-violet-700 transition-colors">
                                        <IoCamera size={14} />
                                    </button>
                                )}
                                <input type="file" ref={groupAvatarInputRef} className="hidden" accept="image/*" onChange={handleGroupAvatarUpload} />
                            </div>

                            {isEditingName ? (
                                <input
                                    autoFocus
                                    value={editedName}
                                    onChange={e => setEditedName(e.target.value)}
                                    onBlur={handleUpdateRoomName}
                                    onKeyDown={e => e.key === 'Enter' && handleUpdateRoomName()}
                                    className="text-lg font-bold text-center bg-gray-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 w-full dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            ) : (
                                <div className="flex items-center gap-2 group/name justify-center">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white text-center">{roomDetails.room.name}</h3>
                                    {(roomDetails.room.creator_id === user.id || ['admin', 'manager'].includes(user.role)) && activeRoom.room_type === 'group' && (
                                        <button onClick={() => { setIsEditingName(true); setEditedName(roomDetails.room.name); }} className="opacity-0 group-hover/name:opacity-100 text-gray-400 hover:text-violet-600 transition-opacity"><IoCreate size={16} /></button>
                                    )}
                                </div>
                            )}

                            <p className="text-gray-400 text-xs font-medium mb-6 flex items-center gap-2 mt-1">
                                {activeRoom.room_type === 'group' ? (
                                    <><span>{activeRoom.room_type === 'group' ? 'Group' : 'Direct'}</span> • <span>{roomDetails?.participants?.length || 0} Members</span></>
                                ) : (
                                    <span className={activeRoom.is_online ? 'text-green-500' : 'text-gray-400'}>{activeRoom.is_online ? 'Online' : 'Offline'}</span>
                                )}
                            </p>

                            <div className="flex gap-6 w-full justify-center mb-2">
                                <div className="flex flex-col items-center gap-2 cursor-pointer group">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20 group-hover:text-violet-600 transition-colors shadow-sm">
                                        <IoMic size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-violet-600 transition-colors uppercase tracking-wide">Mute</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 cursor-pointer group">
                                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20 group-hover:text-violet-600 transition-colors shadow-sm">
                                        <IoSearch size={18} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-violet-600 transition-colors uppercase tracking-wide">Search</span>
                                </div>
                                {activeRoom.room_type === 'group' && (
                                    <div className="flex flex-col items-center gap-2 cursor-pointer group">
                                        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/10 flex items-center justify-center text-red-500 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors shadow-sm">
                                            <IoTrash size={18} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-red-500 transition-colors uppercase tracking-wide">Leave</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {activeRoom.room_type === 'group' && (
                            <div className="p-4 border-b border-gray-50 dark:border-slate-800 relative group/desc">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</h4>
                                {isEditingDescription ? (
                                    <textarea
                                        autoFocus
                                        value={editedDescription}
                                        onChange={e => setEditedDescription(e.target.value)}
                                        onBlur={handleUpdateRoomDescription}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-3 text-sm dark:text-white resize-none h-24 focus:ring-2 focus:ring-violet-500"
                                    />
                                ) : (
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed relative">
                                        {roomDetails.room.description || "No description set"}
                                        {(roomDetails.room.creator_id === user.id || ['admin', 'manager'].includes(user.role)) && (
                                            <button onClick={() => { setIsEditingDescription(true); setEditedDescription(roomDetails.room.description || ""); }} className="absolute -right-2 -top-1 p-1 opacity-0 group-hover/desc:opacity-100 text-violet-600 transition-opacity"><IoCreate size={14} /></button>
                                        )}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Menu Items */}
                        <div className="p-4 space-y-1 border-b border-gray-50 dark:border-slate-800">
                            <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl cursor-pointer group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center"><IoDocument size={18} /></div>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">Media, Links & Docs</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-blue-500">230</span>
                                    <IoChevronForward size={14} className="text-gray-400" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl cursor-pointer transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center"><IoHappyOutline size={18} /></div>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">Starred Messages</span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-md">None</span>
                            </div>
                        </div>

                        {/* Members List - Only for Groups */}
                        {activeRoom.room_type === 'group' && (
                            <div className="p-4 flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Members ({roomDetails.participants.length})</h4>
                                    <IoSearch className="text-gray-400" />
                                </div>

                                <div className="space-y-4">
                                    {/* Add Member Button */}
                                    {(roomDetails.room.creator_id === user.id || ['admin', 'manager'].includes(user.role)) && (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <input
                                                    placeholder="Add people..."
                                                    value={addMemberQuery}
                                                    onChange={e => setAddMemberQuery(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm outline-none focus:ring-1 focus:ring-violet-500 dark:text-white"
                                                />
                                                <IoAdd className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            </div>
                                            {searchedMembers.length > 0 && (
                                                <div className="max-h-40 overflow-y-auto border border-gray-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-lg">
                                                    {searchedMembers.map(u => (
                                                        <div key={u.id} onClick={() => handleSelectMember(u)} className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold">{u.full_name[0]}</div>
                                                            <span className="text-sm font-medium dark:text-gray-200">{u.full_name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {pendingMembers.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {pendingMembers.map(u => (
                                                        <span key={u.id} className="text-[10px] font-bold bg-violet-100 text-violet-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                                            {u.full_name} <button onClick={() => setPendingMembers(pendingMembers.filter(p => p.id !== u.id))}><IoClose /></button>
                                                        </span>
                                                    ))}
                                                    <button onClick={confirmAddMembers} className="text-[10px] font-bold bg-violet-600 text-white px-3 py-1 rounded-lg hover:bg-violet-700">Add</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Participants */}
                                    {roomDetails.participants.map(p => (
                                        <div key={p.user_id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 p-2.5 -mx-2 rounded-2xl transition-colors group relative" onClick={() => handleViewProfile(p.user_id)}>
                                            <div className="relative">
                                                <img src={getFullAvatarUrl(p.avatar)} className="w-10 h-10 rounded-full bg-gray-100 object-cover" />
                                                {p.is_online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{p.name} {p.user_id === user.id && <span className="text-gray-400 font-normal">(You)</span>}</p>
                                                <p className="text-[10px] text-gray-400 truncate font-medium capitalize">{p.role}</p>
                                            </div>

                                            {/* Admin Controls */}
                                            {p.user_id !== user.id && (['admin', 'manager'].includes(user.role) || roomDetails.participants.find(mp => mp.user_id === user.id && mp.role === 'admin')) && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(p.user_id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <IoTrash size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Undo Toast */}
                {undoDeletion && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-4 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">Message deleted</span>
                            <span className="text-[10px] text-gray-400">Undo available for {undoDeletion.countdown}s</span>
                        </div>
                        <button onClick={handleUndoDeletion} className="px-4 py-2 bg-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50">Undo</button>
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
