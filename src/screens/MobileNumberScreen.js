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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { checkContactNumber, setContactNo } from '../store/slices/authSlice';
import { colors } from '../theme/colors';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const MobileNumberScreen = ({ navigation }) => {
  const [mobile,    setMobile]    = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const handleSubmit = async () => {
    if (!mobile || mobile.length < 10) {
      Toast.show({ type: 'error', text1: 'Invalid Number', text2: 'Please enter a valid 10-digit mobile number' });
      return;
    }
    dispatch(setContactNo(mobile));
    const resultAction = await dispatch(checkContactNumber(mobile));
    if (checkContactNumber.fulfilled.match(resultAction)) {
      if (resultAction.payload.status === 200) {
        navigation.navigate('Otp');
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: resultAction.payload.message || 'Failed to send OTP' });
      }
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: resultAction.payload?.message || 'Something went wrong' });
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* ── Top Yellow Wave ── */}
      <View style={styles.topWave} />

      {/* ── Logo / Header ── */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="zodiac-gemini" size={36} color="#1A1A1A" />
        </View>
        <Text style={styles.appName}>AstroVell</Text>
        <Text style={styles.tagline}>Your Cosmic Guide</Text>
      </View>

      {/* ── Card ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Login / Sign Up</Text>
        <Text style={styles.cardSubtitle}>Enter your mobile number to continue</Text>

        {/* Phone Input */}
        <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
          <Text style={styles.flag}>🇮🇳</Text>
          <Text style={styles.countryCodeText}>+91</Text>
          <View style={styles.inputDivider} />
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
            {loading ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.buttonText}>Get OTP</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
        </Text>
      </View>

      {/* ── Footer trust text ── */}
      <Text style={styles.footerText}>✦ Trusted by 10 Lakh+ seekers ✦</Text>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Yellow wave top decoration
  topWave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
    backgroundColor: colors.gold,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
    zIndex: 1,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.55)',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
  },

  // Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 8,
  },
  inputWrapperFocused: {
    borderColor: colors.gold,
    backgroundColor: colors.goldBg,
  },
  flag: { fontSize: 18 },
  countryCodeText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  inputDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#DDD',
    marginHorizontal: 4,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 14,
    letterSpacing: 0.5,
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

  // Button
  button: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  termsText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
  },
  termsLink: {
    color: colors.goldDark,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },

  footerText: {
    color: colors.textMuted,
    marginTop: 24,
    fontSize: 12,
    letterSpacing: 1,
    zIndex: 1,
  },
});

export default MobileNumberScreen;
