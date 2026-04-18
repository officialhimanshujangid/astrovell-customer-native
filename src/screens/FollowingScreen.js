import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { astrologerApi } from '../api/services';
import { imgUrl } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';

const FollowingScreen = ({ onBack, onAstrologerPress }) => {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    astrologerApi.getFollowing({})
      .then((res) => {
        const d = res.data?.data || res.data;
        setFollowing(Array.isArray(d) ? d : d?.recordList || []);
      })
      .catch((err) => setError(err?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const renderItem = ({ item }) => {
    const uri = imgUrl(item.profileImage || item.image);
    const isOnline = item.chatStatus === 'Online' || item.callStatus === 'Online';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onAstrologerPress && onAstrologerPress(item)}
        activeOpacity={0.85}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={28} color={colors.gold} />
          </View>
        )}
        {/* Online dot */}
        <View style={[styles.onlineDot, { backgroundColor: isOnline ? colors.success : '#CCC' }]} />
        <Text style={styles.name} numberOfLines={1}>{item.name || item.astrologerName}</Text>
        <Text style={styles.skill} numberOfLines={1}>
          {item.primarySkill || item.skill || 'Astrologer'}
        </Text>
        <Text style={[styles.statusText, { color: isOnline ? colors.success : colors.textMuted }]}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Following</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.subText}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={52} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item, i) => String(item.astrologerId || item.id || i)}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons name="account-star-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Not following anyone yet</Text>
              <Text style={styles.subText}>Follow astrologers from their profile page</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default FollowingScreen;

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
  grid: { padding: 12, gap: 12 },
  row: { gap: 12 },
  card: {
    flex: 1, backgroundColor: colors.primary,
    borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#EFEFEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: {
    backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.gold,
  },
  onlineDot: {
    width: 10, height: 10, borderRadius: 5,
    position: 'absolute', top: 14, right: 14,
    borderWidth: 1.5, borderColor: '#FFF',
  },
  name: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
  skill: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  statusText: { fontSize: 11, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16 },
  subText: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  errorText: { fontSize: 14, color: colors.error, marginTop: 12 },
});
