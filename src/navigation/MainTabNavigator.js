import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  BackHandler,
} from 'react-native';

import HomeScreen               from '../screens/HomeScreen';
import ChatScreen               from '../screens/ChatScreen';
import CallScreen               from '../screens/CallScreen';
import MenuScreen               from '../screens/MenuScreen';
import ProfileScreen            from '../screens/ProfileScreen';
import ProfileUpdateScreen      from '../screens/ProfileUpdateScreen';
import BlogDetailScreen         from '../screens/BlogDetailScreen';
import BlogsListScreen          from '../screens/BlogsListScreen';
import ChatRoomScreen           from '../screens/ChatRoomScreen';
import ChatHistoryScreen        from '../screens/ChatHistoryScreen';
import CallHistoryScreen        from '../screens/CallHistoryScreen';
import PanchangScreen           from '../screens/PanchangScreen';
import HoroscopeScreen          from '../screens/HoroscopeScreen';
import KundaliScreen            from '../screens/KundaliScreen';
import KundaliMatchingScreen    from '../screens/KundaliMatchingScreen';
import WalletScreen             from '../screens/WalletScreen';
import ComingSoonScreen         from '../screens/ComingSoonScreen';
import AstrologerDetailScreen   from '../screens/AstrologerDetailScreen';
import OrderHistoryScreen       from '../screens/OrderHistoryScreen';
import FollowingScreen          from '../screens/FollowingScreen';
import PujaListScreen           from '../screens/PujaListScreen';
import ReferEarnScreen          from '../screens/ReferEarnScreen';
import AstroServicesScreen      from '../screens/AstroServicesScreen';
import AstroShopScreen          from '../screens/AstroShopScreen';
import ContactUsScreen          from '../screens/ContactUsScreen';
import StaticPageScreen         from '../screens/StaticPageScreen';
import CallRoomScreen           from '../screens/CallRoomScreen';
import BottomTabBar             from '../components/BottomTabBar';
import { colors }               from '../theme/colors';
import usePermissions           from '../hooks/usePermissions';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.82;

