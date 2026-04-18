import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, Share,
} from 'react-native';
import Toast from 'react-native-toast-message';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { referralApi } from '../api/services';
import { useSelector } from 'react-redux';

import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const StatCard = ({ label, value, color }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const ReferEarnScreen = ({ onBack }) => {
  const { can } = usePermissions();
  const { user } = useSelector((s) => s.auth);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode]       = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    referralApi.getInfo()
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Referral not available'))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    // Use Share sheet — user can tap "Copy to clipboard" from native options
    await Share.share({
      message: data?.referralCode || '',
      title: 'Your Referral Code',
    });
  };

  const handleShare = async () => {
    const text = `Join AstroGuru and get ₹${data?.refereeBonus || 0} bonus! Use my referral code: ${data?.referralCode}`;
    await Share.share({ message: text, title: 'AstroGuru Referral' });
  };

  const handleApply = async () => {
    if (!code.trim()) { Toast.show({ type: 'error', text1: 'Enter Code', text2: 'Please enter a referral code' }); return; }
    setApplying(true);
    try {
      const res = await referralApi.applyCode({ referralCode: code.trim() });
      if (res.data?.status === 200) {
        Toast.show({ type: 'success', text1: 'Success', text2: res.data.message || 'Referral code applied!' });
        setCode('');
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: res.data?.message || 'Failed to apply code' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.response?.data?.message || 'Failed' });
    }
    setApplying(false);
  };

  if (!can('refer_and_earn')) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={52} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Access Restricted</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.subText}>Loading…</Text>
        </View>
      ) : error || !data?.enabled ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="account-plus-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Referral Not Available</Text>
          <Text style={styles.subText}>{error || 'The referral system is not active right now'}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Code Card */}
          <View style={styles.codeCard}>
            <Text style={styles.codeCardTitle}>Your Referral Code</Text>
            <View style={styles.codePill}>
              <Text style={styles.codeText}>{data.referralCode}</Text>
            </View>
            <View style={styles.codeActions}>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.85}>
                <Ionicons name="copy-outline" size={16} color="#1A1A1A" />
                <Text style={styles.copyBtnText}>Copy Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                <Ionicons name="share-outline" size={16} color="#FFF" />
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard label="Total Referred" value={data.totalReferred || 0} color={colors.gold} />
            <StatCard label="Completed" value={data.completedReferrals || 0} color={colors.success} />
            <StatCard label="Total Earned" value={`₹${(data.totalEarned || 0).toFixed(2)}`} color={colors.warning} />
          </View>

          {/* How it works */}
          <View style={styles.howCard}>
            <Text style={styles.howTitle}>How it works</Text>
            {[
              'Share your referral code with friends',
              'Friend registers and enters your code',
              `Friend recharges a minimum amount`,
              `You get ₹${data.referrerBonus || 0} and your friend gets ₹${data.refereeBonus || 0}`,
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Apply Code */}
          <View style={styles.applyCard}>
            <Text style={styles.applyTitle}>Have a referral code?</Text>
            <View style={styles.applyRow}>
              <View style={styles.codeInput}>
                <Ionicons name="ticket-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.codeInputText}
                  placeholder="Enter referral code"
                  placeholderTextColor={colors.textMuted}
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>
              <TouchableOpacity
                style={[styles.applyBtn, applying && { opacity: 0.6 }]}
                onPress={handleApply}
                disabled={applying}
              >
                <Text style={styles.applyBtnText}>{applying ? '…' : 'Apply'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* History */}
          {data.history?.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Referral History</Text>
              {data.history.map((h, i) => (
                <View key={i} style={styles.histCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histName}>{h.refereeName || 'User'}</Text>
                    <Text style={styles.histDate}>{fmtDate(h.created_at)}</Text>
                  </View>
                  <View>
                    <View style={[
                      styles.histStatus,
                      { backgroundColor: h.status === 'completed' ? '#d1fae5' : '#fef3c7' }
                    ]}>
                      <Text style={{ fontSize: 11, color: h.status === 'completed' ? '#065f46' : '#92400e', fontWeight: '700' }}>
                        {h.status}
                      </Text>
                    </View>
                    {h.status === 'completed' && (
                      <Text style={styles.histBonus}>+₹{h.referrer_bonus}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
};

export default ReferEarnScreen;

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
  scroll: { padding: 14, gap: 14 },
  // Code card
  codeCard: {
    backgroundColor: colors.gold,
    borderRadius: 16, padding: 24, alignItems: 'center',
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  codeCardTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', opacity: 0.8, marginBottom: 12 },
  codePill: {
    backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginBottom: 16,
  },
  codeText: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', letterSpacing: 4 },
  codeActions: { flexDirection: 'row', gap: 12 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  copyBtnText: { fontWeight: '700', color: '#1A1A1A', fontSize: 13 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.success, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  shareBtnText: { fontWeight: '700', color: '#FFF', fontSize: 13 },
  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: colors.primary,
    borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#EFEFEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800' },
  // How it works
  howCard: {
    backgroundColor: '#F9F5FF', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: '#E0D4F5',
  },
  howTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 14 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
  stepText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  // Apply
  applyCard: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#EFEFEF',
  },
  applyTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 12 },
  applyRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: colors.borderGold, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  codeInputText: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  applyBtn: {
    backgroundColor: colors.gold, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10, justifyContent: 'center',
  },
  applyBtnText: { fontWeight: '800', color: '#1A1A1A', fontSize: 14 },
  // History
  historySection: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 4 },
  histCard: {
    backgroundColor: colors.primary, borderRadius: 12,
    borderWidth: 1, borderColor: '#EFEFEF',
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
  },
  histName: { fontSize: 13, fontWeight: '700', color: colors.text },
  histDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  histStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end' },
  histBonus: { fontSize: 13, color: colors.success, fontWeight: '700', marginTop: 4, textAlign: 'right' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16 },
  subText: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
});
