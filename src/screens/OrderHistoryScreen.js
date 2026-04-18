import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { accountApi } from '../api/services';
import { colors } from '../theme/colors';

const ORDER_TYPES = [
  { key: 'all',       label: 'All',     color: colors.text },
  { key: 'puja',      label: 'Puja',    color: '#059669' },
  { key: 'chat',      label: 'Chat',    color: '#2563eb' },
  { key: 'call',      label: 'Call',    color: '#d97706' },
  { key: 'report',    label: 'Report',  color: '#7c3aed' },
  { key: 'astromall', label: 'Product', color: '#db2777' },
];

const TYPE_META = {
  puja:      { bg: '#f0fdf4', border: '#10b981', text: '#059669' },
  chat:      { bg: '#eff6ff', border: '#3b82f6', text: '#2563eb' },
  call:      { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' },
  report:    { bg: '#f5f3ff', border: '#7c3aed', text: '#7c3aed' },
  astromall: { bg: '#fce7f3', border: '#ec4899', text: '#db2777' },
};

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusColor = (status = '') => {
  const s = status.toLowerCase();
  if (s.includes('complet')) return { bg: '#d1fae5', text: '#065f46' };
  if (s.includes('cancel'))  return { bg: '#fee2e2', text: '#991b1b' };
  return { bg: '#fef3c7', text: '#92400e' };
};

const OrderCard = ({ item }) => {
  const tm = TYPE_META[item.orderType] || { bg: '#f9fafb', border: '#d1d5db', text: '#374151' };
  const sc = statusColor(item.status);
  return (
    <View style={[styles.card, { borderLeftColor: tm.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.typeBadge, { backgroundColor: tm.bg }]}>
          <Text style={[styles.typeText, { color: tm.text }]}>
            {ORDER_TYPES.find((t) => t.key === item.orderType)?.label || item.orderType}
          </Text>
        </View>
        <Text style={styles.orderId}>#{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{item.status || 'Placed'}</Text>
        </View>
      </View>
      <Text style={styles.orderName}>{item.name || item.orderType}</Text>
      {item.astrologerName ? <Text style={styles.metaLine}>Astrologer: {item.astrologerName}</Text> : null}
      {item.packageName ? <Text style={styles.metaLine}>Package: {item.packageName}</Text> : null}
      {item.totalMin > 0 ? <Text style={styles.metaLine}>Duration: {item.totalMin} min</Text> : null}
      <View style={styles.cardBottom}>
        <Text style={styles.amount}>₹{parseFloat(item.amount || 0).toFixed(2)}</Text>
        <Text style={styles.date}>{fmtDate(item.created_at)}</Text>
      </View>
    </View>
  );
};

const OrderHistoryScreen = ({ onBack }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    accountApi.getOrders()
      .then((res) => {
        const d = res.data?.data || res.data;
        setOrders(Array.isArray(d) ? d : d?.recordList || []);
      })
      .catch((err) => setError(err?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.orderType === filter);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {ORDER_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.chip, filter === t.key && styles.chipActive]}
              onPress={() => setFilter(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, filter === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.subText}>Loading orders…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={52} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => `${item.orderType}_${item.id || i}`}
          renderItem={({ item }) => <OrderCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons name="package-variant-closed" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.subText}>Your order history will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default OrderHistoryScreen;

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
  filterWrap: { backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFF',
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#1A1A1A' },
  list: { padding: 14, gap: 10 },
  card: {
    backgroundColor: colors.primary, borderRadius: 12,
    borderWidth: 1, borderColor: '#F0E6FF', borderLeftWidth: 4,
    padding: 14, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '700' },
  orderId: { fontSize: 12, color: '#9CA3AF', flex: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderName: { fontSize: 14, fontWeight: '700', color: colors.text },
  metaLine: { fontSize: 12, color: colors.textMuted },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  amount: { fontSize: 16, fontWeight: '800', color: colors.gold },
  date: { fontSize: 11, color: colors.textMuted },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16 },
  subText: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  errorText: { fontSize: 14, color: colors.error, marginTop: 12, textAlign: 'center' },
});
