import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

import MobileNumberScreen  from '../screens/MobileNumberScreen';
import OtpScreen           from '../screens/OtpScreen';
import ProfileUpdateScreen from '../screens/ProfileUpdateScreen';
import MainTabNavigator    from './MainTabNavigator';
import { colors }          from '../theme/colors';

const Stack = createNativeStackNavigator();

// ── Profile-check loading screen ─────────────────────────────────────────────
const CheckingProfileScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingEmoji}>🔮</Text>
    <ActivityIndicator size="large" color={colors.gold} style={{ marginBottom: 16 }} />
    <Text style={styles.loadingTitle}>Setting up your cosmic journey</Text>
    <Text style={styles.loadingSub}>Fetching your profile details…</Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingEmoji:  { fontSize: 52, marginBottom: 16 },
  loadingTitle:  { color: colors.text, fontSize: 17, fontWeight: '700' },
  loadingSub:    { color: colors.textMuted, fontSize: 13 },
});

// ── Navigator ─────────────────────────────────────────────────────────────────
const AppNavigator = () => {
  const { isLoggedIn, profileComplete, profileCheckLoading } = useSelector((state) => state.auth);
  console.log('--- AppNavigator State ---', { isLoggedIn, profileComplete, profileCheckLoading });

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        // ── Auth flow ──────────────────────────────────────────────────────
        <>
          <Stack.Screen name="MobileNumber" component={MobileNumberScreen} />
          <Stack.Screen name="Otp"          component={OtpScreen} />
        </>
      ) : profileCheckLoading ? (
        // ── Waiting for getProfile API result ─────────────────────────────
        <Stack.Screen name="CheckingProfile" component={CheckingProfileScreen} />
      ) : !profileComplete ? (
        // ── Profile incomplete → ask user to fill details ─────────────────
        <Stack.Screen name="ProfileUpdate" component={ProfileUpdateScreen} />
      ) : (
        // ── Full access with bottom tab bar ───────────────────────────────
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
