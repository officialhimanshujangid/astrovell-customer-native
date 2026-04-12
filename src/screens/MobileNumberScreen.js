import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { checkContactNumber, setContactNo } from '../store/slices/authSlice';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// Decorative star positions
const STARS = [
  { top: '5%', left: '10%', size: 3, opacity: 0.8 },
  { top: '8%', left: '85%', size: 2, opacity: 0.6 },
  { top: '15%', left: '55%', size: 4, opacity: 0.9 },
  { top: '20%', left: '25%', size: 2, opacity: 0.7 },
  { top: '25%', left: '70%', size: 3, opacity: 0.5 },
  { top: '30%', left: '90%', size: 2, opacity: 0.8 },
  { top: '35%', left: '5%', size: 3, opacity: 0.6 },
  { top: '75%', left: '15%', size: 2, opacity: 0.7 },
  { top: '80%', left: '80%', size: 3, opacity: 0.5 },
  { top: '88%', left: '45%', size: 2, opacity: 0.8 },
  { top: '92%', left: '5%', size: 4, opacity: 0.6 },
  { top: '95%', left: '75%', size: 2, opacity: 0.9 },
];

const ZODIAC_SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

const MobileNumberScreen = ({ navigation }) => {
  const [mobile, setMobile] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleSubmit = async () => {
    if (!mobile || mobile.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }
    dispatch(setContactNo(mobile));
    const resultAction = await dispatch(checkContactNumber(mobile));
    if (checkContactNumber.fulfilled.match(resultAction)) {
      if (resultAction.payload.status === 200) {
        navigation.navigate('Otp');
      } else {
        Alert.alert('Error', resultAction.payload.message || 'Failed to send OTP');
      }
    } else {
      Alert.alert('Error', resultAction.payload?.message || 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Background stars */}
      {STARS.map((star, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}

      {/* Glowing orb top */}
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      {/* Logo / Header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🔮</Text>
        </View>
        <Text style={styles.appName}>Astrovell</Text>
        <Text style={styles.tagline}>Your Cosmic Guide</Text>
      </View>

      {/* Zodiac strip */}
      <View style={styles.zodiacStrip}>
        {ZODIAC_SIGNS.map((sign, i) => (
          <Text key={i} style={styles.zodiacSign}>{sign}</Text>
        ))}
      </View>

      {/* Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Enter your mobile number to begin your cosmic journey</Text>
        </View>

        {/* Phone Input */}
        <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
          <View style={styles.countryCode}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.countryCodeText}>+91</Text>
            <Text style={styles.divider}>|</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={setMobile}
            maxLength={10}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        {/* Send OTP Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={loading}
            activeOpacity={0.9}
          >
            <View style={styles.buttonInner}>
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Send OTP</Text>
                  <Text style={styles.buttonIcon}>✨</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.termsText}>By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
        </Text>
      </View>

      <Text style={styles.footerText}>✦ Trusted by 10 Lakh+ seekers ✦</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  orbTop: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.purple,
    opacity: 0.18,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -100,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.goldDark,
    opacity: 0.12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    borderWidth: 2,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.5,
    textShadowColor: colors.goldGlow,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  zodiacStrip: {
    flexDirection: 'row',
    marginBottom: 20,
    opacity: 0.5,
  },
  zodiacSign: {
    color: colors.goldLight,
    fontSize: 14,
    marginHorizontal: 4,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  cardHeader: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 6,
  },
  flag: {
    fontSize: 18,
  },
  countryCodeText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    color: colors.border,
    fontSize: 20,
    marginLeft: 6,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 16,
    paddingRight: 16,
    letterSpacing: 1,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontSize: 13,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonInner: {
    backgroundColor: colors.gold,
    paddingVertical: 17,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    fontSize: 18,
  },
  termsText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
  },
  termsLink: {
    color: colors.purpleLight,
    textDecorationLine: 'underline',
  },
  footerText: {
    color: colors.textMuted,
    marginTop: 24,
    fontSize: 12,
    letterSpacing: 1,
  },
});



export default MobileNumberScreen;
