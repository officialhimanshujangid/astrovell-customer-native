import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { colors } from '../theme/colors';
import { imgUrl } from '../store/slices/homeSlice';
import {
  getChatDetail,
  getMessages,
  updateMessages,
  updateMessageStatus,
  clearActiveChat,
} from '../store/slices/chatSlice';
import { fetchWalletBalance } from '../store/slices/walletSlice';
import apiClient from '../api/apiClient';
import usePermissions from '../hooks/usePermissions';

const SOCKET_URL = 'https://astrology-i7c9.onrender.com';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatMsgTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Star Rating Component
const StarRating = ({ value, onChange }) => (
  <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 12 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <TouchableOpacity key={n} onPress={() => onChange(n)}>
        <Text style={{ fontSize: 36, color: n <= value ? colors.gold : colors.border }}>★</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ChatRoomScreen = ({ chatId, onBack }) => {
  const dispatch = useDispatch();
  const { user, token, settings } = useSelector((s) => s.auth);
  const { activeChat, messages, messagesLoad } = useSelector((s) => s.chat);
  const { balance } = useSelector((s) => s.wallet);
  const currencySymbol = settings?.currencySymbol || '₹';
  const { can } = usePermissions();

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [typing, setTyping] = useState(false);
  const [walletBal, setWalletBal] = useState(balance || 0);
  const [chatStatus, setChatStatus] = useState(null); // local override

  // Rating modal
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const listRef = useRef(null);
  const typingTimeout = useRef(null);
  const chatStatusRef = useRef(null); // mirror for callbacks
  const chatAcceptedRef = useRef(false); // prevent duplicate accept handling

  // Keep ref in sync
  useEffect(() => {
    chatStatusRef.current = chatStatus ?? activeChat?.chatStatus;
  }, [chatStatus, activeChat]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Notify global listener that we are actively on the chat screen!
    global.isChatRoomActive = true;
    global.activeChatRoomId = chatId;
    
    initChat();
    return () => {
      global.isChatRoomActive = false;
      global.activeChatRoomId = null;
      cleanup();
    };
  }, [chatId]);

  const cleanup = () => {
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    dispatch(clearActiveChat());
  };

  const initChat = async () => {
    if (!token || !chatId) return;
    chatAcceptedRef.current = false;
    try {
      const [detailRes] = await Promise.allSettled([
        dispatch(getChatDetail({ chatRequestId: chatId })),
        dispatch(getMessages({ chatRequestId: chatId })),
      ]);

      // If already accepted, calculate time remaining from server data
      const detail = detailRes.value?.payload?.recordList || detailRes.value?.payload?.data;
      if (detail?.chatStatus) {
        setChatStatus(detail.chatStatus);
        if (detail.chatStatus === 'Accepted') chatAcceptedRef.current = true;
      }
      if (detail?.chatStatus === 'Accepted' && detail.updated_at) {
        const elapsed = Math.floor((Date.now() - new Date(detail.updated_at).getTime()) / 1000);
        setTimeLeft(Math.max(0, 3600 - elapsed));
        startTimer();
      }

      connectSocket();
      startPolling(); // fallback polling for status changes
    } catch (err) {
      console.error('[ChatRoom] Init error:', err);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Polling fallback ────────────────────────────────────────────────────────
  const startPolling = () => {
    if (!token) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const currentStatus = chatStatusRef.current;
      if (currentStatus === 'Completed' || currentStatus === 'Rejected' || currentStatus === 'Cancelled') {
        clearInterval(pollRef.current);
        return;
      }
      try {
        const res = await apiClient.post(
          '/api/customer/chatRequest/getChatDetail',
          { chatRequestId: chatId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const detail = res.data?.recordList || res.data?.data || res.data;
        if (!detail) return;

        if (detail.chatStatus === 'Accepted' && currentStatus !== 'Accepted') {
          handleChatAccepted({
            chatRequestId: chatId,
            astrologerName: detail.astrologerName || detail.name,
            maxDuration: 3600,
            walletBalance: walletBal,
          });
          clearInterval(pollRef.current);
        } else if (detail.chatStatus === 'Rejected' && currentStatus !== 'Rejected') {
          handleChatRejected({ chatRequestId: chatId });
          clearInterval(pollRef.current);
        } else if (detail.chatStatus === 'Completed') {
          clearInterval(pollRef.current);
        }
      } catch (e) {}
    }, 3000);
  };

  // ── Socket ──────────────────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    const authToken = token;
    if (!authToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[ChatRoom] Socket connected:', socket.id);
      socket.emit('join-chat', { chatRequestId: parseInt(chatId) });
      // Sync messages on reconnect to avoid gaps
      apiClient.post(
        '/api/customer/chatRequest/getMessages',
        { chatRequestId: chatId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      ).then(res => {
        const msgs = res.data?.recordList || res.data?.data || [];
        if (Array.isArray(msgs) && msgs.length > 0) {
          dispatch(getMessages({ chatRequestId: chatId }));
        }
      }).catch(() => {});
    });

    // New message – also emit delivered + read receipts
    socket.on('new-message', (msg) => {
      dispatch(updateMessages(msg));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

      // If message is from astrologer (other person), mark as delivered then read
      if (msg.senderType === 'astrologer' && String(msg.senderId) !== String(user?.id)) {
        socket.emit('message-delivered', { chatRequestId: parseInt(chatId), messageIds: [msg.id] });
        // Mark as read after 2 sec (screen is open)
        setTimeout(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('message-read', { chatRequestId: parseInt(chatId), messageIds: [msg.id] });
          }
        }, 2000);
      }
    });

    // ── Message status updates (sent → delivered → read) ──────────────────
    socket.on('messages-status-update', ({ messageIds, status }) => {
      dispatch(updateMessageStatus({ messageIds, status }));
    });

    // ── Chat accepted – both direct and global events ──────────────────────
    const onChatAccepted = (data) => {
      if (data?.chatRequestId && String(data.chatRequestId) !== String(chatId)) return;
      if (chatAcceptedRef.current) return; // prevent double-fire
      handleChatAccepted(data);
    };
    socket.on('chat-accepted', onChatAccepted);
    socket.on('chat-accepted-global', onChatAccepted);

    // ── Chat rejected ──────────────────────────────────────────────────────
    const onChatRejected = (data) => {
      if (data?.chatRequestId && String(data.chatRequestId) !== String(chatId)) return;
      handleChatRejected(data);
    };
    socket.on('chat-rejected', onChatRejected);
    socket.on('chat-rejected-global', onChatRejected);

    // ── Chat ended by astrologer or system ────────────────────────────────
    socket.on('chat-ended', async (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      setChatStatus('Completed');
      dispatch(getChatDetail({ chatRequestId: chatId }));
      dispatch(fetchWalletBalance());

      // Check if already reviewed before showing rating modal
      try {
        const astrologerId = activeChat?.astrologerId || data?.astrologerId;
        const reviewRes = await apiClient.post(
          '/api/customer/getUserReview',
          { astrologerId },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const reviews = reviewRes.data?.recordList || reviewRes.data?.data || [];
        const alreadyReviewed = Array.isArray(reviews) && reviews.some(r => String(r.userId) === String(user?.id));
        if (!alreadyReviewed) {
          Alert.alert(
            'Chat Ended',
            data?.message || 'Chat session has been completed',
            [
              { text: 'Rate Astrologer', onPress: () => setShowRating(true) },
              { text: 'Skip', onPress: onBack },
            ]
          );
        } else {
          Alert.alert('Chat Ended', data?.message || 'Chat session completed.', [{ text: 'OK', onPress: onBack }]);
        }
      } catch (e) {
        // On error, still show rating
        Alert.alert(
          'Chat Ended',
          data?.message || 'Chat session has been completed',
          [
            { text: 'Rate Astrologer', onPress: () => setShowRating(true) },
            { text: 'Skip', onPress: onBack },
          ]
        );
      }
    });

    // ── Chat cancelled (customer cancelled from Pending state) ────────────
    socket.on('chat-cancelled', (data) => {
      setChatStatus('Cancelled');
      if (pollRef.current) clearInterval(pollRef.current);
      dispatch(clearActiveChat());
      Alert.alert('Chat Cancelled', data?.message || 'Chat request has been cancelled.', [
        { text: 'OK', onPress: onBack },
      ]);
    });

    // ── Live balance update (per-minute deduction) ─────────────────────────
    socket.on('balance-update', (data) => {
      setWalletBal(data?.balance ?? 0);
      dispatch(fetchWalletBalance());
    });

    // ── Puja recommendation from astrologer ────────────────────────────────
    // Only process if chat_recommend_puja is enabled in permissions.json
    socket.on('puja-recommended', (data) => {
      if (!can('chat_recommend_puja')) return;
      dispatch(updateMessages({
        id: 'puja_' + Date.now(),
        senderType: 'system',
        message: '__PUJA_CARD__',
        pujaData: data,
        created_at: new Date().toISOString(),
      }));
    });

    // ── Typing indicators (only show when other person is typing) ──────────
    socket.on('user-typing', (data) => {
      if (data?.userType === 'astrologer') setTyping(true);
    });
    socket.on('user-stop-typing', (data) => {
      if (data?.userType === 'astrologer') setTyping(false);
    });

    // ── Astrologer disconnected – show warning ─────────────────────────────
    socket.on('user-disconnected', (data) => {
      if (data?.userType === 'astrologer') {
        Alert.alert(
          '⚠️ Astrologer Disconnected',
          'The astrologer lost connection. Waiting up to 30 seconds for reconnect...',
          [{ text: 'OK' }]
        );
      }
    });

    socket.on('connect_error', (err) => {
      console.log('[ChatRoom] Socket error:', err.message);
    });

    socketRef.current = socket;
  }, [chatId, token]);

  // ── Chat event handlers ────────────────────────────────────────────────────
  const handleChatAccepted = (data) => {
    if (chatAcceptedRef.current) return;
    chatAcceptedRef.current = true;

    setChatStatus('Accepted');
    setWalletBal(prev => data?.walletBalance ?? prev);
    dispatch(getChatDetail({ chatRequestId: chatId }));

    const maxDur = data?.maxDuration || 3600;
    setTimeLeft(maxDur);
    startTimer();

    Alert.alert('✅ Chat Accepted!', `${data?.astrologerName || 'Astrologer'} has accepted your chat request!`);
  };

  const handleChatRejected = (data) => {
    if (chatStatusRef.current === 'Rejected') return;
    setChatStatus('Rejected');
    dispatch(getChatDetail({ chatRequestId: chatId }));

    Alert.alert(
      'Chat Rejected',
      'The astrologer has rejected your request. Please try another astrologer.',
      [{ text: 'Go Back', onPress: onBack }]
    );
  };

  // ── Send Message ──────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!newMessage.trim()) return;
    const msgText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const chatIdInt = parseInt(chatId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', { chatRequestId: chatIdInt, message: msgText });
      socketRef.current.emit('stop-typing', { chatRequestId: chatIdInt });
    } else {
      // REST fallback
      apiClient.post(
        '/api/customer/chatRequest/sendMessage',
        { chatRequestId: chatIdInt, message: msgText },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      )
        .then((res) => {
          const msg = res.data?.recordList;
          if (msg) dispatch(updateMessages(msg));
        })
        .catch(() => {
          setNewMessage(msgText);
          Alert.alert('Error', 'Failed to send message');
        });
    }
    setSending(false);
  };

  const handleInputChange = (text) => {
    setNewMessage(text);
    const chatIdInt = parseInt(chatId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { chatRequestId: chatIdInt });
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketRef.current?.emit('stop-typing', { chatRequestId: chatIdInt });
      }, 2000);
    }
  };

  // ── End Chat ──────────────────────────────────────────────────────────────
  const handleEndChat = () => {
    const status = chatStatus ?? activeChat?.chatStatus;
    const chatIdInt = parseInt(chatId);

    // Pending state → Cancel (no billing) using cancel-chat event
    if (status === 'Pending') {
      Alert.alert('Cancel Chat', 'Cancel your chat request?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel', style: 'destructive',
          onPress: () => {
            if (socketRef.current?.connected) {
              // Use cancel-chat (not end-chat) for Pending state
              socketRef.current.emit('cancel-chat', { chatRequestId: chatIdInt });
            }
            setChatStatus('Cancelled');
            if (pollRef.current) clearInterval(pollRef.current);
            dispatch(clearActiveChat());
            if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
            onBack();
          },
        },
      ]);
      return;
    }

    // Accepted state → End Chat
    Alert.alert('End Chat', 'Are you sure you want to end this session?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'End', style: 'destructive',
        onPress: async () => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('end-chat', { chatRequestId: chatIdInt });
          }
          if (timerRef.current) clearInterval(timerRef.current);
          setChatStatus('Completed');

          // Check already reviewed
          try {
            const reviewRes = await apiClient.post(
              '/api/customer/getUserReview',
              { astrologerId: activeChat?.astrologerId },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const reviews = reviewRes.data?.recordList || reviewRes.data?.data || [];
            const alreadyReviewed = Array.isArray(reviews) && reviews.some(r => String(r.userId) === String(user?.id));
            if (!alreadyReviewed) setShowRating(true);
            else onBack();
          } catch (e) {
            setShowRating(true);
          }
        },
      },
    ]);
  };

  // ── Rating Submit ─────────────────────────────────────────────────────────
  const handleSubmitRating = async () => {
    setRatingSubmitting(true);
    try {
      await apiClient.post(
        '/api/customer/userReview/add',
        {
          astrologerId: activeChat?.astrologerId,
          rating: ratingValue,
          review: reviewText,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Thank You! ⭐', 'Your review has been submitted.');
    } catch (e) {}
    setRatingSubmitting(false);
    setShowRating(false);
    onBack();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const status = chatStatus ?? activeChat?.chatStatus ?? 'Pending';

  if (messagesLoad && !activeChat) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Connecting to cosmic session…</Text>
      </View>
    );
  }

  const statusColor = status === 'Accepted' ? colors.success
    : status === 'Pending' ? colors.gold
    : '#ef4444';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEndChat} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerAvatarWrap}>
          <Image
            source={{ uri: imgUrl(activeChat?.profileImage) || 'https://ui-avatars.com/api/?name=A&background=7c3aed&color=fff' }}
            style={styles.headerAvatar}
          />
          <View style={[styles.headerStatusDot, { backgroundColor: status === 'Accepted' ? colors.success : '#aaa' }]} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {activeChat?.astrologerName || activeChat?.name || 'Astrologer'}
          </Text>
          {typing ? (
            <Text style={[styles.headerStatus, { color: colors.success, fontStyle: 'italic' }]}>typing...</Text>
          ) : (
            <Text style={[styles.headerStatus, { color: statusColor }]}>{status}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {status === 'Accepted' && (
            <Text style={[styles.timerText, timeLeft < 120 && { color: '#ef4444' }]}>
              ⏱ {formatTime(timeLeft)}
            </Text>
          )}
          <Text style={styles.walletChip}>💰 {currencySymbol}{parseFloat(walletBal).toFixed(0)}</Text>
          <TouchableOpacity style={styles.endBtn} onPress={handleEndChat}>
            <Text style={styles.endBtnText}>{status === 'Pending' ? 'Cancel' : 'End'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, idx) => item.id ? String(item.id) : String(idx)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          // ── Puja recommendation card ─────────────────────────────────────
          if (item.message === '__PUJA_CARD__' && item.pujaData) {
            // Hidden when chat_recommend_puja is disabled in permissions.json
            if (!can('chat_recommend_puja')) return null;
            return (
              <View style={styles.pujaCard}>
                <Text style={styles.pujaCardTag}>🕉️ Puja Recommendation</Text>
                <Text style={styles.pujaCardTitle}>{item.pujaData.pujaTitle}</Text>
                <Text style={styles.pujaCardAstro}>by {item.pujaData.astrologerName}</Text>
                <Text style={styles.pujaCardPrice}>{currencySymbol}{item.pujaData.pujaPrice || 0}</Text>
                {/* Accept & Decline action buttons */}
                <View style={styles.pujaCardActions}>
                  <TouchableOpacity
                    style={[styles.pujaActionBtn, styles.pujaAcceptBtn]}
                    onPress={() => {
                      // Navigate or open puja booking — use whatever navigation pattern you have
                      Alert.alert('Book Puja', `Book "${item.pujaData.pujaTitle}" for ${currencySymbol}${item.pujaData.pujaPrice || 0}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Accept & Book', onPress: () => {
                            // Deep-link to puja detail if available
                            Alert.alert('Redirecting', 'Please visit the Puja section to complete your booking.');
                          }
                        },
                      ]);
                    }}
                  >
                    <Text style={styles.pujaAcceptBtnText}>✅ Accept & Book</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pujaActionBtn, styles.pujaDeclineBtn]}
                    onPress={async () => {
                      try {
                        await apiClient.post(
                          '/api/customer/deleteRecommended',
                          { id: item.pujaData.pujaId },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                      } catch (_) {}
                      // Remove card from messages locally
                      dispatch(updateMessages({ ...item, _deleted: true }));
                    }}
                  >
                    <Text style={styles.pujaDeclineBtnText}>❌ Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          // ── Regular message bubble ───────────────────────────────────────
          const isMe = item.senderType === 'user' || String(item.senderId) === String(user?.id);

          // Tick rendering
          const renderTick = () => {
            if (!isMe) return null;
            const tickColor = item.status === 'read'
              ? '#34d399'
              : item.status === 'delivered'
              ? 'rgba(255,255,255,0.7)'
              : 'rgba(255,255,255,0.4)';
            const tickText = item.status === 'read' || item.status === 'delivered' ? '✓✓' : '✓';
            return <Text style={[styles.tickText, { color: tickColor }]}>{tickText}</Text>;
          };

          return (
            <View style={[styles.bubbleWrap, isMe ? styles.myWrap : styles.theirWrap]}>
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                <Text style={[styles.bubbleText, isMe ? styles.myText : styles.theirText]}>
                  {item.message}
                </Text>
                <View style={styles.bubbleFooter}>
                  <Text style={[styles.bubbleTime, isMe ? styles.myTime : styles.theirTime]}>
                    {formatMsgTime(item.created_at || item.createdAt)}
                  </Text>
                  {renderTick()}
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={() => (
          <>
            {typing && (
              <View style={[styles.bubbleWrap, styles.theirWrap]}>
                <View style={[styles.bubble, styles.theirBubble]}>
                  <Text style={styles.typingText}>typing…</Text>
                </View>
              </View>
            )}
            {status === 'Pending' && (
              <View style={styles.systemMsg}>
                <ActivityIndicator size="small" color={colors.gold} style={{ marginBottom: 8 }} />
                <Text style={styles.systemTxt}>Chat request sent. Waiting for astrologer to accept…</Text>
              </View>
            )}
            {status === 'Accepted' && messages.length === 0 && (
              <View style={styles.systemMsg}>
                <Text style={styles.systemTxt}>🎉 Chat accepted! Say hello to your astrologer.</Text>
              </View>
            )}
            {status === 'Completed' && (
              <View style={[styles.systemMsg, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }]}>
                <Text style={[styles.systemTxt, { color: '#ef4444' }]}>🔚 Chat session ended</Text>
              </View>
            )}
            {status === 'Rejected' && (
              <View style={[styles.systemMsg, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }]}>
                <Text style={[styles.systemTxt, { color: '#ef4444' }]}>
                  ❌ Astrologer rejected the request. Please try another astrologer.
                </Text>
              </View>
            )}
            {status === 'Cancelled' && (
              <View style={[styles.systemMsg, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }]}>
                <Text style={[styles.systemTxt, { color: '#ef4444' }]}>🚫 Chat request cancelled.</Text>
              </View>
            )}
          </>
        )}
      />

      {/* ── Input ─────────────────────────────────────────────────────────── */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder={
            status === 'Pending'   ? 'Waiting for astrologer…' :
            status === 'Completed' ? 'Chat has ended' :
            status === 'Rejected'  ? 'Chat was rejected' :
            status === 'Cancelled' ? 'Chat was cancelled' :
            'Type your message…'
          }
          placeholderTextColor={colors.textMuted}
          value={newMessage}
          onChangeText={handleInputChange}
          editable={status === 'Accepted' && !sending}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (status !== 'Accepted' || !newMessage.trim() || sending) && styles.sendBtnOff]}
          onPress={handleSend}
          disabled={status !== 'Accepted' || !newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#1A1A1A" size="small" />
          ) : (
            <Text style={styles.sendIcon}>🏹</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Rating Modal ───────────────────────────────────────────────────── */}
      <Modal visible={showRating} animationType="slide" transparent>
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingModal}>
            <Text style={styles.ratingTitle}>Rate Your Experience</Text>
            <Text style={styles.ratingSubtitle}>
              How was your chat with {activeChat?.astrologerName || 'the astrologer'}?
            </Text>
            <StarRating value={ratingValue} onChange={setRatingValue} />
            <TextInput
              style={styles.ratingTextarea}
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="Write a review (optional)…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.ratingSubmitBtn, ratingSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmitRating}
              disabled={ratingSubmitting}
            >
              {ratingSubmitting ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <Text style={styles.ratingSubmitText}>Submit Review ✨</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ratingSkipBtn}
              onPress={() => { setShowRating(false); onBack(); }}
            >
              <Text style={styles.ratingSkipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default ChatRoomScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F7F7F7' },
  centered:    { flex: 1, backgroundColor: '#F7F7F7', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.goldDark, marginTop: 16, fontSize: 15, fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  backBtn:  { padding: 6 },
  backIcon: { color: colors.text, fontSize: 24 },

  headerAvatarWrap: { position: 'relative' },
  headerAvatar:     { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.gold },
  headerStatusDot:  { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.primary },

  headerInfo:   { flex: 1 },
  headerName:   { color: colors.text, fontSize: 15, fontWeight: '700' },
  headerStatus: { fontSize: 11, fontWeight: '600', marginTop: 1 },

  headerRight:  { alignItems: 'flex-end', gap: 4 },
  timerText:    { color: colors.gold, fontSize: 13, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  walletChip:   { color: colors.success, fontSize: 11, fontWeight: '700' },
  endBtn:       { backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  endBtnText:   { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  list:       { padding: 16, paddingBottom: 20 },
  bubbleWrap: { marginBottom: 10, flexDirection: 'row' },
  myWrap:     { justifyContent: 'flex-end' },
  theirWrap:  { justifyContent: 'flex-start' },
  bubble:     { maxWidth: '82%', padding: 12, borderRadius: 18 },
  myBubble:   { backgroundColor: colors.gold, borderBottomRightRadius: 4 },
  theirBubble:{ backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  myText:     { color: '#FFFFFF', fontWeight: '500' },
  theirText:  { color: colors.text },
  bubbleFooter:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 3 },
  bubbleTime: { fontSize: 10 },
  myTime:     { color: 'rgba(0,0,0,0.4)' },
  theirTime:  { color: colors.textMuted },
  tickText:   { fontSize: 11, fontWeight: '700', letterSpacing: -1 },
  typingText: { color: colors.textMuted, fontStyle: 'italic', fontSize: 13 },

  systemMsg: {
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(245,200,66,0.08)',
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  systemTxt: { color: colors.gold, fontSize: 13, textAlign: 'center', fontStyle: 'italic', lineHeight: 18 },

  // ── Puja card ─────────────────────────────────────────────────────────────
  pujaCard: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(245,158,11,0.4)',
    marginHorizontal: 8,
    marginBottom: 12,
  },
  pujaCardTag:     { color: '#f59e0b', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  pujaCardTitle:   { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  pujaCardAstro:   { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  pujaCardPrice:   { color: colors.gold, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  pujaCardActions: { flexDirection: 'row', gap: 10 },
  pujaActionBtn:   { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  pujaAcceptBtn:   { backgroundColor: colors.gold },
  pujaAcceptBtnText: { color: '#1A1A1A', fontWeight: '800', fontSize: 13 },
  pujaDeclineBtn:  { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
  pujaDeclineBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },

  // ── Input ─────────────────────────────────────────────────────────────────
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    backgroundColor: colors.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn:    { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  sendBtnOff: { backgroundColor: colors.surface, opacity: 0.4 },
  sendIcon:   { fontSize: 22 },

  // ── Rating modal ──────────────────────────────────────────────────────────
  ratingOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  ratingModal:    { backgroundColor: colors.secondary, borderRadius: 28, padding: 28, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  ratingTitle:    { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  ratingSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 4, lineHeight: 20 },
  ratingTextarea: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
    marginTop: 4,
  },
  ratingSubmitBtn:  { backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  ratingSubmitText: { color: '#1A1A1A', fontSize: 15, fontWeight: '800' },
  ratingSkipBtn:    { paddingVertical: 10 },
  ratingSkipText:   { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
