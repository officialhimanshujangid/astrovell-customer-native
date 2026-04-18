import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import { chatApi } from '../api/services';

const SOCKET_URL = 'https://astrology-i7c9.onrender.com';

const GlobalChatListener = () => {
  const { token, user } = useSelector((state) => state.auth);
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }, []);

  useEffect(() => {
    if (!token || !user?.id) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[GlobalChat] Connected for background pushes:', socket.id);
      // Immeditately check if there is an active session so we can attach to the room
      attachToActiveRoom();
    });

    socket.on('new-message', (msg) => {
      // Respect actively focused chat room screen
      if (global.isChatRoomActive && String(global.activeChatRoomId) === String(msg.chatRequestId)) {
        return; // Let the screen handle its own messages natively
      }

      // If it's a message from an astrologer (not from us), fire a local push!
      if (msg.senderType === 'astrologer' && String(msg.senderId) !== String(user?.id)) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'New message from Astrologer! ✨',
            body: msg.message || 'Sent an attachment',
            data: { chatId: msg.chatRequestId },
            sound: true,
          },
          trigger: null,
        });
      }
    });

    // We can poll every 30s to keep track of any active rooms we should be joined to globally
    pollRef.current = setInterval(attachToActiveRoom, 30000);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
    };

    async function attachToActiveRoom() {
      try {
        const res = await chatApi.getActiveSession();
        const active = res.data?.activeChat || res.data?.recordList;
        if (active?.id && socketRef.current?.connected) {
          socketRef.current.emit('join-chat', { chatRequestId: parseInt(active.id) });
        }
      } catch (e) {}
    }

  }, [token, user]);

  return null; // This is purely a headless background listener
};

export default GlobalChatListener;
