import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, clearUpdateError, getProfile } from '../store/slices/authSlice';
import { DatePickerModal, TimePickerModal } from '../components/DateTimePicker';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const STARS = [
  { top: '4%',  left: '7%',  size: 2, opacity: 0.7 },
  { top: '8%',  left: '87%', size: 3, opacity: 0.5 },
  { top: '13%', left: '52%', size: 2, opacity: 0.9 },
  { top: '88%', left: '18%', size: 2, opacity: 0.6 },
  { top: '94%', left: '76%', size: 3, opacity: 0.5 },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const InputField = ({ label, icon, value, onChangeText, placeholder, keyboardType, editable = true, required }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>
        {icon}{'  '}{label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType || 'default'}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
      />
    </View>
  );
};

const PickerField = ({ label, icon, value, placeholder, onPress, required }) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.fieldLabel}>
      {icon}{'  '}{label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
    <TouchableOpacity style={styles.pickerBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.pickerText, !value && { color: colors.textMuted }]}>
        {value || placeholder}
      </Text>
      <Text style={styles.pickerArrow}>📆</Text>
    </TouchableOpacity>
  </View>
);

const GenderSelector = ({ value, onChange }) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.fieldLabel}>{'⚧  Gender'}<Text style={styles.required}> *</Text></Text>
    <View style={styles.genderRow}>
      {GENDER_OPTIONS.map((g) => (
        <TouchableOpacity key={g} style={[styles.genderBtn, value === g && styles.genderBtnActive]} onPress={() => onChange(g)} activeOpacity={0.8}>
          <Text style={[styles.genderText, value === g && styles.genderTextActive]}>
            {g === 'Male' ? '♂' : g === 'Female' ? '♀' : '⚥'} {g}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

const ProfileUpdateScreen = ({ onBack }) => {
  console.log('--- ProfileUpdateScreen Rendered ---', { onBack });
  const dispatch = useDispatch();
  const { user, updateLoading, updateError, profileLoading } = useSelector((s) => s.auth);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(1)).current; // Default to 1 to prevent blank screen
  const slideAnim = useRef(new Animated.Value(0)).current; // Default to 0 to prevent shifted UI

  const [form, setForm] = useState({
    name: '', email: '', gender: '',
    birthDate: '', birthTime: '', birthPlace: '',
  });

  useEffect(() => {
    console.log('--- ProfileUpdateScreen Mount Effect ---', { userId: user?.id });
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 550, useNativeDriver: true }),
    ]).start();

    // Always fetch profile if we have a userId to ensure console log fires and data is fresh
    if (user?.id) {
      console.log('--- ProfileUpdateScreen Dispatching getProfile ---', user.id);
      dispatch(getProfile(user.id));
    }

    return () => { dispatch(clearUpdateError()); };
  }, []);

  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
      console.log('--- ProfileUpdateScreen Setting Form Data ---', user);
      setForm({
        name:       user.name       || '',
        email:      user.email      || '',
        gender:     user.gender     || '',
        birthDate:  user.birthDate  || '',
        birthTime:  user.birthTime ? user.birthTime.split(':').slice(0, 2).join(':') : '',
        birthPlace: user.birthPlace || '',
      });
    }
  }, [user]);

  const setField = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  const filledCount = [form.name, form.email, form.gender, form.birthDate, form.birthTime, form.birthPlace].filter(Boolean).length;
  const progressPct = `${Math.round((filledCount / 6) * 100)}%`;

  const validate = () => {
    if (!form.name.trim())       { Alert.alert('Required', 'Please enter your full name');          return false; }
    if (!form.gender)            { Alert.alert('Required', 'Please select your gender');            return false; }
    if (!form.birthDate.trim())  { Alert.alert('Required', 'Please pick your birth date');          return false; }
    if (!form.birthTime.trim())  { Alert.alert('Required', 'Please pick your birth time');          return false; }
    if (!form.birthPlace.trim()) { Alert.alert('Required', 'Please enter your birth place');        return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = {
      name:      form.name.trim(),
      email:     form.email.trim(),
      contactNo: user?.contactNo || '',
      gender:    form.gender,
      birthDate: form.birthDate.trim(),
      birthPlace:form.birthPlace.trim(),
      birthTime: form.birthTime.trim(),
    };
    const result = await dispatch(updateProfile(payload));
    if (updateProfile.rejected.match(result)) {
      Alert.alert('Update Failed', result.payload?.message || 'Something went wrong.');
    }
    // On success: profileComplete → true → Navigator auto-routes to Home
  };

  // If we are explicitly loading the profile (e.g. during an edit refresh)
  const isRefreshing = profileLoading && onBack;

  return (
    <>
      <DatePickerModal
        visible={showDatePicker}
        value={form.birthDate}
        onConfirm={setField('birthDate')}
        onClose={() => setShowDatePicker(false)}
      />
      <TimePickerModal
        visible={showTimePicker}
        value={form.birthTime}
        onConfirm={setField('birthTime')}
        onClose={() => setShowTimePicker(false)}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.container}>
          {isRefreshing ? (
             <View style={styles.loadingWrap}>
                <Text style={{ fontSize: 44, marginBottom: 16 }}>🔮</Text>
                <ActivityIndicator size="large" color={colors.gold} />
                <Text style={styles.loadingText}>Refreshing details…</Text>
             </View>
          ) : (
            <>

          {/* Background stars */}
          {STARS.map((s, i) => (
            <View key={i} style={[styles.star, { top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity }]} />
          ))}
          <View style={styles.orbTop} />
          <View style={styles.orbBottom} />

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              {onBack && (
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                  <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
              )}
              <View style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarEmoji}>✨</Text>
                </View>
              </View>
              <Text style={styles.title}>
                {onBack ? 'Edit Profile' : 'Complete Your Profile'}
              </Text>
              <Text style={styles.subtitle}>
                {onBack
                  ? 'Update your cosmic details below'
                  : 'Share your details to get personalised insights'}
              </Text>
            </Animated.View>

            {/* Card */}
            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

              {/* Progress */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: progressPct }]} />
                </View>
                <Text style={styles.progressText}>{filledCount} / 6 fields completed</Text>
              </View>

              {/* Section: Personal */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: colors.purpleLight }]} />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

              <InputField label="Full Name"     icon="👤" value={form.name}  onChangeText={setField('name')}  placeholder="Enter your full name"        required />
              <InputField label="Email Address" icon="📧" value={form.email} onChangeText={setField('email')} placeholder="Enter your email (optional)"  keyboardType="email-address" />
              <InputField label="Mobile Number" icon="📱" value={user?.contactNo || ''} editable={false} placeholder="Mobile number" keyboardType="phone-pad" />

              <GenderSelector value={form.gender} onChange={setField('gender')} />

              {/* Section: Birth Details */}
              <View style={[styles.sectionHeader, { marginTop: 6 }]}>
                <View style={[styles.sectionDot, { backgroundColor: colors.gold }]} />
                <Text style={styles.sectionTitle}>Birth Details</Text>
              </View>

              <PickerField
                label="Birth Date"
                icon="📅"
                value={form.birthDate}
                placeholder="Tap to select birth date"
                onPress={() => setShowDatePicker(true)}
                required
              />
              <PickerField
                label="Birth Time"
                icon="🕐"
                value={form.birthTime}
                placeholder="Tap to select birth time"
                onPress={() => setShowTimePicker(true)}
                required
              />
              <InputField label="Birth Place" icon="📍" value={form.birthPlace} onChangeText={setField('birthPlace')} placeholder="City, State, Country" required />

              {/* Error */}
              {updateError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠  {updateError}</Text>
                </View>
              ) : null}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, updateLoading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={updateLoading}
                activeOpacity={0.85}
              >
                {updateLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Text style={styles.submitText}>{onBack ? 'Save Changes' : 'Save & Continue'}</Text>
                    <Text style={styles.submitIcon}>🔮</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.hint}>✦ Secure & Encrypted ✦</Text>
            </Animated.View>
          </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
};

