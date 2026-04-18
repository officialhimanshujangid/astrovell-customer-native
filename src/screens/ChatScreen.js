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
  Alert,
  ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { fetchAstrologers, imgUrl } from '../store/slices/homeSlice';
import { addIntakeForm, addChatRequest } from '../store/slices/chatSlice';
import { fetchWalletBalance } from '../store/slices/walletSlice';
import { colors } from '../theme/colors';
import { chatApi } from '../api/services';

// ─── Constants ────────────────────────────────────────────────────────────────
// Removed hardcoded FILTERS in favor of dynamic generation

// ─── Star Rating ─────────────────────────────────────────────────────────────
const StarRating = ({ rating = 4.5 }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {stars.map((s) => (
        <AntDesign
          key={s}
          name={rating >= s ? 'star' : rating >= s - 0.5 ? 'staro' : 'staro'}
          size={10}
          color="#FF9500"
        />
      ))}
    </View>
  );
};

// ─── Astrologer Card (AstroTalk list style) ──────────────────────────────────
const AstrologerCard = ({ item, onChatPress, loadingId, onAstrologerPress }) => {
  const avatarUri = imgUrl(item.profileImage);
  const isOnline = item.chatStatus === 'Online';
  const isBusy = item.chatStatus === 'Busy';
  const isLoading = loadingId === item.id;

  const orderCount = item.orderCount || item.totalOrders || 0;
  const expYears = item.experience || item.experiance || 1;
  const rating = parseFloat(item.rating || 4.5);
  const chargePerMin = parseFloat(item.charge || 5);
  const discountCharge = item.discountCharge ? parseFloat(item.discountCharge) : null;

  const skills = [item.primarySkill, item.allSkill]
    .filter(Boolean)
    .join(',  ');

  const langs = item.languageKnown || 'Hindi, English';

  const getBtnStyle = () => {
    if (isOnline) return { bg: '#FFF', border: colors.accent, text: colors.accent };
    if (isBusy) return { bg: '#FFF', border: '#FF9500', text: '#FF9500' };
    return { bg: '#F5F5F5', border: '#DDD', text: colors.textMuted };
  };

  const btnStyle = getBtnStyle();
  const waitTime = item.waitTime ? `wait ~ ${item.waitTime}m` : null;

  return (
    <View style={styles.card}>
      {/* Avatar */}
      <TouchableOpacity onPress={() => onAstrologerPress && onAstrologerPress(item)} activeOpacity={0.8} style={styles.avatarSection}>
        <View style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={26} color={colors.gold} />
            </View>
          )}
          {/* Online indicator (green circle checkmark) */}
          {isOnline && (
            <View style={styles.onlineBadge}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.cardInfo}>
        <TouchableOpacity onPress={() => onAstrologerPress && onAstrologerPress(item)} activeOpacity={0.8}>
          <Text style={styles.astroName}>{item.name}</Text>
        </TouchableOpacity>
        <Text style={styles.astroSpecialty} numberOfLines={1}>
          {skills || 'Vedic, Vaastu'}
        </Text>
        <Text style={styles.astroLang} numberOfLines={1}>{langs}</Text>
        <Text style={styles.astroExp}>Exp- {expYears} Years</Text>

        {/* Rating row */}
        <View style={styles.ratingRow}>
          <StarRating rating={rating} />
          <Text style={styles.orderCountText}>{orderCount.toLocaleString('en-IN')}+ orders</Text>
        </View>

        {/* Price row */}
        <View style={styles.priceRow}>
          {discountCharge && discountCharge < chargePerMin ? (
            <>
              <Text style={styles.priceStrike}>₹{chargePerMin}/min</Text>
              <Text style={styles.priceDiscounted}> ₹{discountCharge}/min</Text>
            </>
          ) : (
            <Text style={styles.price}>₹{chargePerMin}/min</Text>
          )}
        </View>
      </View>

      {/* Action */}
      <View style={styles.cardAction}>
        <TouchableOpacity
          style={[
            styles.chatBtn,
            { borderColor: btnStyle.border, backgroundColor: btnStyle.bg },
          ]}
          onPress={() => onChatPress(item)}
          disabled={!!loadingId || !isOnline && !isBusy}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={btnStyle.text} />
          ) : (
            <Text style={[styles.chatBtnText, { color: btnStyle.text }]}>
              {isOnline ? 'Chat' : isBusy ? 'Busy' : 'Offline'}
            </Text>
          )}
        </TouchableOpacity>
        {waitTime && isOnline && (
          <Text style={styles.waitText}>{waitTime}</Text>
        )}
      </View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const ChatScreen = ({
  onStartChat,
  onMenuPress,        // opens the sidebar drawer
  onChatHistoryPress, // opens Chat History screen
  initialSearch,      // pre-fill from home search
  onSearchConsumed,   // notify parent once initialSearch consumed
  onAstrologerPress,  // navigate to astrologer detail
  onWalletPress,      // click the wallet pill to recharge
  onProfilePress,     // click the profile icon
}) => {
  const dispatch = useDispatch();
  const { user, walletBalance, settings } = useSelector((state) => state.auth);
  const { astrologers, astrologersLoad, astrologersErr } = useSelector((s) => s.home);
  const { balance: walletSliceBalance } = useSelector((s) => s.wallet);
  const effectiveBalance = walletSliceBalance > 0 ? walletSliceBalance : (walletBalance || 0);
  const currencySymbol = settings?.currencySymbol || '₹';

  const [search, setSearch] = useState(initialSearch || '');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loadingId, setLoadingId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  // Consume the initialSearch from parent once it's been applied
  React.useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      if (onSearchConsumed) onSearchConsumed();
    }
  }, [initialSearch]);

  useEffect(() => {
    dispatch(fetchAstrologers());
    dispatch(fetchWalletBalance());
    chatApi.getActiveSession()
      .then((res) => {
        const session = res.data?.activeChat || res.data?.recordList || null;
        if (session?.id) setActiveSession(session);
      })
      .catch(() => { });
  }, []);

  // Dynamically calculate filters based on present astrologer skills
  const availableFilters = React.useMemo(() => {
    const skills = new Set();
    astrologers.forEach((a) => {
      const text = [a.primarySkill, a.allSkill].filter(Boolean).join(',');
      const parts = text.split(',');
      parts.forEach((p) => {
        const trimmed = p.trim();
        // Capitalize first letter properly for presentation
        if (trimmed) {
          skills.add(trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase());
        }
      });
    });
    return ['All', ...Array.from(skills).sort()];
  }, [astrologers]);

  const filtered = React.useMemo(() => {
    return astrologers.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.primarySkill || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.allSkill || '').toLowerCase().includes(search.toLowerCase());

      if (activeFilter === 'All') return matchSearch;

      const hasSkill = [a.primarySkill, a.allSkill]
        .filter(Boolean)
        .join(',')
        .toLowerCase()
        .includes(activeFilter.toLowerCase());

      return matchSearch && hasSkill;
    });
  }, [astrologers, search, activeFilter]);

  const onlineCount = astrologers.filter((a) => a.chatStatus === 'Online').length;

  const handleChatPress = async (astro) => {
    if (!user) {
      Toast.show({ type: 'info', text1: 'Login Required', text2: 'Please login to chat with astrologers' });
      return;
    }
    if (astro.chatStatus === 'Offline') {
      Toast.show({ type: 'info', text1: 'Offline', text2: 'Astrologer is currently offline' });
      return;
    }
    if (loadingId) return;

    setLoadingId(astro.id);
    try {
      const intakePayload = {
        userId: user?.id,
        astrologerId: astro.id,
        name: user?.name || 'User',
        phoneNumber: user?.contactNo || '',
        gender: user?.gender || 'Male',
        maritalStatus: user?.maritalStatus || 'Single',
        birthDate: user?.birthDate || '',
        birthTime: user?.birthTime || '',
        birthPlace: user?.birthPlace || '',
        topicOfConcern: 'General Consultation',
        chat_duration: 5 * 60,
      };
      await dispatch(addIntakeForm(intakePayload)).unwrap();

      const chatPayload = {
        astrologerId: astro.id,
        chatRate: parseFloat(astro.charge || 0),
      };
      const res = await dispatch(addChatRequest(chatPayload)).unwrap();

      if (res.status === 200 && res.recordList?.id) {
        onStartChat && onStartChat(res.recordList.id);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: res.message || 'Failed to start chat' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.message || 'Something went wrong' });
    } finally {
      setLoadingId(null);
    }
  };

  const ListHeader = () => (
    <>
      {/* Active Session Banner */}
      {activeSession && (
        <TouchableOpacity
          style={styles.resumeBanner}
          activeOpacity={0.85}
          onPress={() => onStartChat && onStartChat(activeSession.id)}
        >
          <View style={styles.resumeDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.resumeTitle}>Active Chat in Progress</Text>
            <Text style={styles.resumeSub}>
              {activeSession.astrologerName || 'Astrologer'} · {activeSession.chatStatus}
            </Text>
          </View>
          <Text style={styles.resumeArrow}>Resume →</Text>
        </TouchableOpacity>
      )}

      {/* AstroTalk Cashback Recharge Banner */}
      {/* <View style={styles.cashbackBanner}>
        <View style={styles.cashbackLeft}>
          <Text style={styles.cashbackTitle}>50% Cashback!</Text>
          <Text style={styles.cashbackSub}>ON NEXT RECHARGE</Text>
          <TouchableOpacity style={styles.rechargeBtn}>
            <Text style={styles.rechargeBtnText}>RECHARGE NOW</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cashbackRight}>
          <Text style={{ fontSize: 48, opacity: 0.3 }}>₹</Text>
          <Text style={{ fontSize: 56, opacity: 0.15, position: 'absolute', right: 8, top: 10 }}>₹</Text>
        </View>
      </View> */}

      {/* Search Input Toggle */}
      {showSearch && (
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search astrologer by name or skill..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Search Bar / Filters */}
      <View style={styles.searchWrap}>
        <Feather name="sliders" size={14} color={colors.textMuted} />
        <Text style={styles.filterLabel}>Filter</Text>
        {/* filter badge */}
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>{activeFilter !== 'All' ? 1 : 0}</Text>
        </View>

        {/* Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginLeft: 4 }}>
          {availableFilters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              {f === 'All' && <MaterialCommunityIcons name="view-grid-outline" size={13} color={activeFilter === 'All' ? '#1A1A1A' : colors.textMuted} style={{ marginRight: 4 }} />}
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* White Header (AstroTalk style) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerAvatar} onPress={() => onMenuPress && onMenuPress()} activeOpacity={0.7}>
            <Ionicons name="person-outline" size={18} color="#555" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hi {user?.name?.split(' ')[0] || 'User'}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Wallet Pill */}
          <TouchableOpacity 
            style={styles.walletPill} 
            activeOpacity={0.85} 
            onPress={() => onWalletPress && onWalletPress()}
          >
            <View style={styles.walletPillInner}>
              <Ionicons name="calendar-outline" size={11} color={colors.headerText} />
              <Text style={styles.walletPillText}>
                {currencySymbol}{effectiveBalance.toLocaleString('en-IN')}
              </Text>
              <View style={styles.addBtn}>
                <Ionicons name="add" size={12} color="#1A1A1A" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Search icon – focus the search/filter row */}
          <TouchableOpacity 
            style={[styles.iconBtn, showSearch && { backgroundColor: '#E0E0E0' }]} 
            activeOpacity={0.8}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name="search" size={20} color="#555" />
          </TouchableOpacity>

          {/* Chat history icon */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => onChatHistoryPress && onChatHistoryPress()}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#555" />
          </TouchableOpacity>

          {/* Profile icon */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.goldBg, borderWidth: 1.5, borderColor: colors.gold }]}
            onPress={() => onProfilePress && onProfilePress()}
            activeOpacity={0.8}
          >
            <Ionicons name="person" size={18} color={colors.gold} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading */}
      {astrologersLoad && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Finding Astrologers...</Text>
        </View>
      )}

      {/* Error */}
      {astrologersErr && !astrologersLoad && (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{astrologersErr}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => dispatch(fetchAstrologers())}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {!astrologersLoad && !astrologersErr && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<ListHeader />}
          renderItem={({ item }) => (
            <AstrologerCard
              item={item}
              onChatPress={handleChatPress}
              loadingId={loadingId}
              onAstrologerPress={onAstrologerPress}
            />
          )}
          ListEmptyComponent={
            !astrologersLoad ? (
              <View style={styles.centered}>
                <MaterialCommunityIcons name="magnify-close" size={48} color={colors.textMuted} />
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
  container: { flex: 1, backgroundColor: '#F7F7F7' },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 44,
    paddingBottom: 10,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  walletPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 2,
  },
  walletPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  walletPillText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  addBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  cashbackPillBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  cashbackPillText: { fontSize: 9, fontWeight: '800', color: '#1A1A1A' },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Search Input (Toggled via Header) ──────────────────────────────────
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: colors.text,
  },

  // ── Resume Banner ─────────────────────────────────────────────────────────
  resumeBanner: {
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  resumeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  resumeTitle: { color: colors.success, fontSize: 13, fontWeight: '800' },
  resumeSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  resumeArrow: { color: colors.success, fontSize: 13, fontWeight: '700' },

  // ── Cashback Banner ───────────────────────────────────────────────────────
  cashbackBanner: {
    backgroundColor: colors.gold,
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 18,
    paddingRight: 10,
  },
  cashbackLeft: { flex: 1 },
  cashbackTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  cashbackSub: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.55)',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  rechargeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  rechargeBtnText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cashbackRight: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // ── Filter Row ────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: colors.primary,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EBEBEB',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#1A1A1A', fontWeight: '800' },

  // ── List ──────────────────────────────────────────────────────────────────
  list: { paddingBottom: 24, paddingTop: 4 },

  // ── Card (AstroTalk list style) ───────────────────────────────────────────
  card: {
    backgroundColor: colors.primary,
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },

  avatarSection: { alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
  },
  avatarFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 1,
  },

  cardInfo: { flex: 1 },
  astroName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  astroSpecialty: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  astroLang: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  astroExp: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  orderCountText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  price: { fontSize: 13, color: colors.text, fontWeight: '700' },
  priceStrike: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginRight: 4,
  },
  priceDiscounted: { fontSize: 13, color: colors.accent, fontWeight: '800' },

  cardAction: { alignItems: 'center', gap: 6 },
  chatBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnText: { fontSize: 13, fontWeight: '800' },
  waitText: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },

  // ── States ────────────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
  errorText: { color: colors.textMuted, fontSize: 14, marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: { color: '#1A1A1A', fontWeight: '700', fontSize: 13 },
});
