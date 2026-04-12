import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
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
  const dispatch = useDispatch();
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
            style={[styles.histCard]}
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
              <View style={[styles.statusBadge, { borderColor: statusColor }]}>
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
const ProfileScreen = ({ onEditProfile, onWallet, onOpenChat }) => {
  const dispatch = useDispatch();
  const { user, walletBalance, settings } = useSelector((s) => s.auth);
  const curr = settings?.currencySymbol || '₹';
  const { can } = usePermissions();

  const [activeSection, setActiveSection] = useState(null); // null | 'history'

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleRowPress = (action) => {
    if (action === 'editProfile' && onEditProfile) onEditProfile();
    else if (action === 'wallet' && onWallet) onWallet();
    else if (action === 'history') setActiveSection(activeSection === 'history' ? null : 'history');
  };

  const ALL_PROFILE_ROWS = [
    {
      section: 'Account',
      items: [
        { icon: '✏️', label: 'Edit Profile', sub: 'Update your details', action: 'editProfile', permKey: 'profile_edit' },
        // { icon: '🔔', label: 'Notifications',      sub: 'Manage alerts', permKey: 'notifications' },
        { icon: '🌐', label: 'Language', sub: 'English (Default)' },
      ],
    },
    {
      section: 'Wallet & Orders',
      items: [
        { icon: '💰', label: 'My Wallet', sub: 'Balance & recharge', action: 'wallet', permKey: 'profile_wallet' },
        { icon: '💬', label: 'Chat History', sub: 'Past sessions', action: 'history' },
        { icon: '🎁', label: 'Refer & Earn', sub: 'Invite friends, earn rewards', permKey: 'refer_and_earn' },
      ],
    },
    {
      section: 'Privacy & Support',
      items: [
        { icon: '🔒', label: 'Privacy Policy', sub: 'How we use your data' },
        { icon: '📃', label: 'Terms & Conditions', sub: 'App usage terms' },
        { icon: '🛎️', label: 'Help & Support', sub: 'FAQs & contact us', permKey: 'help_support' },
        { icon: 'ℹ️', label: 'About Astrovell', sub: 'Version 1.0.0' },
      ],
    },
  ];

  const PROFILE_ROWS = ALL_PROFILE_ROWS
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.permKey || can(item.permKey))
    }))
    .filter(section => section.items.length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        {can('profile_edit') && (
          <TouchableOpacity style={styles.editHeaderBtn} onPress={onEditProfile}>
            <Text style={styles.editHeaderText}>✏️ Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarEmoji}>🔮</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Astro User'}</Text>
            {user?.email ? <Text style={styles.profileDetail}>📧 {user.email}</Text> : null}
            <Text style={styles.profileDetail}>📱 +91 {user?.contactNo || '––'}</Text>
            {user?.birthPlace ? <Text style={styles.profileDetail}>📍 {user.birthPlace}</Text> : null}
            {user?.gender ? <Text style={styles.profileDetail}>⚧ {user.gender}</Text> : null}
          </View>
          {user?.referral_token ? (
            <View style={styles.referralBadge}>
              <Text style={styles.referralLabel}>Referral</Text>
              <Text style={styles.referralCode}>{user.referral_token}</Text>
            </View>
          ) : null}
        </View>

        {/* Wallet Summary */}
        <View style={styles.walletRow}>
          {can('profile_wallet') && can('wallet') && (
            <View style={styles.walletCard}>
              <Text style={styles.walletIcon}>💰</Text>
              <Text style={styles.walletValue}>{curr}{parseFloat(user?.totalWalletAmount || walletBalance || 0).toFixed(0)}</Text>
              <Text style={styles.walletLabel}>Balance</Text>
            </View>
          )}
          <View style={styles.walletCard}>
            <Text style={styles.walletIcon}>🎯</Text>
            <Text style={styles.walletValue}>{user?.totalSession || 0}</Text>
            <Text style={styles.walletLabel}>Sessions</Text>
          </View>
          <View style={styles.walletCard}>
            <Text style={styles.walletIcon}>⭐</Text>
            <Text style={styles.walletValue}>{user?.rating ? parseFloat(user.rating).toFixed(1) : 'New'}</Text>
            <Text style={styles.walletLabel}>Rating</Text>
          </View>
        </View>

        {/* Recharge Button */}
        {can('profile_wallet') && can('wallet') && (
          <TouchableOpacity style={styles.rechargeBtn} activeOpacity={0.85} onPress={onWallet}>
            <Text style={styles.rechargeText}>+ Recharge Wallet</Text>
          </TouchableOpacity>
        )}

        {/* Menu Rows */}
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
                    <View style={[
                      styles.rowIconBg,
                      item.action === 'editProfile' && { backgroundColor: colors.goldGlow },
                      item.action === 'wallet' && { backgroundColor: 'rgba(34,197,94,0.15)' },
                    ]}>
                      <Text style={styles.rowIcon}>{item.icon}</Text>
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[
                        styles.rowLabel,
                        item.action === 'editProfile' && { color: colors.gold },
                        item.action === 'wallet' && { color: colors.success },
                      ]}>
                        {item.label}
                        {item.action === 'wallet' ? `  ${curr}${parseFloat(walletBalance || 0).toFixed(0)}` : ''}
                      </Text>
                      <Text style={styles.rowSub}>{item.sub}</Text>
                    </View>
                    <Text style={styles.rowArrow}>
                      {item.action === 'history' && activeSection === 'history' ? '⌄' : '›'}
                    </Text>
                  </TouchableOpacity>

                  {/* Inline Chat History Expansion */}
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

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>⎋  Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: 16,
    backgroundColor: colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  editHeaderBtn: { backgroundColor: colors.goldGlow, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.borderGold },
  editHeaderText: { color: colors.gold, fontSize: 13, fontWeight: '700' },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  profileCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatarRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.borderGold, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,200,66,0.08)' },
  avatarInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(124,58,237,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 26 },
  profileInfo: { flex: 1 },
  profileName: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  profileDetail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  referralBadge: { backgroundColor: colors.goldGlow, borderRadius: 10, borderWidth: 1, borderColor: colors.borderGold, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  referralLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  referralCode: { color: colors.gold, fontSize: 12, fontWeight: '800', marginTop: 2 },

  walletRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  walletCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  walletIcon: { fontSize: 20, marginBottom: 6 },
  walletValue: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  walletLabel: { color: colors.textMuted, fontSize: 10, marginTop: 3, textAlign: 'center' },

  rechargeBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 24, shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  rechargeText: { color: colors.primary, fontSize: 15, fontWeight: '800' },

  section: { marginBottom: 18 },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.18)', alignItems: 'center', justifyContent: 'center' },
  rowIcon: { fontSize: 18 },
  rowText: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  rowArrow: { color: colors.textMuted, fontSize: 20, fontWeight: '300' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  // Chat history expand
  historyExpand: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  histCard: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  histLeft: { flex: 1, marginRight: 8 },
  histName: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  histDate: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  histDuration: { color: colors.textSecondary, fontSize: 11 },
  histAmount: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },

  logoutBtn: { backgroundColor: 'rgba(255,76,106,0.12)', borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,76,106,0.3)', marginBottom: 8 },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: '700' },
});
