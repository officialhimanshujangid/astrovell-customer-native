import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWalletBalance,
  fetchWalletTransactions,
  fetchRechargeAmounts,
  fetchPaymentConfig,
  addPayment,
  razorpayCreateOrder,
  razorpayVerify,
  paymentSuccess,
  cancelPayment,
  applyCoupon,
  clearAppliedCoupon,
  setBalance,
} from '../store/slices/walletSlice';
import { getProfile } from '../store/slices/authSlice';
import { colors } from '../theme/colors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Main Component ───────────────────────────────────────────────────────────

const WalletScreen = ({ onBack }) => {
  const dispatch  = useDispatch();
  const { user, token, settings } = useSelector((s) => s.auth);
  const {
    balance, balanceLoad,
    transactions, txnLoad,
    rechargeAmounts, rechargeLoad,
    paymentConfig, configLoad,
    paymentLoading,
    appliedCoupon, couponLoad, couponError,
  } = useSelector((s) => s.wallet);

  const currencySymbol = settings?.currencySymbol || '₹';

  const [customAmount,    setCustomAmount]    = useState('');
  const [couponCode,      setCouponCode]      = useState('');
  const [selectedGateway, setSelectedGateway] = useState('razorpay');
  const [recharging,      setRecharging]      = useState(false);
  const [activeTab,       setActiveTab]       = useState('recharge'); // 'recharge' | 'history'

  // ── Load data on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.allSettled([
      dispatch(fetchWalletBalance()),
      dispatch(fetchRechargeAmounts()),
      dispatch(fetchWalletTransactions({ startIndex: 0, fetchRecord: 100 })),
      dispatch(fetchPaymentConfig()),
    ]);
  }, [dispatch]);

  // Set gateway based on config
  useEffect(() => {
    if (paymentConfig?.activeMode === 'Stripe') setSelectedGateway('stripe');
  }, [paymentConfig]);

  // ── Coupon ──────────────────────────────────────────────────────────────────
  const handleApplyCoupon = (amount) => {
    const amt = amount || customAmount;
    if (!couponCode.trim()) { Alert.alert('Enter a coupon code'); return; }
    if (!amt || parseFloat(amt) <= 0) { Alert.alert('Select a recharge amount first'); return; }
    dispatch(applyCoupon({ couponCode: couponCode.trim(), amount: parseFloat(amt) }));
  };

  const handleRemoveCoupon = () => {
    dispatch(clearAppliedCoupon());
    setCouponCode('');
  };

  // ── Recharge Flow ──────────────────────────────────────────────────────────
  const handleRecharge = async (amount, cashback) => {
    const rechargeAmt = amount || customAmount;
    console.log('--- [Wallet] Recharge Initiated ---', { amount: rechargeAmt, cashback });
    if (!rechargeAmt || parseFloat(rechargeAmt) <= 0) {
      console.warn('[Wallet] Invalid amount entered');
      Alert.alert('Invalid Amount', 'Please enter a valid amount'); return;
    }
    const couponDiscount = appliedCoupon ? (appliedCoupon.discount || 0) : 0;
    const totalCashback  = (parseFloat(cashback || 0)) + couponDiscount;

    setRecharging(true);
    try {
      console.log('[Wallet] STEP 1: Creating internal payment record...');
      const res = await dispatch(addPayment({
        amount: parseFloat(rechargeAmt),
        cashback_amount: totalCashback,
        payment_for: 'wallet',
        paymentMode: selectedGateway,
      })).unwrap();

      console.log('[Wallet] Internal Payment Response:', res);

      if (res?.status !== 200 || !res?.paymentId) {
        console.error('[Wallet] Failed to create internal payment record');
        Alert.alert('Error', res?.message || 'Payment initiation failed');
        setRecharging(false); return;
      }

      if (selectedGateway === 'razorpay') {
        console.log('[Wallet] STEP 2: Opening Razorpay Flow for paymentId:', res.paymentId);
        await openRazorpay(res.paymentId, res.amount || parseFloat(rechargeAmt));
      } else {
        console.warn('[Wallet] Stripe selected but not implemented for mobile');
        Alert.alert('Info', 'Stripe is not supported in mobile app yet. Please use Razorpay.');
        setRecharging(false);
      }
    } catch (err) {
      console.error('[Wallet] Recharge Error:', err);
      Alert.alert('Error', err?.message || 'Payment failed');
      setRecharging(false);
    }
  };

  // ── Razorpay ────────────────────────────────────────────────────────────────
  const openRazorpay = async (paymentId, amount) => {
    try {
      console.log('[Razorpay] Requesting orderId and keys from server...', { paymentId, amount });
      const orderRes = await dispatch(razorpayCreateOrder({ amount, paymentId })).unwrap();

      console.log('[Razorpay] Server Order Response:', orderRes);

      if (!orderRes?.orderId || !orderRes?.keyId) {
        console.error('[Razorpay] Server did not return valid orderId or keyId');
        Alert.alert('Error', 'Razorpay is not configured. Please contact support.');
        setRecharging(false); return;
      }

      // ── SDK availability check ───────────────────────────────────────────────
      let RazorpayCheckout;
      try {
        console.log('[Razorpay] Checking if react-native-razorpay is available...');
        const Module = require('react-native-razorpay');
        RazorpayCheckout = Module.default || Module;
      } catch (_) {
        console.warn('[Razorpay] Package not installed');
      }

      // In DEV / Expo Go: the native bridge is not available so we show a
      // simulation prompt.  In production (APK/IPA) we always skip this block
      // and go straight to the real SDK — even if NativeModules inspection is
      // unreliable at bridge-init time.
      if (__DEV__) {
        const { NativeModules } = require('react-native');
        // Native module registers as 'RNRazorpayCheckout' (see RazorpayModule.java → getName())
        const isNativeLinked =
          !!RazorpayCheckout &&
          typeof RazorpayCheckout.open === 'function' &&
          !!(NativeModules.RNRazorpayCheckout);

        if (!isNativeLinked) {
          console.warn('[Razorpay] Native module not linked (Expo Go). Showing test prompt.');
          Alert.alert(
            '⚠️ Payment SDK Not Available',
            `Razorpay requires a development or production build.\n\nRunning in Expo Go?\nUse "Simulate Success" to test the flow.\n\nOrder: ${orderRes.orderId}`,
            [
              {
                text: '✅ Simulate Success (Test)',
                onPress: async () => {
                  console.log('[Razorpay Simulation] Using paymentSuccess for order:', orderRes.orderId);
                  try {
                    const res = await dispatch(paymentSuccess({
                      paymentId,
                      orderId:  orderRes.orderId,
                      amount:   amount,
                    })).unwrap();
                    console.log('[Simulation] paymentSuccess Response:', res);
                    if (res?.status === 200) {
                      Alert.alert('Success 🎉', res.message || `Wallet recharged with ${currencySymbol}${amount}\n(Expo Go simulation)`);
                      dispatch(fetchWalletBalance());
                      dispatch(fetchWalletTransactions({ startIndex: 0, fetchRecord: 100 }));
                      if (user?.id) dispatch(getProfile(user.id));
                    } else {
                      try { await dispatch(cancelPayment({ paymentId })); } catch (_) {}
                      Alert.alert(
                        'Expo Go Limitation',
                        'Payment simulation is not supported in Expo Go.\n\n' +
                        'Please use a development build to test real payments.\n\n' +
                        `Order created: ${orderRes.orderId}`,
                        [{ text: 'OK' }]
                      );
                    }
                  } catch (e) {
                    console.error('[Simulation] paymentSuccess Error:', e);
                    try { await dispatch(cancelPayment({ paymentId })); } catch (_) {}
                    Alert.alert(
                      'Expo Go Limitation',
                      'Payment simulation is not supported in Expo Go.\n\n' +
                      'Please use a development build to test real payments.\n\n' +
                      `Order: ${orderRes.orderId}`,
                      [{ text: 'OK' }]
                    );
                  }
                  setRecharging(false);
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: async () => {
                  try { await dispatch(cancelPayment({ paymentId })); } catch (e) {}
                  setRecharging(false);
                },
              },
            ]
          );
          return;
        }
      }

      // In production, if the package failed to load at all, surface a clear error
      if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
        console.error('[Razorpay] SDK not available in production build');
        Alert.alert('Payment Error', 'Razorpay SDK is not available. Please reinstall the app.');
        try { await dispatch(cancelPayment({ paymentId })); } catch (_) {}
        setRecharging(false);
        return;
      }

      // ── Real Razorpay checkout ───────────────────────────────────────────────
      const options = {
        description:  'Wallet Recharge',
        image:        'https://astrology-i7c9.onrender.com/logo.png',
        currency:     orderRes.currency || 'INR',
        key:          orderRes.keyId,
        amount:       orderRes.amount,
        name:         settings?.appName || 'Astrovell',
        order_id:     orderRes.orderId,
        prefill: {
          name:    user?.name         || '',
          email:   user?.email        || '',
          contact: String(user?.contactNo || ''),
        },
        theme: { color: '#7c3aed' },
      };

      console.log('[Razorpay] Opening SDK Checkout with options:', options);

      RazorpayCheckout.open(options)
        .then(async (data) => {
          console.log('[Razorpay] Payment Success Callback:', data);
          try {
            const verifyRes = await dispatch(razorpayVerify({
              razorpay_order_id:   data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature:  data.razorpay_signature,
              paymentId,
            })).unwrap();
            console.log('[Razorpay] Verification Response:', verifyRes);
            if (verifyRes?.status === 200) {
              Alert.alert('Success! 🎉', verifyRes.message || `Wallet recharged with ${currencySymbol}${amount}`);
              dispatch(fetchWalletBalance());
              dispatch(fetchWalletTransactions({ startIndex: 0, fetchRecord: 100 }));
              if (user?.id) dispatch(getProfile(user.id));
            } else {
              Alert.alert('Verification Failed', 'Please contact support if amount was deducted.');
            }
          } catch (e) {
            console.error('[Razorpay] Verification Error:', e);
            Alert.alert('Verification Error', e?.message || 'Failed to verify payment');
          }
          setRecharging(false);
        })
        .catch(async (err) => {
          console.warn('[Razorpay] Checkout Error/Cancelled:', err);
          // Razorpay error codes:
          //   0 = Payment dismissed/cancelled by user → do NOT show error alert
          //   1 = Payment failed (network/bank error) → show error
          //   2 = Invalid options
          if (err?.code !== 0) {
            Alert.alert('Payment Failed', err?.description || 'Payment could not be completed. Please try again.');
          }
          // Notify server of cancellation in all cases
          try {
            await dispatch(cancelPayment({ paymentId }));
          } catch (e) {}
          setRecharging(false);
        });

    } catch (err) {
      console.error('[Razorpay] Global Error:', err);
      Alert.alert('Error', err?.message || 'Razorpay order creation failed');
      setRecharging(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const isLoading = balanceLoad && transactions.length === 0;

  const renderRecharge = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceAmount}>{currencySymbol}{parseFloat(balance).toFixed(2)}</Text>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceBadgeText}>💰 Astrovell Wallet</Text>
        </View>
      </View>

      {/* Gateway Selector */}
      {paymentConfig?.razorpay?.enabled && paymentConfig?.stripe?.enabled && (
        <View style={styles.gatewayRow}>
          <Text style={styles.gatewayLabel}>Pay via:</Text>
          {['razorpay', 'stripe'].map((gw) => (
            <TouchableOpacity
              key={gw}
              style={[styles.gwBtn, selectedGateway === gw && styles.gwBtnActive]}
              onPress={() => setSelectedGateway(gw)}
            >
              <Text style={[styles.gwBtnText, selectedGateway === gw && styles.gwBtnTextActive]}>
                {gw === 'razorpay' ? '🏦 Razorpay' : '💳 Stripe'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recharge Amounts */}
      <Text style={styles.sectionTitle}>Quick Recharge</Text>
      {rechargeLoad ? (
        <ActivityIndicator color={colors.gold} style={{ marginBottom: 20 }} />
      ) : (
        <View style={styles.rechargeGrid}>
          {rechargeAmounts.map((item, i) => (
            <TouchableOpacity
              key={item.id || i}
              style={[styles.rechargeCard, recharging && { opacity: 0.6 }]}
              onPress={() => !recharging && handleRecharge(item.amount, item.cashback)}
              disabled={recharging}
              activeOpacity={0.8}
            >
              <Text style={styles.rcAmount}>{currencySymbol}{item.amount}</Text>
              {parseFloat(item.cashback || 0) > 0 && (
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>+{currencySymbol}{item.cashback} bonus</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Custom Amount */}
      <Text style={styles.sectionTitle}>Custom Amount</Text>
      <View style={styles.customRow}>
        <View style={styles.customInputWrap}>
          <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
          <TextInput
            style={styles.customInput}
            value={customAmount}
            onChangeText={setCustomAmount}
            placeholder="Enter amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>
        <TouchableOpacity
          style={[styles.rechargeBtn, (!customAmount || recharging) && { opacity: 0.5 }]}
          onPress={() => handleRecharge()}
          disabled={!customAmount || recharging}
        >
          {recharging ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.rechargeBtnText}>Recharge</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Coupon Section */}
      <Text style={styles.sectionTitle}>Have a Coupon?</Text>
      {appliedCoupon ? (
        <View style={styles.couponApplied}>
          <Text style={styles.couponAppliedText}>
            ✅ {appliedCoupon.couponCode} — {currencySymbol}{appliedCoupon.discount} extra
          </Text>
          <TouchableOpacity onPress={handleRemoveCoupon}>
            <Text style={styles.couponRemove}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.couponRow}>
          <TextInput
            style={styles.couponInput}
            value={couponCode}
            onChangeText={(t) => setCouponCode(t.toUpperCase())}
            placeholder="Enter coupon code"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.couponBtn, couponLoad && { opacity: 0.6 }]}
            onPress={() => handleApplyCoupon()}
            disabled={couponLoad}
          >
            {couponLoad ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.couponBtnText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}

      <View style={{ height: 30 }} />
    </ScrollView>
  );

  const renderHistory = () => (
    <FlatList
      data={transactions}
      keyExtractor={(item, i) => item.id ? String(item.id) : String(i)}
      contentContainerStyle={styles.txnList}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={() => txnLoad ? (
        <ActivityIndicator color={colors.gold} style={{ marginVertical: 20 }} />
      ) : null}
      ListEmptyComponent={() => !txnLoad ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : null}
      renderItem={({ item }) => {
        const isCredit = String(item.isCredit) === '1';
        return (
          <View style={styles.txnCard}>
            <View style={[styles.txnIcon, { backgroundColor: isCredit ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
              <Text style={{ fontSize: 20 }}>{isCredit ? '⬆️' : '⬇️'}</Text>
            </View>
            <View style={styles.txnInfo}>
              <Text style={styles.txnRemark} numberOfLines={1}>
                {item.remark || item.transactionType || (isCredit ? 'Credit' : 'Debit')}
              </Text>
              <Text style={styles.txnDate}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={[styles.txnAmount, { color: isCredit ? colors.success : '#ef4444' }]}>
              {isCredit ? '+' : '-'}{currencySymbol}{parseFloat(item.amount || 0).toFixed(2)}
            </Text>
          </View>
        );
      }}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <Text style={styles.headerSub}>Balance & Recharge</Text>
        </View>
        <TouchableOpacity onPress={loadAll} style={styles.refreshBtn}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Row */}
      <View style={styles.tabRow}>
        {['recharge', 'history'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'recharge' ? '💳 Recharge' : '📋 History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Loading wallet…</Text>
        </View>
      ) : activeTab === 'recharge' ? renderRecharge() : renderHistory()}
    </View>
  );
};

export default WalletScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: 16,
    backgroundColor: colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn:      { padding: 8 },
  backIcon:     { color: colors.text, fontSize: 24 },
  headerTitle:  { color: colors.text, fontSize: 20, fontWeight: '800' },
  headerSub:    { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  refreshBtn:   { marginLeft: 'auto', padding: 8 },
  refreshIcon:  { color: colors.gold, fontSize: 22, fontWeight: '700' },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab:          { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: colors.gold },
  tabText:      { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive:{ color: colors.gold, fontWeight: '800' },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },

  scroll:      { padding: 20 },

  // Balance Card
  balanceCard: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  balanceLabel:  { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  balanceAmount: { color: colors.gold, fontSize: 42, fontWeight: '900', letterSpacing: -1, marginBottom: 12 },
  balanceBadge:  { backgroundColor: 'rgba(245,200,66,0.12)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: colors.borderGold },
  balanceBadgeText: { color: colors.gold, fontSize: 12, fontWeight: '700' },

  // Gateway
  gatewayRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  gatewayLabel:{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  gwBtn:       { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  gwBtnActive: { backgroundColor: colors.goldGlow, borderColor: colors.borderGold },
  gwBtnText:   { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  gwBtnTextActive: { color: colors.gold },

  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 14 },

  // Recharge grid
  rechargeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  rechargeCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  rcAmount:     { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  cashbackBadge:{ backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  cashbackText: { color: colors.success, fontSize: 11, fontWeight: '700' },

  // Custom amount
  customRow:       { flexDirection: 'row', gap: 12, marginBottom: 24 },
  customInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  currencyPrefix:  { color: colors.gold, fontSize: 18, fontWeight: '700', marginRight: 6 },
  customInput:     { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 14 },
  rechargeBtn:     { backgroundColor: colors.gold, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
  rechargeBtnText: { color: colors.primary, fontSize: 14, fontWeight: '800' },

  // Coupon
  couponRow:       { flexDirection: 'row', gap: 10, marginBottom: 8 },
  couponInput:     { flex: 1, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, color: colors.text, fontSize: 14 },
  couponBtn:       { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.borderGold, justifyContent: 'center' },
  couponBtnText:   { color: colors.gold, fontSize: 13, fontWeight: '700' },
  couponApplied:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', marginBottom: 8 },
  couponAppliedText:{ color: colors.success, fontSize: 13, fontWeight: '700', flex: 1 },
  couponRemove:    { color: '#ef4444', fontSize: 13, fontWeight: '700', marginLeft: 8 },
  couponError:     { color: '#ef4444', fontSize: 12, marginBottom: 12 },

  // Transactions
  txnList: { padding: 16, paddingBottom: 30, gap: 10 },
  txnCard:  { backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  txnIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txnInfo:  { flex: 1 },
  txnRemark:{ color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 3 },
  txnDate:  { color: colors.textMuted, fontSize: 11 },
  txnAmount:{ fontSize: 15, fontWeight: '800' },

  emptyWrap: { flex: 1, alignItems: 'center', paddingVertical: 80 },
  emptyEmoji:{ fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
