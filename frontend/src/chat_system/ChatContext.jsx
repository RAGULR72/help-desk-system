import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { wsURL } from '../api/axios';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState({}); // { roomId: [messages] }
    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [typingStatus, setTypingStatus] = useState({}); // { roomId: { userId: name } }
    const [unreadCount, setUnreadCount] = useState(0);

    // iMessage Sound Effects
    const sendSound = new Audio('https://github.com/ani-chaudhary/messenger-clone/raw/main/public/sounds/send.mp3');
    const receiveSound = new Audio('https://github.com/ani-chaudhary/messenger-clone/raw/main/public/sounds/receive.mp3');

    sendSound.volume = 0.5;
    receiveSound.volume = 0.5;

    // Auto-refresh rooms for status updates
    useEffect(() => {
        if (!user) return;

        const fetchRooms = async () => {
            try {
                const res = await api.get('/api/chat/rooms');
                setRooms(res.data);

                // Also fetch unread count while we are at it
                const unreadRes = await api.get('/api/chat/unread-count');
                setUnreadCount(unreadRes.data.total_unread);
            } catch (err) { console.error(err); }
        };

        fetchRooms();
        const interval = setInterval(fetchRooms, 15000); // More frequent updates for status/unread
        return () => clearInterval(interval);
    }, [user?.id]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !user) return;

        const wsUrl = `${wsURL}/api/chat/ws?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setSocket(ws);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'new_message') {
                const { room_id, message } = data;
                setMessages(prev => ({
                    ...prev,
                    [room_id]: [...(prev[room_id] || []), message]
                }));
                // Play sound if message is from OTHERS
                if (message.sender_id !== user.id) {
                    receiveSound.play().catch(e => console.log('Audio disabled by browser', e));
                }
            } else if (data.type === 'typing') {
                const { room_id, user_id, user_name } = data;
                setTypingStatus(prev => ({
                    ...prev,
                    [room_id]: { ...prev[room_id], [user_id]: user_name }
                }));
                // Clear typing status after 3 seconds
                setTimeout(() => {
                    setTypingStatus(prev => {
                        const roomTyping = { ...prev[room_id] };
                        delete roomTyping[user_id];
                        return { ...prev, [room_id]: roomTyping };
                    });
                }, 3000);
            } else if (data.type === 'message_deleted') {
                const { room_id, message_id, delete_type, is_deleted } = data;
                setMessages(prev => {
                    const roomMsgs = prev[room_id] || [];
                    if (delete_type === 'me') {
                        // Remove from view
                        return {
                            ...prev,
                            [room_id]: roomMsgs.filter(m => m.id !== message_id)
                        };
                    } else {
                        // Update content to "This message was deleted"
                        return {
                            ...prev,
                            [room_id]: roomMsgs.map(m =>
                                m.id === message_id
                                    ? { ...m, is_deleted: true, content: "This message was deleted" }
                                    : m
                            )
                        };
                    }
                });
            } else if (data.type === 'read_receipt') {
                const { room_id, user_id, read_at } = data;
                // Update all messages in room sent by ME to 'read' if they were sent before read_at?
                // Actually Backend computed read_count.
                // Here we just force text "Read" or update UI.
                // Ideally we should re-fetch messages or optimistically update.
                // Simplest: Re-fetch messages or update state logic?
                // If read_receipt comes, it means someone read everything.
                // So mark all my messages as read.
                setMessages(prev => {
                    const roomMsgs = prev[room_id] || [];
                    return {
                        ...prev,
                        [room_id]: roomMsgs.map(m =>
                            (m.sender_id !== user_id && m.created_at <= read_at)
                                ? { ...m, read_status: 'read' } // Logic might be complex
                                : m
                        )
                    };
                });
                // Note: Better to just trigger a silent re-fetch or use state
            }
        };

        ws.onclose = () => {
            setSocket(null);
        };

        return () => ws.close();
    }, [user?.id]);

    const sendMessage = useCallback((roomId, content, messageType = 'text', attachmentUrl = null) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                action: 'send_message',
                room_id: roomId,
                content: content,
                message_type: messageType,
                attachment_url: attachmentUrl
            }));
            // Play iMessage swoosh sound
            sendSound.play().catch(e => console.log('Audio disabled by browser', e));
        }
    }, [socket]);

    const sendTyping = useCallback((roomId) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                action: 'typing',
                room_id: roomId
            }));
        }
    }, [socket]);

    return (
        <ChatContext.Provider value={{
            rooms,
            setRooms,
            messages,
            setMessages,
            activeRoom,
            setActiveRoom,
            sendMessage,
            sendTyping,
            typingStatus,
            unreadCount
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
