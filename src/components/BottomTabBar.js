import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const ALL_TABS = [
  { key: 'Home',     icon: '🏠', label: 'Home',    permKey: 'tab_home'     },
  { key: 'Chat',     icon: '💬', label: 'Chat',    permKey: 'tab_chat'     },
  { key: 'Menu',     icon: '☰',  label: 'Explore', permKey: 'tab_menu'     },
  { key: 'Panchang', icon: '📅', label: 'Panchang',permKey: 'tab_panchang' },
  { key: 'Profile',  icon: '👤', label: 'Profile', permKey: 'tab_profile'  },
];

const TabItem = ({ tab, isActive, onPress }) => {
  const scaleAnim   = useRef(new Animated.Value(isActive ? 1.15 : 1)).current;
  const translateY  = useRef(new Animated.Value(isActive ? -18 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: isActive ? 1.15 : 1,  useNativeDriver: true, tension: 150, friction: 8 }),
      Animated.spring(translateY,  { toValue: isActive ? -18 : 0,   useNativeDriver: true, tension: 150, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: isActive ? 1 : 0.6,   useNativeDriver: true, duration: 200 }),
    ]).start();
  }, [isActive]);

  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.iconContainer, { transform: [{ translateY }] }]}>
        {isActive && <View style={styles.activeGlow} />}
        <Animated.View style={[
          styles.iconPill,
          isActive && styles.iconPillActive,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
        ]}>
          <Text style={styles.icon}>{tab.icon}</Text>
        </Animated.View>
      </Animated.View>

      <Animated.Text style={[
        styles.tabLabel,
        {
          opacity: opacityAnim,
          color: isActive ? colors.gold : colors.textSecondary,
          transform: [{ translateY: isActive ? -6 : 0 }]
        }
      ]}>
        {tab.label}
      </Animated.Text>

      {isActive && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
};

const BottomTabBar = ({ activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();

  // Filter tabs based on permissions AND global feature flags
  const TABS = ALL_TABS.filter(t => {
    if (!can(t.permKey)) return false;
    // Also gate by global feature flags
    if (t.key === 'Chat'     && !can('chat'))     return false;
    if (t.key === 'Panchang' && !can('panchang')) return false;
    return true;
  });

  return (
    <View style={[
      styles.wrapper,
      { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }
    ]}>
      <View style={styles.container}>
        {TABS.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => onTabPress(tab.key)}
          />
        ))}
      </View>
    </View>
  );
};

export default BottomTabBar;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.secondary,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
  },
  container: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 48,
    marginBottom: 4,
  },
  iconPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  iconPillActive: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
  },
  activeGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.goldGlow,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
