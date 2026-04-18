import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Dimensions,
  Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const { width } = Dimensions.get('window');

// ─── Menu Row Definitions ────────────────────────────────────────────────────
// action types:
//   tab         → navigate to a tab (goToTab)
//   wallet      → open wallet screen
//   kundali     → open kundali screen
//   matching    → open kundali matching screen
//   horoscope   → open horoscope screen
//   blogs       → open blogs list
//   profile     → open profile screen
//   profileEdit → open profile edit screen
//   dummy       → open ComingSoon with a title
//   url         → open external URL

const ALL_MENU_ROWS = [
  {
    label: 'Home',
    action: 'tab',
    tab: 'Home',
    permKey: 'tab_home',
    Icon: ({ c }) => <Ionicons name="home-outline" size={22} color={c} />,
  },
  {
    label: 'My Profile',
    action: 'profile',
    permKey: 'profile',
    Icon: ({ c }) => <Ionicons name="person-circle-outline" size={22} color={c} />,
  },
  {
    label: 'My Kundli',
    action: 'kundali',
    permKey: 'free_kundali',
    Icon: ({ c }) => <MaterialCommunityIcons name="shape-outline" size={22} color={c} />,
  },
  {
    label: 'Kundli Matching',
    action: 'matching',
    permKey: 'kundali_matching',
    Icon: ({ c }) => <MaterialCommunityIcons name="ring" size={22} color={c} />,
  },
  {
    label: 'Daily Horoscope',
    action: 'horoscope',
    permKey: 'horoscope',
    Icon: ({ c }) => <MaterialCommunityIcons name="white-balance-sunny" size={22} color={c} />,
  },
  {
    label: 'Chat with Astrologers',
    action: 'tab',
    tab: 'Chat',
    permKey: 'chat',
    Icon: ({ c }) => <MaterialCommunityIcons name="account-star-outline" size={22} color={c} />,
  },
  {
    label: 'Astrology Blog',
    action: 'blogs',
    permKey: 'blogs',
    Icon: ({ c }) => <MaterialCommunityIcons name="newspaper-variant-outline" size={22} color={c} />,
  },
  {
    label: 'Wallet Transactions',
    action: 'wallet',
    permKey: 'wallet',
    Icon: ({ c }) => <MaterialCommunityIcons name="wallet-outline" size={22} color={c} />,
  },
  {
    label: 'Book a Pooja',
    action: 'puja',
    badge: 'NEW',
    permKey: 'puja',
    Icon: ({ c }) => <MaterialCommunityIcons name="pot-steam-outline" size={22} color={c} />,
  },
  {
    label: 'AstroShop',
    action: 'astroShop',
    permKey: 'astromall',
    Icon: ({ c }) => <MaterialCommunityIcons name="shopping-outline" size={22} color={c} />,
  },
  {
    label: 'Order History',
    action: 'orderHistory',
    permKey: 'order_history',
    Icon: ({ c }) => <MaterialCommunityIcons name="history" size={22} color={c} />,
  },
  {
    label: 'My Following',
    action: 'following',
    permKey: 'my_following',
    Icon: ({ c }) => <Ionicons name="people-outline" size={22} color={c} />,
  },
  {
    label: 'Redeem Gift Card',
    action: 'dummy',
    dummyTitle: 'Redeem Gift Card',
    permKey: 'redeem_gift_card',
    Icon: ({ c }) => <MaterialCommunityIcons name="gift-outline" size={22} color={c} />,
  },
  {
    label: 'Refer & Earn',
    action: 'referEarn',
    permKey: 'refer_and_earn',
    Icon: ({ c }) => <MaterialCommunityIcons name="account-plus-outline" size={22} color={c} />,
  },
  {
    label: 'Free Services',
    action: 'astroServices',
    permKey: 'free_services',
    Icon: ({ c }) => <MaterialCommunityIcons name="tag-outline" size={22} color={c} />,
  },
  {
    label: 'Customer Support',
    action: 'dummy',
    dummyTitle: 'Customer Support Chat',
    permKey: 'help_support',
    Icon: ({ c }) => <Ionicons name="headset-outline" size={22} color={c} />,
  },
  {
    label: 'Vastu Tips',
    action: 'dummy',
    dummyTitle: 'Vastu Tips',
    permKey: 'vastu_tips',
    Icon: ({ c }) => <MaterialCommunityIcons name="home-city-outline" size={22} color={c} />,
  },
  {
    label: 'Gemstone Advisor',
    action: 'dummy',
    dummyTitle: 'Gemstone Advisor',
    permKey: 'gemstone_advisor',
    Icon: ({ c }) => <MaterialCommunityIcons name="diamond-stone" size={22} color={c} />,
  },
  {
    label: 'Settings',
    action: 'dummy',
    dummyTitle: 'Settings',
    permKey: 'settings',
    Icon: ({ c }) => <Ionicons name="settings-outline" size={22} color={c} />,
  },
  {
    label: 'Contact Us',
    action: 'contactUs',
    permKey: 'contact_us',
    Icon: ({ c }) => <Ionicons name="chatbubbles-outline" size={22} color={c} />,
  },
  {
    label: 'About AstroGuru',
    action: 'aboutUs',
    permKey: 'about_us',
    Icon: ({ c }) => <Ionicons name="information-circle-outline" size={22} color={c} />,
  },
  {
    label: 'Privacy Policy',
    action: 'privacyPolicy',
    permKey: 'privacy_policy',
    Icon: ({ c }) => <Ionicons name="shield-checkmark-outline" size={22} color={c} />,
  },
  {
    label: 'Terms & Conditions',
    action: 'termsAndConditions',
    permKey: 'terms_and_conditions',
    Icon: ({ c }) => <Ionicons name="document-text-outline" size={22} color={c} />,
  },
];

