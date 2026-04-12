import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import HomeScreen            from '../screens/HomeScreen';
import ChatScreen            from '../screens/ChatScreen';
import MenuScreen            from '../screens/MenuScreen';
import ProfileScreen         from '../screens/ProfileScreen';
import ProfileUpdateScreen   from '../screens/ProfileUpdateScreen';
import BlogDetailScreen      from '../screens/BlogDetailScreen';
import ChatRoomScreen        from '../screens/ChatRoomScreen';
import PanchangScreen        from '../screens/PanchangScreen';
import HoroscopeScreen       from '../screens/HoroscopeScreen';
import KundaliScreen         from '../screens/KundaliScreen';
import KundaliMatchingScreen from '../screens/KundaliMatchingScreen';
import WalletScreen          from '../screens/WalletScreen';
import BottomTabBar          from '../components/BottomTabBar';
import { colors }            from '../theme/colors';
import usePermissions        from '../hooks/usePermissions';

const MainTabNavigator = () => {
  const [activeTab,      setActiveTab]      = useState('Home');
  const [editingProfile, setEditingProfile] = useState(false);
  const [activeBlog,     setActiveBlog]     = useState(null);   // blog object or null
  const [activeChatId,   setActiveChatId]   = useState(null);   // chatId string or null
  const [activeHoroSign, setActiveHoroSign] = useState(null);   // sign object or 'default'
  const [showKundali,    setShowKundali]    = useState(false);
  const [showMatching,   setShowMatching]   = useState(false);
  const [showWallet,     setShowWallet]     = useState(false);   // wallet overlay
  const { can } = usePermissions();

  // ── Wallet overlay ────────────────────────────────────────────────────────
  if (showWallet) {
    return <WalletScreen onBack={() => setShowWallet(false)} />;
  }

  // ── Blog detail overlay ───────────────────────────────────────────────────
  if (activeBlog) {
    return <BlogDetailScreen blog={activeBlog} onBack={() => setActiveBlog(null)} />;
  }

  // ── Horoscope overlay ─────────────────────────────────────────────────────
  if (activeHoroSign) {
    return (
      <HoroscopeScreen
        initialSign={activeHoroSign === 'default' ? null : activeHoroSign}
        onBack={() => setActiveHoroSign(null)}
      />
    );
  }

  // ── Kundali overlays ──────────────────────────────────────────────────────
  if (showKundali) {
    return <KundaliScreen onBack={() => setShowKundali(false)} />;
  }
  if (showMatching) {
    return <KundaliMatchingScreen onBack={() => setShowMatching(false)} />;
  }

  // ── Chat room overlay ─────────────────────────────────────────────────────
  if (activeChatId) {
    return (
      <ChatRoomScreen
        chatId={activeChatId}
        onBack={() => setActiveChatId(null)}
      />
    );
  }

  // ── Edit profile overlay ──────────────────────────────────────────────────
  if (editingProfile && can('profile_edit')) {
    return <ProfileUpdateScreen onBack={() => setEditingProfile(false)} />;
  }

  // ── Shared navigation helpers ─────────────────────────────────────────────
  const goToTab  = (tab)  => {
    // Optionally we can even gate the tabs here, though they are hidden from UI already
    setActiveTab(tab);
  };
  const openBlog = (blog) => {
    if(can('blogs')) setActiveBlog(blog);
  };

  // ── Render active tab screen ──────────────────────────────────────────────
  const renderScreen = () => {
    switch (activeTab) {
      case 'Chat':
        return can('tab_chat') && can('chat') ? (
          <ChatScreen
            onStartChat={(id) => setActiveChatId(id)}
          />
        ) : <HomeScreen onChatPress={() => goToTab('Chat')} onBlogPress={openBlog} onBlogSeeAll={() => goToTab('Menu')} onPujaPress={() => goToTab('Menu')} onPanchangPress={() => goToTab('Panchang')} onHoroscopePress={(sign) => setActiveHoroSign(sign)} onWalletPress={() => setShowWallet(true)} />;
      case 'Menu':
        return can('tab_menu') ? (
          <MenuScreen
            onBlogPress={openBlog}
            onTabPress={goToTab}
            onHoroscopePress={() => { if(can('horoscope')) setActiveHoroSign('default'); }}
            onKundaliPress={() => { if(can('free_kundali')) setShowKundali(true); }}
            onMatchingPress={() => { if(can('kundali_matching')) setShowMatching(true); }}
            onWalletPress={() => { if(can('wallet')) setShowWallet(true); }}
          />
        ) : <HomeScreen onChatPress={() => goToTab('Chat')} onBlogPress={openBlog} onBlogSeeAll={() => goToTab('Menu')} onPujaPress={() => goToTab('Menu')} onPanchangPress={() => goToTab('Panchang')} onHoroscopePress={(sign) => setActiveHoroSign(sign)} onWalletPress={() => setShowWallet(true)} />;
      case 'Profile':
        return can('tab_profile') && can('profile') ? (
          <ProfileScreen
            onEditProfile={() => setEditingProfile(true)}
            onWallet={() => { if(can('profile_wallet') && can('wallet')) setShowWallet(true); }}
            onOpenChat={(id) => setActiveChatId(id)}
          />
        ) : <HomeScreen onChatPress={() => goToTab('Chat')} onBlogPress={openBlog} onBlogSeeAll={() => goToTab('Menu')} onPujaPress={() => goToTab('Menu')} onPanchangPress={() => goToTab('Panchang')} onHoroscopePress={(sign) => setActiveHoroSign(sign)} onWalletPress={() => setShowWallet(true)} />;
      case 'Panchang':
        return can('tab_panchang') && can('panchang') ? <PanchangScreen /> : <HomeScreen onChatPress={() => goToTab('Chat')} onBlogPress={openBlog} onBlogSeeAll={() => goToTab('Menu')} onPujaPress={() => goToTab('Menu')} onPanchangPress={() => goToTab('Panchang')} onHoroscopePress={(sign) => setActiveHoroSign(sign)} onWalletPress={() => setShowWallet(true)} />;
      default:
        return can('tab_home') ? (
          <HomeScreen
            onChatPress={() => goToTab('Chat')}
            onBlogPress={openBlog}
            onBlogSeeAll={() => goToTab('Menu')}
            onPujaPress={() => goToTab('Menu')}
            onPanchangPress={() => goToTab('Panchang')}
            onHoroscopePress={(sign) => { if(can('horoscope')) setActiveHoroSign(sign); }}
            onWalletPress={() => { if(can('wallet')) setShowWallet(true); }}
          />
        ) : <View style={styles.screenArea} />; // If no home, empty view
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>{renderScreen()}</View>
      <BottomTabBar activeTab={activeTab} onTabPress={goToTab} />
    </View>
  );
};

export default MainTabNavigator;

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.primary },
  screenArea: { flex: 1 },
});
