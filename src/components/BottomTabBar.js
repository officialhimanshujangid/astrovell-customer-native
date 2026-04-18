import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

// ─── Tab definitions (only Home, Chat, Call) ──────────────────────────────────
const NAV_TABS = [
  {
    key: 'Home',
    label: 'Home',
    permKey: 'tab_home',
    icon: 'home-outline',
    iconActive: 'home',
  },
  {
    key: 'Chat',
    label: 'Chat',
    permKey: 'tab_chat',
    icon: 'chatbubble-outline',
    iconActive: 'chatbubble',
  },
  {
    key: 'Call',
    label: 'Call',
    permKey: 'tab_call',
    icon: 'call-outline',
    iconActive: 'call',
  },
];

// ─── Single Tab Item ─────────────────────────────────────────────────────────
const TabItem = ({ tab, isActive, onPress }) => {
  const iconColor = isActive ? colors.gold : colors.tabInactive;
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={isActive ? tab.iconActive : tab.icon}
        size={22}
        color={iconColor}
      />
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
        {tab.label}
      </Text>
      {isActive && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const BottomTabBar = ({ activeTab, onTabPress, onMenuPress }) => {
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();

  const visibleTabs = NAV_TABS.filter((t) => can(t.permKey));

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
      ]}
    >
      <View style={styles.container}>
        {/* ── Navigation Tabs ── */}
        {visibleTabs.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => onTabPress(tab.key)}
          />
        ))}

        {/* ── Hamburger Sidebar Trigger ── */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={26} color={colors.tabInactive} />
          <Text style={styles.tabLabel}>Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BottomTabBar;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.tabBg || colors.primary,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 10,
  },
  container: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    minHeight: 50,
    gap: 3,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.tabInactive,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: colors.gold,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
});
