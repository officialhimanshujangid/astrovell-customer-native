import React, { useState, useRef, useEffect } from 'react';
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
import { loginWithOtp, clearOtp, getProfile } from '../store/slices/authSlice';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const STARS = [
  { top: '5%', left: '10%', size: 3, opacity: 0.8 },
  { top: '8%', left: '85%', size: 2, opacity: 0.6 },
  { top: '15%', left: '55%', size: 4, opacity: 0.9 },
  { top: '20%', left: '25%', size: 2, opacity: 0.7 },
  { top: '78%', left: '15%', size: 2, opacity: 0.7 },
  { top: '85%', left: '80%', size: 3, opacity: 0.5 },
  { top: '92%', left: '45%', size: 2, opacity: 0.8 },
];

const OtpScreen = ({ navigation }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const dispatch = useDispatch();
  const { loading, error, contactNo, otpReceived } = useSelector((state) => state.auth);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerAnim = useRef(new Animated.Value(1)).current;
  const [resendTimer, setResendTimer] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (text, index) => {
    if (text.length > 1) {
      // Handle paste
      const digits = text.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => { if (i < 6) newOtp[i] = d; });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const getOtpString = () => otp.join('');

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleSubmit = async () => {
    const otpString = getOtpString();
    if (otpString.length < 6) {
      Alert.alert('Incomplete OTP', 'Please enter the complete 6-digit OTP');
      return;
    }
    const resultAction = await dispatch(loginWithOtp({ contactNo, otp: otpString }));
    if (loginWithOtp.fulfilled.match(resultAction)) {
      dispatch(clearOtp());
      // Immediately check profile from API to get authoritative isProfileComplete
      const userId = resultAction.payload?.recordList?.id;
      if (userId) {
        dispatch(getProfile(userId));
      }
    } else {
      Alert.alert('Invalid OTP', resultAction.payload?.message || 'The OTP you entered is incorrect');
    }
  };

  const maskedContact = contactNo
    ? `+91 ${contactNo.slice(0, 2)}****${contactNo.slice(-4)}`
    : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {STARS.map((star, i) => (
        <View key={i} style={[styles.star, { top: star.top, left: star.left, width: star.size, height: star.size, opacity: star.opacity }]} />
      ))}

      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>⭐</Text>
        </View>
        <Text style={styles.appName}>Astrovell</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Shield icon */}
        <View style={styles.shieldContainer}>
          <View style={styles.shieldCircle}>
            <Text style={styles.shieldIcon}>🛡️</Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>OTP Verification</Text>
        <Text style={styles.cardSubtitle}>
          We've sent a 6-digit code to{'\n'}
          <Text style={styles.highlight}>{maskedContact}</Text>
        </Text>

        {/* Test OTP display */}
        {otpReceived ? (
          <View style={styles.testOtpBox}>
            <Text style={styles.testOtpLabel}>✨ Test OTP</Text>
            <Text style={styles.testOtpValue}>{otpReceived}</Text>
          </View>
        ) : null}

        {/* 6-box OTP Input */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
              ]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              selectTextOnFocus
              caretHidden
            />
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        {/* Verify Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.button, (loading || getOtpString().length < 6) && styles.buttonDisabled]}
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
                  <Text style={styles.buttonText}>Verify & Login</Text>
                  <Text style={styles.buttonIcon}>🔮</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          {resendTimer > 0 ? (
            <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
          ) : (
            <TouchableOpacity onPress={() => setResendTimer(30)}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Back */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Change Number</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>✦ Secure & Encrypted ✦</Text>
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
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.gold,
    opacity: 0.1,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.purple,
    opacity: 0.15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 200, 66, 0.15)',
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoEmoji: {
    fontSize: 28,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.5,
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
    alignItems: 'center',
  },
  shieldContainer: {
    marginBottom: 16,
  },
  shieldCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 2,
    borderColor: colors.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIcon: {
    fontSize: 30,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  highlight: {
    color: colors.gold,
    fontWeight: '700',
  },
  testOtpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 10,
  },
  testOtpLabel: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  testOtpValue: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  otpBox: {
    width: (width - 40 - 48 - 50) / 6,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.gold,
    backgroundColor: colors.goldGlow,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.error,
    width: '100%',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontSize: 13,
  },
  button: {
    width: width - 40 - 48,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
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
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resendText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  resendTimer: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  resendLink: {
    color: colors.purpleLight,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  footerText: {
    color: colors.textMuted,
    marginTop: 24,
    fontSize: 12,
    letterSpacing: 1,
  },
});

export default OtpScreen;
