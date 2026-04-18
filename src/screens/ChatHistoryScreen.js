import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { accountApi } from '../api/services';
import { imgUrl } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

// ─── Chat History Item ────────────────────────────────────────────────────────
const HistoryItem = ({ item, onOpenChat, onAstrologerPress }) => {
  const avatarUri = imgUrl(item.profileImage || item.astrologerImage);
  const isCompleted = item.chatStatus === 'Completed';
  const statusColor = isCompleted ? colors.success : colors.warning;

  return (
    <TouchableOpacity
      style={styles.historyCard}
      onPress={() => item.id && onOpenChat && onOpenChat(item.id)}
      activeOpacity={0.85}
    >
      <TouchableOpacity 
        style={styles.avatarWrap} 
        onPress={() => onAstrologerPress && onAstrologerPress({ id: item.astrologerId || item.astrologer || item.id })}
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={26} color={colors.gold} />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.cardInfo}>
        <TouchableOpacity onPress={() => onAstrologerPress && onAstrologerPress({ id: item.astrologerId || item.astrologer || item.id })}>
          <Text style={styles.astroName}>
            {item.astrologerName || item.name || 'Astrologer'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.topic} numberOfLines={1}>
          {item.lastMessage || item.topicOfConcern || 'General Consultation'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaBadge}>{item.totalMin || item.chat_duration || 0} mins</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaAmt}>₹{parseFloat(item.deduction || item.amount || 0).toFixed(1)}</Text>
        </View>
        <Text style={styles.date}>{fmtDate(item.created_at || item.date)}</Text>
      </View>
      <View style={styles.cardRight}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '20', borderColor: statusColor },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {item.chatStatus || 'Completed'}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textMuted}
          style={{ marginTop: 8 }}
        />
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ChatHistoryScreen = ({ onBack, onOpenChat, onAstrologerPress }) => {
  const { can } = usePermissions();
  const { user } = useSelector((s) => s.auth);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    accountApi
      .getChatHistory({ userId: user?.id, startIndex: 0, fetchRecord: 50 })
      .then((res) => {
        const list =
          res.data?.recordList ||
          res.data?.chatList ||
          res.data?.data ||
          [];
        setHistory(Array.isArray(list) ? list : []);
      })
      .catch((err) => setError(err?.message || 'Failed to load chat history'))
      .finally(() => setLoading(false));
  }, []);

  if (!can('chat_history')) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat History</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyText}>Access Restricted</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Loading history…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={52}
            color={colors.error || '#ef4444'}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(null);
              setLoading(true);
              accountApi
                .getChatHistory({ userId: user?.id, startIndex: 0, fetchRecord: 50 })
                .then((res) => {
                  const list =
                    res.data?.recordList || res.data?.chatList || res.data?.data || [];
                  setHistory(Array.isArray(list) ? list : []);
                })
                .catch((err) => setError(err?.message || 'Failed to load'))
                .finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, i) => String(item.id || i)}
          renderItem={({ item }) => (
            <HistoryItem item={item} onOpenChat={onOpenChat} onAstrologerPress={onAstrologerPress} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons
                name="chat-remove-outline"
                size={56}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>No chat history yet</Text>
              <Text style={styles.emptySubText}>
                Your past sessions will appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ChatHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 44,
    paddingBottom: 12,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },

  list: { padding: 14, gap: 10 },

  historyCard: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  cardInfo: { flex: 1 },
  astroName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  topic: { fontSize: 12, color: colors.textMuted, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  metaBadge: { fontSize: 11, fontWeight: '600', color: '#1A1A1A', backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  metaAmt: { fontSize: 11, fontWeight: '700', color: colors.success },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CCCCCC' },
  date: { fontSize: 11, color: colors.textSecondary },

  cardRight: { alignItems: 'flex-end' },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#1A1A1A', fontWeight: '700', fontSize: 13 },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
});
