import React, { useState, useEffect } from 'react';
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
  Dimensions,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAstrologers, imgUrl } from '../store/slices/homeSlice';
import { addIntakeForm, addChatRequest, getWalletBalance } from '../store/slices/chatSlice';
import { fetchWalletBalance } from '../store/slices/walletSlice';
import { colors } from '../theme/colors';
import { chatApi } from '../api/services';

const { width, height } = Dimensions.get('window');

const FILTERS = ['All', 'Online', 'Offline'];
const DURATION_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
];

const statusColor = (s) => (s === 'Online' ? colors.success : '#888');

const ChatScreen = ({ onStartChat }) => {
  const dispatch = useDispatch();
  const { user, walletBalance, settings } = useSelector((state) => state.auth);
  const { astrologers, astrologersLoad, astrologersErr } = useSelector((s) => s.home);
  const { intakeLoading, requestLoading } = useSelector((s) => s.chat);
  const { balance: walletSliceBalance } = useSelector((s) => s.wallet);
  // Prefer the live wallet slice balance over auth balance
  const effectiveBalance = walletSliceBalance > 0 ? walletSliceBalance : (walletBalance || 0);
  const currencySymbol = settings?.currencySymbol || '₹';

  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  // Track which astrologer card is currently loading (by id)
  const [loadingId, setLoadingId] = useState(null);
  // Active session (resume banner)
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    dispatch(fetchAstrologers());
    dispatch(fetchWalletBalance());
    // Fetch any active chat session to show resume card
    chatApi.getActiveSession()
      .then(res => {
        const session = res.data?.activeChat || res.data?.recordList || null;
        if (session?.id) setActiveSession(session);
      })
      .catch(() => {});
  }, []);

  const filtered = astrologers.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase())
      || (a.primarySkill || '').toLowerCase().includes(search.toLowerCase())
      || (a.allSkill || '').toLowerCase().includes(search.toLowerCase());
    if (activeFilter === 'All')    return matchSearch;
    if (activeFilter === 'Online') return matchSearch && a.chatStatus === 'Online';
    if (activeFilter === 'Offline') return matchSearch && a.chatStatus !== 'Online';
    return matchSearch;
  });

  const onlineCount = astrologers.filter(a => a.chatStatus === 'Online').length;

  const handleChatPress = async (astro) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to chat with astrologers');
      return;
    }
    if (astro.chatStatus === 'Offline') {
      Alert.alert('Offline', 'Astrologer is currently offline');
      return;
    }
    if (loadingId) return; // already processing another request

    setLoadingId(astro.id);
    try {
      // Build intake payload from saved user profile (static fallbacks for missing fields)
      const intakePayload = {
        userId:         user?.id,
        astrologerId:   astro.id,
        name:           user?.name           || 'User',
        phoneNumber:    user?.contactNo      || '',
        gender:         user?.gender         || 'Male',
        maritalStatus:  user?.maritalStatus  || 'Single',
        birthDate:      user?.birthDate      || '',
        birthTime:      user?.birthTime      || '',
        birthPlace:     user?.birthPlace     || '',
        topicOfConcern: 'General Consultation',
        chat_duration:  5 * 60, // default 5 minutes
      };
      console.log('[ChatScreen] Auto intake payload:', JSON.stringify(intakePayload));

      // 1. Add Intake Form (silent — no validation needed)
      const intakeRes = await dispatch(addIntakeForm(intakePayload)).unwrap();
      console.log('[ChatScreen] Intake response:', JSON.stringify(intakeRes));

      // 2. Add Chat Request
      const chatPayload = {
        astrologerId: astro.id,
        chatRate:     parseFloat(astro.charge || 0),
      };
      console.log('[ChatScreen] Chat request payload:', JSON.stringify(chatPayload));

      const res = await dispatch(addChatRequest(chatPayload)).unwrap();
      console.log('[ChatScreen] Chat request response:', JSON.stringify(res));

      if (res.status === 200 && res.recordList?.id) {
        onStartChat && onStartChat(res.recordList.id);
      } else {
        Alert.alert('Error', res.message || 'Failed to start chat');
      }
    } catch (err) {
      console.log('[ChatScreen] ERROR:', JSON.stringify(err));
      Alert.alert('Error', err?.message || JSON.stringify(err) || 'Something went wrong');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chat with Astrologer</Text>
          <Text style={styles.headerSub}>Talk to verified experts instantly</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{onlineCount} Online</Text>
        </View>
      </View>

      {/* Active Session Resume Banner */}
      {activeSession && (
        <TouchableOpacity
          style={styles.resumeBanner}
          activeOpacity={0.85}
          onPress={() => onStartChat && onStartChat(activeSession.id)}
        >
          <View style={styles.resumeDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.resumeTitle}>⚡ Active Chat in Progress⚡</Text>
            <Text style={styles.resumeSub}>
              {activeSession.astrologerName || 'Astrologer'} · {activeSession.chatStatus}
            </Text>
          </View>
          <Text style={styles.resumeArrow}>Resume →</Text>
        </TouchableOpacity>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or specialty…"
          placeholderTextColor={colors.textMuted}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading */}
      {astrologersLoad && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Finding astrologers…</Text>
        </View>
      )}

      {/* Error */}
      {astrologersErr && !astrologersLoad && (
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{astrologersErr}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchAstrologers())}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Astrologer Cards */}
      {!astrologersLoad && !astrologersErr && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const avatarUri = imgUrl(item.profileImage);
            return (
              <View style={styles.card}>
                <View style={[styles.avatarWrap, { borderColor: statusColor(item.chatStatus) }]}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 24 }}>🔮</Text>
                    </View>
                  )}
                  <View style={[styles.statusDot, { backgroundColor: statusColor(item.chatStatus) }]} />
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.astroName}>{item.name}</Text>
                  <Text style={styles.astroSpecialty} numberOfLines={1}>
                    {[item.primarySkill, item.allSkill].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={styles.astroLang} numberOfLines={1}>🌐 {item.languageKnown || 'Hindi'}</Text>
                  <View style={styles.metaRow}>
                    {item.rating > 0 && <Text style={styles.metaText}>⭐ {item.rating}</Text>}
                    {item.rating > 0 && <Text style={styles.metaDot}>·</Text>}
                    <Text style={[styles.metaText, { color: colors.gold }]}>₹{item.charge}/min</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.chatBtn, item.chatStatus !== 'Online' && styles.chatBtnOff]}
                  activeOpacity={0.85}
                  onPress={() => handleChatPress(item)}
                  disabled={!!loadingId}
                >
                  {loadingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.chatBtnText, item.chatStatus !== 'Online' && { color: colors.textMuted }]}>
                      {item.chatStatus === 'Online' ? '💬 Chat' : '⏳ Busy'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            !astrologersLoad ? (
              <View style={styles.centered}>
                <Text style={styles.errorEmoji}>🔮</Text>
                <Text style={styles.errorText}>No astrologers found</Text>
              </View>
            ) : null
          }
        />
      )}

    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

  // Active session resume banner
  resumeBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  resumeDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  resumeTitle:{ color: colors.success, fontSize: 13, fontWeight: '800' },
  resumeSub:  { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  resumeArrow:{ color: colors.success, fontSize: 13, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  headerSub:   { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(34,197,94,0.35)', gap: 6 },
  onlineDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  onlineText:  { color: colors.success, fontSize: 12, fontWeight: '700' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, gap: 10 },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 13 },
  clearBtn:    { color: colors.textMuted, fontSize: 14, paddingHorizontal: 4 },

  filterRow:        { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.goldGlow, borderColor: colors.borderGold },
  filterText:       { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: colors.gold, fontWeight: '700' },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
  errorEmoji:  { fontSize: 40, marginBottom: 12 },
  errorText:   { color: colors.textMuted, fontSize: 14 },
  retryBtn:    { marginTop: 16, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  retryText:   { color: colors.gold, fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },

  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, position: 'relative' },
  avatar:     { width: 52, height: 52, borderRadius: 26 },
  statusDot:  { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: colors.surface },
  cardBody:   { flex: 1 },
  astroName:     { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  astroSpecialty:{ color: colors.textSecondary, fontSize: 12, marginBottom: 2 },
  astroLang:     { color: colors.textMuted, fontSize: 11, marginBottom: 5 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:   { color: colors.textMuted, fontSize: 11 },
  metaDot:    { color: colors.textMuted },

  chatBtn:    { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  chatBtnOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chatBtnText:{ color: colors.primary, fontSize: 12, fontWeight: '800' },

  // Modal Styles
  modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.secondary, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 20, maxHeight: height * 0.85 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: colors.textMuted, fontSize: 14 },
  modalScroll: { padding: 24 },
  modalSub: { color: colors.gold, fontSize: 16, fontWeight: '700', marginBottom: 20 },
  inputGroup: { marginBottom: 18 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  modalInput: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, color: colors.text, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  genderBtnActive: { borderColor: colors.gold, backgroundColor: colors.goldGlow },
  genderTxt: { color: colors.textSecondary, fontWeight: '600' },
  genderTxtActive: { color: colors.gold },
  durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  durChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 80, alignItems: 'center' },
  durChipActive: { borderColor: colors.gold, backgroundColor: colors.goldGlow },
  durText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  durTextActive: { color: colors.gold },
  durPrice: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  durPriceActive: { color: colors.gold, opacity: 0.8 },
  walletInfo: { backgroundColor: 'rgba(245,200,66,0.1)', padding: 14, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: colors.goldGlow },
  walletTxt: { color: colors.gold, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  submitBtn: { backgroundColor: colors.gold, borderRadius: 15, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitBtnTxt: { color: colors.primary, fontSize: 16, fontWeight: '800' },
});