const SOCIAL_LINKS = [
  { name: 'apple',     url: 'https://apple.com',     Icon: (c) => <Ionicons name="logo-apple" size={18} color={c} /> },
  { name: 'globe',     url: 'https://astrotalk.com', Icon: (c) => <MaterialCommunityIcons name="earth" size={18} color={c} /> },
  { name: 'youtube',   url: 'https://youtube.com',   Icon: (c) => <AntDesign name="youtube" size={18} color={c} /> },
  { name: 'facebook',  url: 'https://facebook.com',  Icon: (c) => <FontAwesome name="facebook" size={18} color={c} /> },
  { name: 'instagram', url: 'https://instagram.com', Icon: (c) => <AntDesign name="instagram" size={18} color={c} /> },
  { name: 'linkedin',  url: 'https://linkedin.com',  Icon: (c) => <FontAwesome name="linkedin" size={18} color={c} /> },
];
const SOCIAL_COLORS = ['#000', '#4CAF50', '#FF0000', '#1877F2', '#E1306C', '#0A66C2'];

// ─── Main Component ──────────────────────────────────────────────────────────
const MenuScreen = ({
  onClose,
  onTabPress,
  onHoroscopePress,
  onKundaliPress,
  onMatchingPress,
  onWalletPress,                  // open recharge tab
  onWalletTransactionsPress,      // open history/transactions tab
  onBlogsPress,
  onProfilePress,
  onProfileEditPress,
  onOrderHistoryPress,
  onFollowingPress,
  onPujaPress,
  onReferEarnPress,
  onAstroServicesPress,
  onAstroShopPress,
  onContactUsPress,
  onAboutUsPress,
  onPrivacyPress,
  onTermsPress,
  onDummyPress,
}) => {
  const { user } = useSelector((s) => s.auth);
  const { can } = usePermissions();

  const MENU_ROWS = ALL_MENU_ROWS.filter(
    (item) => can(item.permKey)
  );

  const handlePress = (item) => {
    switch (item.action) {
      case 'tab':          if (onTabPress)           onTabPress(item.tab); break;
      // "Wallet Transactions" menu item → always open history tab
      case 'wallet':       if (onWalletTransactionsPress) onWalletTransactionsPress();
                           else if (onWalletPress)        onWalletPress();
                           break;
      case 'horoscope':    if (onHoroscopePress)     onHoroscopePress(); break;
      case 'kundali':      if (onKundaliPress)       onKundaliPress(); break;
      case 'matching':     if (onMatchingPress)      onMatchingPress(); break;
      case 'blogs':        if (onBlogsPress)         onBlogsPress(); break;
      case 'profile':      if (onProfilePress)       onProfilePress(); break;
      case 'profileEdit':  if (onProfileEditPress)   onProfileEditPress(); break;
      case 'orderHistory': if (onOrderHistoryPress)  onOrderHistoryPress(); break;
      case 'following':    if (onFollowingPress)     onFollowingPress(); break;
      case 'puja':         if (onPujaPress)          onPujaPress(); break;
      case 'referEarn':    if (onReferEarnPress)     onReferEarnPress(); break;
      case 'astroServices':if (onAstroServicesPress) onAstroServicesPress(); break;
      case 'astroShop':   if (onAstroShopPress)     onAstroShopPress(); break;
      case 'contactUs':    if (onContactUsPress)     onContactUsPress(); break;
      case 'aboutUs':      if (onAboutUsPress)       onAboutUsPress(); break;
      case 'privacyPolicy': if (onPrivacyPress)       onPrivacyPress(); break;
      case 'termsAndConditions': if (onTermsPress)     onTermsPress(); break;
      case 'dummy':        if (onDummyPress)         onDummyPress(item.dummyTitle || item.label); break;
      default: if (onClose) onClose();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── Profile Header ── */}
        <View style={styles.profileSection}>
          <View style={styles.profileLeft}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="zodiac-gemini" size={28} color="#1A1A1A" />
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user?.name || 'User'}</Text>
                {can('profile_edit') && (
                  <TouchableOpacity
                    style={styles.editNameBtn}
                    onPress={() => {
                      if (onProfileEditPress) onProfileEditPress();
                      if (onClose) onClose();
                    }}
                  >
                    <Feather name="edit-2" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.userPhone}>
                {user?.contactNo ? `+91-${user.contactNo}` : '––––––––––'}
              </Text>
            </View>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Menu Items ── */}
        <View style={styles.menuList}>
          {MENU_ROWS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuRow}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconWrap}>
                {item.Icon && <item.Icon c={colors.textSecondary} />}
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.badge ? (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{item.badge}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Also Available On ── */}
        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>Also available on</Text>
          <View style={styles.socialRow}>
            {SOCIAL_LINKS.map((s, i) => (
              <TouchableOpacity
                key={s.name}
                style={[styles.socialBtn, { backgroundColor: SOCIAL_COLORS[i] }]}
                onPress={() => Linking.openURL(s.url)}
                activeOpacity={0.8}
              >
                {s.Icon('#FFF')}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Version ── */}
        <View style={styles.versionRow}>
          <Text style={styles.versionText}>Version 1.1.474</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

export default MenuScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // Profile section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  userName: { fontSize: 17, fontWeight: '800', color: colors.text },
  editNameBtn: { padding: 2 },
  userPhone: { fontSize: 13, color: colors.textMuted },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
  },

  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 0,
  },

  // Menu rows
  menuList: { paddingVertical: 8 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
  },
  menuIconWrap: { width: 24, alignItems: 'center' },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  newBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  // Social
  socialSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  socialTitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Version
  versionRow: { alignItems: 'center', paddingBottom: 8 },
  versionText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
});