export default ProfileUpdateScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 15, marginTop: 14 },
  container: { flex: 1, backgroundColor: colors.primary },
  star: { position: 'absolute', backgroundColor: '#ffffff', borderRadius: 10 },
  orbTop: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: colors.gold, opacity: 0.08 },
  orbBottom: { position: 'absolute', bottom: -100, left: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: colors.purple, opacity: 0.12 },
  scroll: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 26 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 },
  backText: { color: colors.purpleLight, fontSize: 14, fontWeight: '600' },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: colors.borderGold, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,200,66,0.08)', marginBottom: 16 },
  avatarInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(124,58,237,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 32 },
  title: { fontSize: 23, fontWeight: '800', color: colors.text, letterSpacing: 0.4, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: colors.border, shadowColor: colors.purple, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 10 },

  progressContainer: { marginBottom: 22 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 3 },
  progressText: { fontSize: 11, color: colors.textMuted, textAlign: 'right' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.4 },

  fieldWrapper: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 7, letterSpacing: 0.2 },
  required: { color: colors.error },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 13, color: colors.text, fontSize: 15, fontWeight: '500' },
  inputFocused: { borderColor: colors.purpleLight, backgroundColor: 'rgba(124,58,237,0.1)' },
  inputDisabled: { opacity: 0.4, borderStyle: 'dashed' },

  // Picker button
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: colors.borderGold, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14 },
  pickerText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  pickerArrow: { fontSize: 18 },

  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  genderBtnActive: { borderColor: colors.gold, backgroundColor: colors.goldGlow },
  genderText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  genderTextActive: { color: colors.gold, fontWeight: '700' },

  errorBox: { backgroundColor: colors.errorBg, borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 13, textAlign: 'center' },

  submitBtn: { backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 6, shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  submitBtnDisabled: { opacity: 0.65 },
  submitText: { color: colors.primary, fontSize: 17, fontWeight: '800', letterSpacing: 0.4 },
  submitIcon: { fontSize: 18 },
  hint: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 16, letterSpacing: 0.8 },
});
