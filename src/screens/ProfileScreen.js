import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';
import { logout, setGlobalLang } from '../store/slices/authSlice';
import { getChatHistory } from '../store/slices/chatSlice';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Chat History Section ─────────────────────────────────────────────────────
const ChatHistorySection = ({ onOpenChat }) => {
  const dispatch  = useDispatch();
  const { history, historyLoad, historyErr } = useSelector((s) => s.chat);
  const { settings } = useSelector((s) => s.auth);
  const curr = settings?.currencySymbol || '₹';

  React.useEffect(() => {
    dispatch(getChatHistory({ startIndex: 0, fetchRecord: 20 }));
  }, []);

  if (historyLoad && history.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }
  if (historyErr) {
    return <Text style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', marginVertical: 12 }}>{historyErr}</Text>;
  }
  if (history.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>No chat history yet</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {history.map((item, i) => {
        const statusColor = item.chatStatus === 'Completed' ? colors.success
          : item.chatStatus === 'Rejected' ? '#ef4444' : colors.gold;
        return (
          <TouchableOpacity
            key={item.id || i}
            style={styles.histCard}
            onPress={() => onOpenChat && item.chatStatus === 'Accepted' && onOpenChat(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.histLeft}>
              <Text style={styles.histName}>{item.astrologerName || 'Astrologer'}</Text>
              <Text style={styles.histDate}>{formatDate(item.created_at)}</Text>
              {item.chatDuration ? (
                <Text style={styles.histDuration}>
                  ⏱ {Math.floor(item.chatDuration / 60)} min {item.chatDuration % 60} sec
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: statusColor + '18' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{item.chatStatus}</Text>
              </View>
              {item.totalAmount ? (
                <Text style={styles.histAmount}>{curr}{parseFloat(item.totalAmount).toFixed(2)}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProfileScreen = ({ 
  onEditProfile, onWallet, onOpenChat, onBack, 
  onChatHistory, onReferEarn, onHelpSupport, onAbout, onTerms, onPrivacy
}) => {
  const dispatch = useDispatch();
  const { user, walletBalance, settings, globalLang } = useSelector((s) => s.auth);
  const curr = settings?.currencySymbol || '₹';
  const { can } = usePermissions();
  const [activeSection, setActiveSection] = useState(null);
  const [showLangModal, setShowLangModal] = useState(false);

  const handleLogout = () => dispatch(logout());

  const handleLangSelect = (lang) => {
    dispatch(setGlobalLang(lang));
    setShowLangModal(false);
  };

  const handleRowPress = (action) => {
    if (!action) return;
    if (action === 'editProfile' && onEditProfile) onEditProfile();
    else if (action === 'wallet' && onWallet) onWallet();
    else if (action === 'history') {
      if (onChatHistory) onChatHistory();
      else setActiveSection(activeSection === 'history' ? null : 'history');
    }
    else if (action === 'language') setShowLangModal(true);
    else if (action === 'refer' && onReferEarn) onReferEarn();
    else if (action === 'privacy' && onPrivacy) onPrivacy();
    else if (action === 'terms' && onTerms) onTerms();
    else if (action === 'help' && onHelpSupport) onHelpSupport();
    else if (action === 'about' && onAbout) onAbout();
  };

  const ALL_PROFILE_ROWS = [
    {
      section: 'Account',
      items: [
        { icon: 'edit-2',         iconLib: 'feather',  label: 'Edit Profile',         sub: 'Update your details',        action: 'editProfile',  permKey: 'profile_edit' },
        { icon: 'globe',          iconLib: 'feather',  label: 'Language',              sub: globalLang === 'hi' ? 'Hindi' : 'English', action: 'language' },
      ],
    },
    {
      section: 'Wallet & Orders',
      items: [
        { icon: 'wallet-outline', iconLib: 'ion',      label: 'My Wallet',             sub: 'Balance & recharge',         action: 'wallet',       permKey: 'profile_wallet' },
        { icon: 'chatbubble-ellipses-outline', iconLib: 'ion', label: 'Chat History', sub: 'Past sessions',               action: 'history' },
        { icon: 'gift-outline',   iconLib: 'ion',      label: 'Refer & Earn',          sub: 'Invite friends, earn rewards', action: 'refer', permKey: 'refer_and_earn' },
      ],
    },
    {
      section: 'Privacy & Support',
      items: [
        { icon: 'lock-closed-outline',  iconLib: 'ion', label: 'Privacy Policy',    sub: 'How we use your data',      action: 'privacy' },
        { icon: 'document-text-outline', iconLib: 'ion', label: 'Terms & Conditions', sub: 'App usage terms',           action: 'terms' },
        { icon: 'headset-outline',  iconLib: 'ion',     label: 'Help & Support',    sub: 'FAQs & contact us',          action: 'help',    permKey: 'help_support' },
        { icon: 'information-circle-outline', iconLib: 'ion', label: 'About',        sub: 'Version 1.0.0',              action: 'about' },
      ],
    },
  ];

  const PROFILE_ROWS = ALL_PROFILE_ROWS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permKey || can(item.permKey)),
    }))
    .filter((section) => section.items.length > 0);

  const renderIcon = (item) => {
    if (item.iconLib === 'feather') return <Feather name={item.icon} size={17} color={colors.textSecondary} />;
    return <Ionicons name={item.icon} size={17} color={colors.textSecondary} />;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* White Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>My Profile</Text>
        {can('profile_edit') && (
          <TouchableOpacity style={styles.editHeaderBtn} onPress={onEditProfile}>
            <Feather name="edit-2" size={14} color={colors.textSecondary} />
            <Text style={styles.editHeaderText}> Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <Ionicons name="person" size={30} color={colors.gold} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Astro User'}</Text>
            {user?.email ? (
              <View style={styles.profileDetailRow}>
                <Feather name="mail" size={11} color={colors.textMuted} />
                <Text style={styles.profileDetail}> {user.email}</Text>
              </View>
            ) : null}
            <View style={styles.profileDetailRow}>
              <Feather name="phone" size={11} color={colors.textMuted} />
              <Text style={styles.profileDetail}> +91 {user?.contactNo || '––'}</Text>
            </View>
            {user?.birthPlace ? (
              <View style={styles.profileDetailRow}>
                <Feather name="map-pin" size={11} color={colors.textMuted} />
                <Text style={styles.profileDetail}> {user.birthPlace}</Text>
              </View>
            ) : null}
          </View>
          {user?.referral_token ? (
            <View style={styles.referralBadge}>
              <Text style={styles.referralLabel}>Referral</Text>
              <Text style={styles.referralCode}>{user.referral_token}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {can('wallet') && (
            <TouchableOpacity style={styles.statCard} onPress={onWallet} activeOpacity={0.8}>
              <Text style={styles.statEmoji}>💰</Text>
              <Text style={styles.statValue}>{curr}{parseFloat(user?.totalWalletAmount || walletBalance || 0).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Balance</Text>
            </TouchableOpacity>
          )}
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🎯</Text>
            <Text style={styles.statValue}>{user?.totalSession || 0}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>{user?.rating ? parseFloat(user.rating).toFixed(1) : 'New'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* ── Recharge Button ── */}
        {can('wallet') && (
          <TouchableOpacity style={styles.rechargeBtn} activeOpacity={0.85} onPress={onWallet}>
            <Ionicons name="add-circle-outline" size={18} color="#1A1A1A" style={{ marginRight: 6 }} />
            <Text style={styles.rechargeText}>Recharge Wallet</Text>
          </TouchableOpacity>
        )}

        {/* ── Menu Rows ── */}
        {PROFILE_ROWS.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.75}
                    onPress={() => handleRowPress(item.action)}
                  >
                    <View style={styles.rowIconBg}>
                      {renderIcon(item)}
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>
                        {item.label}
                        {item.action === 'wallet' ? `   ${curr}${parseFloat(walletBalance || 0).toFixed(0)}` : ''}
                      </Text>
                      <Text style={styles.rowSub}>{item.sub}</Text>
                    </View>
                    <Ionicons
                      name={item.action === 'history' && activeSection === 'history' ? 'chevron-up' : 'chevron-forward'}
                      size={16}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Inline Chat History */}
                  {item.action === 'history' && activeSection === 'history' && (
                    <View style={styles.historyExpand}>
                      <ChatHistorySection onOpenChat={onOpenChat} />
                    </View>
                  )}

                  {i < section.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>  Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={showLangModal} transparent animationType="slide" onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowLangModal(false)} />
          <View style={styles.langSheet}>
            <View style={styles.langHeader}>
              <Text style={styles.langTitle}>Select Language</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowLangModal(false)}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.langOptions}>
              {[
                { id: 'en', name: 'English', icon: '🇺🇸' },
                { id: 'hi', name: 'Hindi', icon: '🇮🇳' },
              ].map((l) => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.langOpt, globalLang === l.id && styles.langOptActive]}
                  onPress={() => handleLangSelect(l.id)}
                >
                  <View style={styles.langOptLeft}>
                    <Text style={styles.langIcon}>{l.icon}</Text>
                    <Text style={styles.langText}>{l.name}</Text>
                  </View>
                  {globalLang === l.id && <Ionicons name="checkmark-circle" size={22} color={colors.goldDark} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 42,
    paddingBottom: 12,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  editHeaderText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Profile Card ──────────────────────────────────────────────────────────
  profileCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarRing: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2.5, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldBg,
  },
  avatarInner: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  profileDetailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  profileDetail: { color: colors.textSecondary, fontSize: 12 },
  referralBadge: {
    backgroundColor: colors.goldBg,
    borderRadius: 10, borderWidth: 1,
    borderColor: colors.borderGold,
    paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center',
  },
  referralLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  referralCode: { color: colors.goldDark, fontSize: 12, fontWeight: '800', marginTop: 2 },

  // ── Stats ─────────────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#EFEFEF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statValue: { color: colors.goldDark, fontSize: 15, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 3, textAlign: 'center' },

  // ── Recharge ──────────────────────────────────────────────────────────────
  rechargeBtn: {
    backgroundColor: colors.gold,
    borderRadius: 12, paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  rechargeText: { color: '#1A1A1A', fontSize: 15, fontWeight: '800' },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: { marginBottom: 14 },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: colors.primary,
    borderRadius: 14, borderWidth: 1,
    borderColor: '#EFEFEF', overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowIconBg: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 14 },

  // Chat history
  historyExpand: { padding: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  histCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#EFEFEF',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  histLeft: { flex: 1, marginRight: 8 },
  histName: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  histDate: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  histDuration: { color: colors.textSecondary, fontSize: 11 },
  histAmount: { color: colors.goldDark, fontSize: 13, fontWeight: '700' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
    marginBottom: 8,
  },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '700' },

  // Language Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  langSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  langHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  langTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  langOptions: { gap: 12 },
  langOpt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  langOptActive: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  langOptLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langIcon: { fontSize: 22, color: colors.goldDark, fontWeight: '600' },
  langText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
});