const MainTabNavigator = () => {
  // ── Tab & overlay state ──────────────────────────────────────────────────
  const [activeTab,          setActiveTab]          = useState('Home');
  const [editingProfile,     setEditingProfile]     = useState(false);
  const [activeBlog,         setActiveBlog]         = useState(null);
  const [showBlogsList,      setShowBlogsList]      = useState(false);
  const [activeChatId,       setActiveChatId]       = useState(null);
  const [activeCallId,       setActiveCallId]       = useState(null);
  const [showChatHistory,    setShowChatHistory]    = useState(false);
  const [showCallHistory,    setShowCallHistory]    = useState(false);
  const [activeHoroSign,     setActiveHoroSign]     = useState(null);
  const [showKundali,        setShowKundali]        = useState(false);
  const [showMatching,       setShowMatching]       = useState(false);
  const [showWallet,         setShowWallet]         = useState(false);
  const [walletInitialTab,   setWalletInitialTab]   = useState('recharge');
  const [showProfile,        setShowProfile]        = useState(false);
  const [showOrderHistory,   setShowOrderHistory]   = useState(false);
  const [showFollowing,      setShowFollowing]      = useState(false);
  const [showPujaList,       setShowPujaList]       = useState(false);
  const [showReferEarn,      setShowReferEarn]      = useState(false);
  const [showAstroServices,  setShowAstroServices]  = useState(false);
  const [showAstroShop,      setShowAstroShop]      = useState(false);
  const [activeAstrologer,   setActiveAstrologer]   = useState(null); // AstrologerDetailScreen
  const [drawerOpen,         setDrawerOpen]         = useState(false);
  const [showContactUs,      setShowContactUs]      = useState(false);
  const [activeStaticPage,   setActiveStaticPage]   = useState(null); // { slug, title }
  const [dummyScreenTitle,   setDummyScreenTitle]   = useState(null);
  const [chatInitialSearch,  setChatInitialSearch]  = useState('');

  const drawerAnim   = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const { can } = usePermissions();

  // ── Global route handler for Push Notifications ────────────────────────────
  React.useEffect(() => {
    global.openChat = (id) => setActiveChatId(id);
    return () => delete global.openChat;
  }, []);

  // ── Hardware back button ─────────────────────────────────────────────────
  React.useEffect(() => {
    const handleBackPress = () => {
      if (drawerOpen)           { closeDrawer(); return true; }
      if (activeBlog)           { setActiveBlog(null); return true; }
      if (showChatHistory)      { setShowChatHistory(false); return true; }
      if (showCallHistory)      { setShowCallHistory(false); return true; }
      if (activeChatId)         { setActiveChatId(null); return true; }
      if (activeCallId)         { setActiveCallId(null); return true; }
      if (showBlogsList)        { setShowBlogsList(false); return true; }
      if (activeHoroSign)       { setActiveHoroSign(null); return true; }
      if (showKundali)          { setShowKundali(false); return true; }
      if (showMatching)         { setShowMatching(false); return true; }
      if (showWallet)           { setShowWallet(false); return true; }
      if (showProfile)          { setShowProfile(false); return true; }
      if (editingProfile)       { setEditingProfile(false); return true; }
      if (dummyScreenTitle)     { setDummyScreenTitle(null); return true; }
      if (showOrderHistory)     { setShowOrderHistory(false); return true; }
      if (showFollowing)        { setShowFollowing(false); return true; }
      if (showPujaList)         { setShowPujaList(false); return true; }
      if (showReferEarn)        { setShowReferEarn(false); return true; }
      if (showAstroServices)    { setShowAstroServices(false); return true; }
      if (showAstroShop)         { setShowAstroShop(false); return true; }
      if (showContactUs)        { setShowContactUs(false); return true; }
      if (activeStaticPage)     { setActiveStaticPage(null); return true; }
      if (activeAstrologer)     { setActiveAstrologer(null); return true; }
      if (activeTab !== 'Home') { setActiveTab('Home'); return true; }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [
    drawerOpen, activeBlog, showChatHistory, showCallHistory, activeChatId, activeCallId, showBlogsList,
    activeHoroSign, showKundali, showMatching, showWallet, showProfile,
    editingProfile, activeTab, dummyScreenTitle, showContactUs, activeStaticPage,
    showOrderHistory, showFollowing, showPujaList, showReferEarn, showAstroServices, showAstroShop, activeAstrologer,
  ]);

  // ── Drawer helpers ───────────────────────────────────────────────────────
  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 160,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animated close — used only for backdrop tap and the × button
  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(drawerAnim, {
        toValue: -DRAWER_WIDTH,
        useNativeDriver: true,
        damping: 20,
        stiffness: 160,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  };

  // Instant close — used by sidebar navigation so the drawer is FULLY
  // closed before the overlay screen mounts (avoids mis-placed drawer on back).
  const closeDrawerNow = () => {
    drawerAnim.stopAnimation();
    backdropAnim.stopAnimation();
    drawerAnim.setValue(-DRAWER_WIDTH);
    backdropAnim.setValue(0);
    setDrawerOpen(false);
  };

  // ── Navigation helpers ───────────────────────────────────────────────────
  const goToTab = (tab) => setActiveTab(tab);

  // Open a single blog post
  const openBlog = (blog) => {
    if (can('blogs')) setActiveBlog(blog);
  };

  // Open blog list (from home "Blog" quick-service or sidebar)
  const openBlogsList = () => {
    if (can('blogs')) setShowBlogsList(true);
  };

  // Called when user taps an astrologer from the home search bar
  const openChatWithSearch = (astro) => {
    if (can('chat')) {
      setChatInitialSearch(astro?.name || '');
      setActiveTab('Chat');
    }
  };

  // Open wallet on a specific tab ('recharge' or 'history')
  const openWallet = (tab = 'recharge') => {
    if (can('wallet')) { setWalletInitialTab(tab); setShowWallet(true); }
  };

  // ── Props forwarded to HomeScreen ────────────────────────────────────────
  const homeProps = {
    onChatPress:          () => { if (can('chat')) goToTab('Chat'); },
    onCallPress:          () => { if (can('call')) goToTab('Call'); },
    onBlogPress:          openBlog,
    onBlogListPress:      openBlogsList,
    onBlogSeeAll:         openBlogsList,
    onKundaliPress:       () => { if (can('free_kundali')) setShowKundali(true); },
    onMatchingPress:      () => { if (can('kundali_matching')) setShowMatching(true); },
    onPujaPress:          () => { if (can('puja')) setShowPujaList(true); },
    onPanchangPress:      () => setDummyScreenTitle('Panchang'),
    onHoroscopePress:     (sign) => { if (can('horoscope')) setActiveHoroSign(sign || 'default'); },
    onWalletPress:        () => openWallet('recharge'),
    onMenuPress:          openDrawer,
    onProfilePress:       () => { if (can('profile')) setShowProfile(true); },
    onAstrologerSearch:   openChatWithSearch,            // home search → chat tab
    onAstrologerPress:    (astro) => setActiveAstrologer(astro), // card tap → detail screen
  };

  // ── Props forwarded to ChatScreen ────────────────────────────────────────
  const chatProps = {
    onStartChat:        (id) => setActiveChatId(id),
    onMenuPress:        openDrawer,
    onChatHistoryPress: () => { if (can('chat_history')) setShowChatHistory(true); },
    onCallHistoryPress: () => { if (can('call')) setShowCallHistory(true); },
    onAstrologerPress:  (astro) => setActiveAstrologer(astro),
    onProfilePress:     () => { if (can('profile')) setShowProfile(true); },
    onWalletPress:      () => openWallet('recharge'),
    initialSearch:      chatInitialSearch,
    onSearchConsumed:   () => setChatInitialSearch(''),
  };

  const callProps = {
    onCallPress: async (astro) => {
      if (!astro) return;
      try {
        const { callApi } = await import('../api/services');
        const res = await callApi.addRequest({ astrologerId: astro.id, callType: 'Audio' });
        const callId = res.data?.recordList?.id || res.data?.data?.id || res.data?.id;
        if (callId) {
          setActiveCallId(callId);
        } else {
          const Toast = (await import('react-native-toast-message')).default;
          Toast.show({ type: 'error', text1: 'Failed to start call', text2: res.data?.message || 'Please try again.' });
        }
      } catch (e) {
        const Toast = (await import('react-native-toast-message')).default;
        Toast.show({ type: 'error', text1: 'Call Error', text2: e.response?.data?.message || 'Unable to start call.' });
      }
    },
    onMenuPress:        openDrawer,
    onCallHistoryPress: () => { if (can('call')) setShowCallHistory(true); },
    onAstrologerPress:  (astro) => setActiveAstrologer(astro),
    onProfilePress:     () => { if (can('profile')) setShowProfile(true); },
    onWalletPress:      () => openWallet('recharge'),
    initialSearch:      chatInitialSearch,
    onSearchConsumed:   () => setChatInitialSearch(''),
  };

  // ── Full-screen overlay stack ─────────────────────────────────────────────

  if (dummyScreenTitle) {
    return <ComingSoonScreen title={dummyScreenTitle} onBack={() => setDummyScreenTitle(null)} />;
  }
  if (editingProfile && can('profile_edit')) {
    return <ProfileUpdateScreen onBack={() => setEditingProfile(false)} />;
  }
  if (showProfile && can('profile')) {
    return (
      <ProfileScreen
        onEditProfile={() => { setShowProfile(false); setEditingProfile(true); }}
        onWallet={() => { setShowProfile(false); openWallet('recharge'); }}
        onOpenChat={(id) => { setShowProfile(false); setActiveChatId(id); }}
        onChatHistory={() => { setShowProfile(false); setShowChatHistory(true); }}
        onReferEarn={() => { setShowProfile(false); setShowReferEarn(true); }}
        onHelpSupport={() => { setShowProfile(false); setActiveStaticPage({ slug: 'help-support', title: 'Help & Support' }); }}
        onAbout={() => { setShowProfile(false); setActiveStaticPage({ slug: 'about-us', title: 'About Us' }); }}
        onTerms={() => { setShowProfile(false); setActiveStaticPage({ slug: 'terms-condition', title: 'Terms & Conditions' }); }}
        onPrivacy={() => { setShowProfile(false); setActiveStaticPage({ slug: 'privacy-policy', title: 'Privacy Policy' }); }}
        onBack={() => setShowProfile(false)}
      />
    );
  }
  if (showWallet && can('wallet')) {
    return <WalletScreen onBack={() => setShowWallet(false)} initialTab={walletInitialTab} />;
  }
  if (showKundali && can('free_kundali')) {
    return <KundaliScreen onBack={() => setShowKundali(false)} />;
  }
  if (showMatching && can('kundali_matching')) {
    return <KundaliMatchingScreen onBack={() => setShowMatching(false)} />;
  }
  if (activeHoroSign && can('horoscope')) {
    return (
      <HoroscopeScreen
        initialSign={activeHoroSign === 'default' ? null : activeHoroSign}
        onBack={() => setActiveHoroSign(null)}
      />
    );
  }
  if (activeCallId) {
    return <CallRoomScreen callId={activeCallId} onBack={() => setActiveCallId(null)} />;
  }
  if (activeChatId) {
    return <ChatRoomScreen chatId={activeChatId} onBack={() => setActiveChatId(null)} />;
  }
  if (showChatHistory && can('chat_history')) {
    return (
      <ChatHistoryScreen
        onBack={() => setShowChatHistory(false)}
        onOpenChat={(id) => { setShowChatHistory(false); setActiveChatId(id); }}
        onAstrologerPress={(astro) => { setShowChatHistory(false); setActiveAstrologer(astro); }}
      />
    );
  }
  if (showCallHistory && can('call')) {
    return (
      <CallHistoryScreen 
        onBack={() => setShowCallHistory(false)} 
        onAstrologerPress={(astro) => { setShowCallHistory(false); setActiveAstrologer(astro); }}
      />
    );
  }
  if (activeBlog && can('blogs')) {
    return <BlogDetailScreen blog={activeBlog} onBack={() => setActiveBlog(null)} />;
  }
  if (showBlogsList && can('blogs')) {
    return (
      <BlogsListScreen
        onBack={() => setShowBlogsList(false)}
        onBlogPress={(blog) => { setShowBlogsList(false); setActiveBlog(blog); }}
      />
    );
  }
  if (showOrderHistory && can('order_history')) {
    return <OrderHistoryScreen onBack={() => setShowOrderHistory(false)} />;
  }
  if (showFollowing && can('my_following')) {
    return (
      <FollowingScreen
        onBack={() => setShowFollowing(false)}
        onAstrologerPress={(astro) => { setShowFollowing(false); setActiveAstrologer(astro); }}
      />
    );
  }
  if (showPujaList && can('puja')) {
    return <PujaListScreen onBack={() => setShowPujaList(false)} />;
  }
  if (showReferEarn && can('refer_and_earn')) {
    return <ReferEarnScreen onBack={() => setShowReferEarn(false)} />;
  }
  if (showAstroServices) {
    return <AstroServicesScreen onBack={() => setShowAstroServices(false)} />;
  }
  if (showAstroShop && can('astromall')) {
    return <AstroShopScreen onBack={() => setShowAstroShop(false)} />;
  }
  if (showContactUs) {
    return <ContactUsScreen onBack={() => setShowContactUs(false)} />;
  }
  if (activeStaticPage) {
    return (
      <StaticPageScreen 
        slug={activeStaticPage.slug} 
        title={activeStaticPage.title} 
        onBack={() => setActiveStaticPage(null)} 
      />
    );
  }
  if (activeAstrologer) {
    return (
      <AstrologerDetailScreen
        astrologer={activeAstrologer}
        onBack={() => setActiveAstrologer(null)}
        onStartChat={(chatId) => { setActiveAstrologer(null); if (chatId) setActiveChatId(chatId); }}
        onStartCall={(callId) => { setActiveAstrologer(null); if (callId) setActiveCallId(callId); }}
      />
    );
  }



  // ── Render the active tab screen ─────────────────────────────────────────
  const renderScreen = () => {
    switch (activeTab) {
      case 'Chat':
        return can('tab_chat') && can('chat') ? (
          <ChatScreen {...chatProps} />
        ) : (
          <HomeScreen {...homeProps} />
        );

      case 'Call':
        return can('tab_call') ? (
          <CallScreen {...callProps} />
        ) : (
          <HomeScreen {...homeProps} />
        );

      default: // 'Home'
        return can('tab_home') ? (
          <HomeScreen {...homeProps} />
        ) : (
          <View style={styles.screenArea} />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Main content area ── */}
      <View style={styles.screenArea}>{renderScreen()}</View>

      {/* ── Bottom Tab Bar ── */}
      <BottomTabBar
        activeTab={activeTab}
        onTabPress={goToTab}
        onMenuPress={openDrawer}
      />

      {/* ── Drawer Backdrop ── */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* ── Side Drawer (AstroTalk-style sidebar) ── */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}
      >
        <MenuScreen
          onClose={closeDrawer}
          onTabPress={(tab) => { closeDrawerNow(); goToTab(tab); }}
          onHoroscopePress={() => { if (can('horoscope')) { closeDrawerNow(); setActiveHoroSign('default'); } }}
          onKundaliPress={() => { if (can('free_kundali')) { closeDrawerNow(); setShowKundali(true); } }}
          onMatchingPress={() => { if (can('kundali_matching')) { closeDrawerNow(); setShowMatching(true); } }}
          onWalletPress={() => { closeDrawerNow(); openWallet('recharge'); }}
          onWalletTransactionsPress={() => { closeDrawerNow(); openWallet('history'); }}
          onBlogsPress={() => { closeDrawerNow(); openBlogsList(); }}
          onProfilePress={() => { if (can('profile')) { closeDrawerNow(); setShowProfile(true); } }}
          onProfileEditPress={() => { if (can('profile_edit')) { closeDrawerNow(); setEditingProfile(true); } }}
          onOrderHistoryPress={() => { closeDrawerNow(); setShowOrderHistory(true); }}
          onFollowingPress={() => { closeDrawerNow(); setShowFollowing(true); }}
          onPujaPress={() => { closeDrawerNow(); setShowPujaList(true); }}
          onReferEarnPress={() => { closeDrawerNow(); setShowReferEarn(true); }}
          onAstroServicesPress={() => { closeDrawerNow(); setShowAstroServices(true); }}
          onAstroShopPress={() => { closeDrawerNow(); setShowAstroShop(true); }}
          onContactUsPress={() => { if (can('contact_us')) { closeDrawerNow(); setShowContactUs(true); } }}
          onAboutUsPress={() => { if (can('about_us')) { closeDrawerNow(); setActiveStaticPage({ slug: 'about-us', title: 'About Us' }); } }}
          onPrivacyPress={() => { if (can('privacy_policy')) { closeDrawerNow(); setActiveStaticPage({ slug: 'privacy-policy', title: 'Privacy Policy' }); } }}
          onTermsPress={() => { if (can('terms_and_conditions')) { closeDrawerNow(); setActiveStaticPage({ slug: 'terms-condition', title: 'Terms & Conditions' }); } }}
          onHelpSupportPress={() => { closeDrawerNow(); setActiveStaticPage({ slug: 'help-support', title: 'Help & Support' }); }}
          onDummyPress={(title) => {
            closeDrawerNow(); setDummyScreenTitle(title);
          }}
        />
      </Animated.View>
    </View>
  );
};

export default MainTabNavigator;

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.primary },
  screenArea: { flex: 1 },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },

  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.primary,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
});
