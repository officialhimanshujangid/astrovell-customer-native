import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { callApi } from '../api/services';
import { imgUrl } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_COLORS = {
  Completed: colors.success,
  completed: colors.success,
  Cancelled: colors.error,
  cancelled: colors.error,
  Missed: colors.warning,
  missed: colors.warning,
};

const CallItem = ({ item, onAstrologerPress }) => {
  const avatarUri = imgUrl(item.profileImage || item.astrologerImage);
  const statusColor = STATUS_COLORS[item.status] || colors.textMuted;

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => onAstrologerPress && onAstrologerPress({ id: item.astrologerId || item.id })}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="call" size={22} color={colors.gold} />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.cardInfo}>
        <TouchableOpacity onPress={() => onAstrologerPress && onAstrologerPress({ id: item.astrologerId || item.id })}>
          <Text style={styles.name}>{item.astrologerName || item.name || 'Astrologer'}</Text>
        </TouchableOpacity>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{item.totalMin || item.call_duration || 0} min</Text>
          <Text style={styles.metaDot}>·</Text>
          <Ionicons name="wallet-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>₹{parseFloat(item.deduction || item.amount || 0).toFixed(2)}</Text>
        </View>
        {item.created_at ? <Text style={styles.date}>{fmtDate(item.created_at)}</Text> : null}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {item.status || 'Completed'}
        </Text>
      </View>
    </View>
  );
};

const CallHistoryScreen = ({ onBack, onAstrologerPress }) => {
  const { can } = usePermissions();
  const { user } = useSelector((s) => s.auth);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    callApi.getCallHistory({ userId: user?.id, startIndex: 0, fetchRecord: 50 })
      .then((res) => {
        const d = res.data?.data || res.data;
        setCalls(Array.isArray(d) ? d : d?.recordList || []);
      })
      .catch((err) => setError(err?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.subText}>Loading call history…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={52} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item, i) => String(item.id || i)}
          renderItem={({ item }) => <CallItem item={item} onAstrologerPress={onAstrologerPress} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons name="phone-off" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No call history yet</Text>
              <Text style={styles.subText}>Your completed calls will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default CallHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 44, paddingBottom: 12,
    backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  list: { padding: 14, gap: 10 },
  card: {
    backgroundColor: colors.primary, borderRadius: 12,
    borderWidth: 1, borderColor: '#EFEFEF',
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.gold,
  },
  cardInfo: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  metaText: { fontSize: 12, color: colors.textMuted },
  metaDot: { fontSize: 12, color: colors.textMuted },
  date: { fontSize: 11, color: colors.textSecondary },
  statusBadge: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16 },
  subText: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  errorText: { fontSize: 14, color: colors.error, marginTop: 12, textAlign: 'center' },
});
