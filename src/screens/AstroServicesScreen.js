import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '../components/DateTimePicker';
import { astroApi } from '../api/services';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';
import Toast from 'react-native-toast-message';

const TABS = [
  { key: 'numerology', label: 'Numerology', emoji: '🔢', free: true  },
  { key: 'muhurat',    label: 'Muhurat',    emoji: '🕐', free: true  },
  { key: 'transit',    label: 'Transit',    emoji: '🪐', free: true  },
  { key: 'tarot',      label: 'Tarot',      emoji: '🃏', free: false },
  { key: 'remedies',   label: 'Remedies',   emoji: '💎', free: false, price: 149 },
];

const fmtDate = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${mon}/${d.getFullYear()}`;
};

const Label = ({ text }) => <Text style={styles.label}>{text}</Text>;

const AstroServicesScreen = ({ onBack }) => {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState('numerology');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);

  // Numerology
  const [numName, setNumName] = useState('');
  const [numDate, setNumDate] = useState(null);
  // Muhurat
  const [muhDate, setMuhDate] = useState(null);
  // Transit
  const [transDob, setTransDob] = useState(null);
  const [transTob, setTransTob] = useState('');
  // Remedies
  const [remDob, setRemDob] = useState(null);
  const [remTob, setRemTob] = useState('');

  const reset = () => setResult(null);

  const call = async (fn) => {
    setLoading(true); setResult(null);
    try {
      const res = await fn();
      if (res.data?.status === 200) setResult({ type: activeTab, data: res.data.recordList });
      else Toast.show({ type: 'error', text1: 'Error', text2: res.data?.message || 'Request failed' });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong. Please try again.' });
    }
    setLoading(false);
  };

  const handleNumerology = () => {
    if (!numName || !numDate) { Toast.show({ type: 'error', text1: 'Required', text2: 'Enter your name and date of birth' }); return; }
    call(() => astroApi.numerology({ name: numName, date: fmtDate(numDate) }));
  };

  const handleMuhurat = () => {
    if (!muhDate) { Toast.show({ type: 'error', text1: 'Required', text2: 'Select a date' }); return; }
    call(() => astroApi.muhurat({ date: fmtDate(muhDate) }));
  };

  const handleTransit = () => {
    if (!transDob || !transTob) { Toast.show({ type: 'error', text1: 'Required', text2: 'Enter DOB and birth time' }); return; }
    call(() => astroApi.transit({ dob: fmtDate(transDob), tob: transTob }));
  };

  const handleTarot = () => {
    call(() => astroApi.tarot({}));
  };

  const handleRemedies = () => {
    if (!remDob || !remTob) { Toast.show({ type: 'error', text1: 'Required', text2: 'Enter DOB and birth time' }); return; }
    Alert.alert(
      'Confirm Purchase',
      'This will cost ₹149 from your wallet. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => call(() => astroApi.remedies({ dob: fmtDate(remDob), tob: remTob })) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Astro Services</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Chips */}
      <View style={styles.tabWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => { setActiveTab(t.key); reset(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.tabEmoji}>{t.emoji}</Text>
              <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              {!t.free && <Text style={styles.paidTag}>₹{t.price || 'Paid'}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* ── Numerology ── */}
        {activeTab === 'numerology' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Numerology Analysis</Text>
            <Text style={styles.cardDesc}>Discover your lucky numbers & personality traits based on your name and date of birth.</Text>
            <Label text="Full Name" />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textMuted}
              value={numName}
              onChangeText={setNumName}
            />
            <Label text="Date of Birth" />
            <DateTimePicker
              value={numDate}
              onChange={setNumDate}
              mode="date"
              label="Select date of birth"
            />
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleNumerology} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#1A1A1A" /> : <Text style={styles.btnText}>Get Numerology Report</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Muhurat ── */}
        {activeTab === 'muhurat' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shubh Muhurat</Text>
            <Text style={styles.cardDesc}>Find auspicious time for any event — Rahu Kaal, Gulika, Yamakanta timings.</Text>
            <Label text="Select Date" />
            <DateTimePicker value={muhDate} onChange={setMuhDate} mode="date" label="Select date" />
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleMuhurat} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#1A1A1A" /> : <Text style={styles.btnText}>Get Muhurat</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Transit ── */}
        {activeTab === 'transit' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Planet Transit</Text>
            <Text style={styles.cardDesc}>See how current planet positions affect your moon sign.</Text>
            <Label text="Date of Birth" />
            <DateTimePicker value={transDob} onChange={setTransDob} mode="date" label="Date of birth" />
            <Label text="Birth Time (HH:MM)" />
            <TextInput
              style={styles.input}
              placeholder="e.g. 14:30"
              placeholderTextColor={colors.textMuted}
              value={transTob}
              onChangeText={setTransTob}
            />
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleTransit} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#1A1A1A" /> : <Text style={styles.btnText}>Get Transit Report</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tarot ── */}
        {activeTab === 'tarot' && (
          <View style={[styles.card, { alignItems: 'center' }]}>
            <Text style={styles.cardTitle}>Tarot Card Reading</Text>
            <Text style={styles.cardDesc}>Draw 3 cards — Past, Present, Future. 1 free reading per day.</Text>
            <Text style={{ fontSize: 48, marginVertical: 16 }}>🃏</Text>
            <TouchableOpacity style={[styles.btn, styles.tarotBtn, loading && { opacity: 0.6 }]} onPress={handleTarot} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#1A1A1A" /> : <Text style={styles.btnText}>Draw Your Cards</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Remedies ── */}
        {activeTab === 'remedies' && (
          <View style={[styles.card, { borderColor: colors.warning, borderWidth: 2 }]}>
            <View style={styles.remHeader}>
              <Text style={styles.cardTitle}>Dosha Remedies</Text>
              <View style={styles.pricePill}><Text style={styles.pricePillText}>₹149</Text></View>
            </View>
            <Text style={styles.cardDesc}>Get detailed dosha analysis with gemstone, mantra, and puja remedies.</Text>
            <Label text="Date of Birth" />
            <DateTimePicker value={remDob} onChange={setRemDob} mode="date" label="Date of birth" />
            <Label text="Birth Time (HH:MM)" />
            <TextInput
              style={styles.input}
              placeholder="e.g. 14:30"
              placeholderTextColor={colors.textMuted}
              value={remTob}
              onChangeText={setRemTob}
            />
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.warning }, loading && { opacity: 0.6 }]} onPress={handleRemedies} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color="#1A1A1A" /> : <Text style={styles.btnText}>Get Remedies — ₹149</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Results ── */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {result.type === 'numerology' ? 'Your Numerology Report' :
               result.type === 'muhurat'    ? 'Muhurat & Timings' :
               result.type === 'transit'    ? 'Your Moon Sign & Transit' :
               result.type === 'tarot'      ? 'Your Tarot Cards' :
               'Dosha Analysis & Remedies'}
            </Text>

            {result.type === 'tarot' && Array.isArray(result.data) && (
              result.data.map((card, i) => (
                <View key={i} style={styles.tarotCard}>
                  <Text style={styles.tarotPos}>{card.position}</Text>
                  <Text style={styles.tarotName}>{card.name}{card.isReversed ? ' (Reversed)' : ''}</Text>
                  <Text style={styles.tarotMeaning}>{card.isReversed ? card.reversed : card.meaning}</Text>
                </View>
              ))
            )}

            {result.type !== 'tarot' && result.data && (
              Object.entries(typeof result.data === 'object' ? result.data : {}).map(([key, val]) => (
                val ? (
                  <View key={key} style={styles.resultRow}>
                    <Text style={styles.resultKey}>{String(key).replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</Text>
                    <Text style={styles.resultVal}>
                      {typeof val === 'object' ? (val.meaning || val.description || JSON.stringify(val)) : String(val)}
                    </Text>
                  </View>
                ) : null
              ))
            )}
          </View>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

export default AstroServicesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 44, paddingBottom: 12,
    backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  tabWrap: { backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#EBEBEB', backgroundColor: '#FFF',
  },
  tabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabEmoji: { fontSize: 16 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  tabLabelActive: { color: '#1A1A1A', fontWeight: '700' },
  paidTag: { fontSize: 10, fontWeight: '700', color: colors.warning, backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  scroll: { padding: 14 },
  card: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: '#EFEFEF', marginBottom: 14, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.text, backgroundColor: '#FAFAFA',
  },
  btn: {
    backgroundColor: colors.gold, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  tarotBtn: { paddingVertical: 18, paddingHorizontal: 40, borderRadius: 30 },
  btnText: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  remHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pricePill: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pricePillText: { fontSize: 13, fontWeight: '700', color: '#D97706' },
  resultCard: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: '#E0D4F5', marginBottom: 14, gap: 10,
  },
  resultTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 },
  resultRow: {
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingVertical: 8, gap: 4,
  },
  resultKey: { fontSize: 12, fontWeight: '700', color: colors.purple, textTransform: 'capitalize' },
  resultVal: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  tarotCard: {
    backgroundColor: '#F9F5FF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E0D4F5', alignItems: 'center', gap: 4,
  },
  tarotPos: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  tarotName: { fontSize: 15, fontWeight: '800', color: colors.purple },
  tarotMeaning: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
