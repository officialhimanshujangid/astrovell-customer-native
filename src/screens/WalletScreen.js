import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  FlatList, ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  clearAppliedCoupon,
} from '../store/slices/walletSlice';
import { getProfile } from '../store/slices/authSlice';
import { colors } from '../theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

// cashback field from DB IS the percentage directly (e.g. 100, 10, 12, 20)
const cashbackLabel = (cashbackPct) => {
  const pct = parseFloat(cashbackPct || 0);
  if (!pct) return null;
  return `${pct}% Extra`;
};

// actual extra rupees = amount × (cashbackPct / 100)
const cashbackRupees = (amount, cashbackPct) => {
  const a   = parseFloat(amount     || 0);
  const pct = parseFloat(cashbackPct || 0);
  return Math.round(a * pct / 100);
};

// ─── Razorpay helper (used inside RechargeView) ───────────────────────────────
const runRazorpay = async ({ paymentId, amount, dispatch, user, settings, currencySymbol, onDone }) => {
  try {
    const orderRes = await dispatch(razorpayCreateOrder({ amount, paymentId })).unwrap();
    if (!settings?.razorpayKeyId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Razorpay is not configured. Please contact support.' });
      onDone(); return;
    }

    let RazorpayCheckout;
    try { const M = require('react-native-razorpay'); RazorpayCheckout = M.default || M; } catch (_) {}

    const onPaymentSuccess = async (data) => {
      try {
        const v = await dispatch(razorpayVerify({ razorpay_order_id: data.razorpay_order_id, razorpay_payment_id: data.razorpay_payment_id, razorpay_signature: data.razorpay_signature, paymentId })).unwrap();
        if (v?.status === 200) {
          Toast.show({ type: 'success', text1: 'Success! 🎉', text2: v.message || 'Wallet recharged!' });
          
          Notifications.scheduleNotificationAsync({
            content: {
              title: "Payment Received! 💸",
              body: `Awesome! You added ${currencySymbol}${amount} to your wallet.`,
              sound: true,
            },
            trigger: null,
          });

          dispatch(fetchWalletBalance());
          dispatch(fetchWalletTransactions({ startIndex: 0, fetchRecord: 100 }));
          if (user?.id) dispatch(getProfile(user.id));
        } else { Toast.show({ type: 'error', text1: 'Verification Failed', text2: 'Contact support if deducted.' }); }
      } catch (e) { Toast.show({ type: 'error', text1: 'Verification Error', text2: e?.message || 'Failed' }); }
      onDone();
    };

    if (Platform.OS === 'android' && !Platform.isTV) {
      if (!RazorpayCheckout) {
        Toast.show({ type: 'info', text1: '⚠️ Payment SDK Not Available', text2: 'This feature requires a native build. Using simulator mode.' });
        setTimeout(() => {
          onPaymentSuccess({ razorpay_payment_id: 'sim_123', razorpay_order_id: 'sim_order_123', paymentId });
        }, 1500);
        return;
      }
    }

    if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
      Toast.show({ type: 'error', text1: 'Payment Error', text2: 'Razorpay SDK unavailable. Please reinstall the app.' });
      try { await dispatch(cancelPayment({ paymentId })); } catch (_) {}
      onDone(); return;
    }

    RazorpayCheckout.open({
      description: 'Wallet Recharge',
      currency: orderRes.currency || 'INR',
      key: orderRes.keyId,
      amount: orderRes.amount,
      name: settings?.appName || 'Astrologer App',
      order_id: orderRes.orderId,
      prefill: { name: user?.name || '', email: user?.email || '', contact: String(user?.contactNo || '') },
      theme: { color: '#FFCC00' },
    }).then(onPaymentSuccess).catch(async (err) => {
      if (err?.code !== 0) Toast.show({ type: 'error', text1: 'Payment Failed', text2: err?.description || 'Could not complete payment.' });
      try { await dispatch(cancelPayment({ paymentId })); } catch (_) {}
      onDone();
    });
  } catch (err) {
    Toast.show({ type: 'error', text1: 'Error', text2: err?.message || 'Razorpay order creation failed' });
    onDone();
  }
};

// ─── Recharge View ────────────────────────────────────────────────────────────
const RechargeView = ({ onBack, onGoHistory, balance, currencySymbol, settings, rechargeAmounts, rechargeLoad, paymentConfig, user, dispatch }) => {
  const [amount, setAmount]           = useState('');
  const [selectedId, setSelectedId]   = useState(null);
  const [recharging, setRecharging]   = useState(false);
  const [selectedGateway, setSelectedGateway] = useState('razorpay');

  // Auto-select first item on load
  useEffect(() => {
    if (rechargeAmounts.length > 0 && !selectedId) {
      const first = rechargeAmounts[0];
      setSelectedId(first.id);
      setAmount(String(first.amount));
    }
  }, [rechargeAmounts]);

  useEffect(() => {
    if (paymentConfig?.activeMode === 'Stripe') setSelectedGateway('stripe');
  }, [paymentConfig]);

  const selectOption = (item) => {
    setSelectedId(item.id);
    setAmount(String(item.amount));
  };

  const handleProceed = async () => {
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) { Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter or select a valid amount' }); return; }

    // Find matching plan to get cashback %
    const plan      = rechargeAmounts.find(r => String(r.amount) === String(numAmt));
    const cashPct   = parseFloat(plan?.cashback || 0);
    // Compute actual bonus rupees from the % stored in DB
    const cashRupee = cashbackRupees(numAmt, cashPct);

    setRecharging(true);
    try {
      const res = await dispatch(addPayment({
        amount: numAmt,
        cashback_amount: cashRupee,   // actual extra rupees, not %
        payment_for: 'wallet',
        paymentMode: selectedGateway,
      })).unwrap();

      if (res?.status !== 200) {
        Toast.show({ type: 'error', text1: 'Error', text2: res?.message || 'Payment initiation failed' });
        setRecharging(false);
        return;
      }

      if (selectedGateway === 'razorpay') {
        await runRazorpay({ paymentId: res.paymentId, amount: res.amount || numAmt, dispatch, user, settings, currencySymbol, onDone: () => setRecharging(false) });
      } else {
        Toast.show({ type: 'info', text1: 'Info', text2: 'Stripe is not supported in the mobile app yet.' });
        setRecharging(false);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err?.message || 'Payment failed' });
      setRecharging(false);
    }
  };

  // Promo banner: find item with highest cashback % that has actual extra rupees
  const bestPlan = rechargeAmounts.reduce((best, r) => {
    const pct = parseFloat(r.cashback || 0);
    return pct > (best ? parseFloat(best.cashback || 0) : -1) ? r : best;
  }, null);
  const promoText = bestPlan && parseFloat(bestPlan.cashback || 0) > 0
    ? `Get ${currencySymbol}${cashbackRupees(bestPlan.amount, bestPlan.cashback)} Extra on ${currencySymbol}${bestPlan.amount} recharge!`
    : null;

  const numAmt = parseFloat(amount) || 0;

  // Build 3-column grid rows
  const COLS = 3;
  const rows = [];
  for (let i = 0; i < rechargeAmounts.length; i += COLS) {
    rows.push(rechargeAmounts.slice(i, i + COLS));
  }

  return (
    <View style={S.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={S.header}>
        <TouchableOpacity onPress={onBack} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>My Wallet</Text>
        <TouchableOpacity onPress={onGoHistory} style={S.balancePill}>
          <MaterialCommunityIcons name="wallet-outline" size={13} color="#1A1A1A" />
          <Text style={S.balancePillTxt}>{currencySymbol}{parseFloat(balance || 0).toFixed(0)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Amount Input ── */}
        <View style={S.amtBox}>
          <Text style={S.amtLabel}>Enter Amount</Text>
          <View style={S.amtRow}>
            <TextInput
              style={S.amtInput}
              value={amount}
              onChangeText={(t) => { setAmount(t.replace(/[^0-9]/g, '')); setSelectedId(null); }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#BBBBBB"
            />
            <TouchableOpacity style={S.quickBtn} onPress={() => { const v = numAmt + 50; setAmount(String(v)); setSelectedId(null); }}>
              <Text style={S.quickBtnTxt}>+ {currencySymbol}50</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.quickBtn} onPress={() => { const v = numAmt + 100; setAmount(String(v)); setSelectedId(null); }}>
              <Text style={S.quickBtnTxt}>+ {currencySymbol}100</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Promo Banner ── */}
        {promoText ? (
          <View style={S.promoBanner}>
            <Text style={S.promoIcon}>⚡</Text>
            <Text style={S.promoTxt}>{promoText}</Text>
          </View>
        ) : null}

        {/* ── Recharge Grid ── */}
        {rechargeLoad ? (
          <ActivityIndicator color={colors.gold} style={{ marginVertical: 24 }} />
        ) : (
          <View style={S.gridWrap}>
            {rows.map((row, ri) => (
              <View key={ri} style={S.gridRow}>
                {row.map((item, ci) => {
                  const isSelected  = selectedId === item.id || (!selectedId && String(amount) === String(item.amount));
                  const label       = cashbackLabel(item.cashback);
                  const isPopular   = !!(item.isMostPopular || item.mostPopular);
                  const isLast      = ci === row.length - 1;
                  const isLastRow   = ri === rows.length - 1;
                  return (
                    <TouchableOpacity
                      key={item.id || ci}
                      style={[
                        S.cell,
                        !isLast      && S.cellBorderRight,
                        !isLastRow   && S.cellBorderBottom,
                        isSelected   && S.cellSelected,
                      ]}
                      onPress={() => selectOption(item)}
                      activeOpacity={0.75}
                    >
                      {isPopular && (
                        <View style={S.popularBadge}>
                          <Text style={S.popularTxt}>Most Popular</Text>
                        </View>
                      )}
                      <Text style={S.cellAmt}>{currencySymbol}{item.amount}</Text>
                      {label ? (
                        <View style={S.extraBadge}>
                          <Text style={S.extraTxt}>{label}</Text>
                        </View>
                      ) : (
                        <View style={S.extraBadgePlaceholder} />
                      )}
                    </TouchableOpacity>
                  );
                })}
                {/* Fill empty cells in the last row */}
                {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, ei) => (
                  <View key={`e${ei}`} style={[S.cell, S.cellEmpty]} />
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Sticky Proceed ── */}
      <View style={S.proceedBar}>
        <TouchableOpacity
          style={[S.proceedBtn, (!amount || recharging) && { opacity: 0.5 }]}
          onPress={handleProceed}
          disabled={!amount || recharging}
          activeOpacity={0.88}
        >
          {recharging
            ? <ActivityIndicator color="#1A1A1A" />
            : <Text style={S.proceedTxt}>Proceed</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Transaction History View ─────────────────────────────────────────────────
const HistoryView = ({ onBack, onGoRecharge, balance, currencySymbol, transactions, txnLoad }) => {
  const [subTab,   setSubTab]   = useState('transactions');
  const [expanded, setExpanded] = useState(false);

  const filtered = (() => {
    if (subTab === 'expiring')     return transactions.filter(t => (t.transactionType || t.remark || '').toLowerCase().includes('expir'));
    if (subTab === 'payment_logs') return transactions.filter(t => {
      const tag = (t.transactionType || t.remark || '').toLowerCase();
      return tag.includes('recharge') || tag.includes('cashback') || tag.includes('payment') || String(t.isCredit) === '1';
    });
    return transactions;
  })();

  const copyTxnId = (id) => {
    try {
      const { Clipboard } = require('react-native');
      Clipboard.setString(String(id));
      Toast.show({ type: 'success', text1: 'Copied', text2: 'Transaction ID copied' });
    } catch (_) {}
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={S.header}>
        <TouchableOpacity onPress={onBack} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Wallet History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Balance + Recharge Row */}
      <View style={S.histBalRow}>
        <View>
          <Text style={S.histBalLabel}>Available Balance</Text>
          <Text style={S.histBalAmt}>{currencySymbol} {parseFloat(balance || 0).toFixed(1)}</Text>
        </View>
        <TouchableOpacity style={S.rcBtn} onPress={onGoRecharge} activeOpacity={0.85}>
          <Text style={S.rcBtnTxt}>Recharge</Text>
        </TouchableOpacity>
      </View>

      {/* Balance Breakdown toggle */}
      <TouchableOpacity style={S.breakdown} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <MaterialCommunityIcons name="wallet-outline" size={14} color="#555" />
        <Text style={S.breakdownTxt}>View Balance Breakdown</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#555" />
      </TouchableOpacity>
      {expanded && (
        <View style={S.breakdownBody}>
          <Text style={S.breakdownItem}>Main Balance: {currencySymbol}{parseFloat(balance || 0).toFixed(2)}</Text>
        </View>
      )}

      {/* Sub-tab Pills */}
      <View style={S.pilRow}>
        {[
          { key: 'transactions',  label: 'Transactions'  },
          { key: 'payment_logs',  label: 'Payment Logs'  },
          { key: 'expiring',      label: 'Expiring'      },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[S.pill, subTab === tab.key && S.pillActive]}
            onPress={() => setSubTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[S.pillTxt, subTab === tab.key && S.pillTxtActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {txnLoad && transactions.length === 0 ? (
        <View style={S.centered}><ActivityIndicator size="large" color={colors.gold} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => item.id ? String(item.id) : String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={() => (
            <View style={S.emptyWrap}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
              <Text style={S.emptyTxt}>No transactions found</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isCredit = String(item.isCredit) === '1';
            const txnId    = item.transactionId || item.txnId || item.id;
            const remark   = item.remark || item.transactionType || (isCredit ? 'Credit' : 'Debit');

            return (
              <View style={S.txnCard}>
                <View style={S.txnTop}>
                  <Text style={S.txnRemark} numberOfLines={2}>{remark}</Text>
                  <Text style={[S.txnAmt, { color: isCredit ? '#16A34A' : '#DC2626' }]}>
                    {isCredit ? '+' : '-'}{currencySymbol} {parseFloat(item.amount || 0).toFixed(1)}
                  </Text>
                </View>
                <Text style={S.txnDate}>{fmtDate(item.created_at)}</Text>
                {txnId ? (
                  <TouchableOpacity style={S.txnIdRow} onPress={() => copyTxnId(txnId)} activeOpacity={0.7}>
                    <Text style={S.txnId}>#{txnId}</Text>
                    <Ionicons name="copy-outline" size={12} color="#888" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

// ─── Main wrapper ─────────────────────────────────────────────────────────────
const WalletScreen = ({ onBack, initialTab = 'recharge' }) => {
  const dispatch = useDispatch();
  const { user, settings } = useSelector((s) => s.auth);
  const { balance, balanceLoad, transactions, txnLoad, rechargeAmounts, rechargeLoad, paymentConfig } = useSelector((s) => s.wallet);
  const currencySymbol = settings?.currencySymbol || '₹';
  const [view, setView] = useState(initialTab);

  useEffect(() => {
    dispatch(fetchWalletBalance());
    dispatch(fetchRechargeAmounts());
    dispatch(fetchWalletTransactions({ startIndex: 0, fetchRecord: 100 }));
    dispatch(fetchPaymentConfig());
  }, []);

  if (view === 'history') {
    return (
      <HistoryView
        onBack={onBack}
        onGoRecharge={() => setView('recharge')}
        balance={balance}
        currencySymbol={currencySymbol}
        transactions={transactions}
        txnLoad={txnLoad}
      />
    );
  }

  return (
    <RechargeView
      onBack={onBack}
      onGoHistory={() => setView('history')}
      balance={balance}
      currencySymbol={currencySymbol}
      settings={settings}
      rechargeAmounts={rechargeAmounts}
      rechargeLoad={rechargeLoad}
      paymentConfig={paymentConfig}
      user={user}
      dispatch={dispatch}
    />
  );
};

export default WalletScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8F8F8' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  balancePillTxt: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  scroll: { paddingTop: 16, paddingBottom: 20 },

  // Amount Input block (resting on the main background with a bottom separator)
  amtBox: {
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#EAEAEA',
    marginBottom: 16,
  },
  amtLabel: { fontSize: 13, color: '#777777', fontWeight: '700', marginBottom: 10 },
  amtRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amtInput: {
    flex: 1, fontSize: 38, fontWeight: '800', color: '#1A1A1A',
    paddingVertical: 0,
  },
  quickBtn: {
    borderWidth: 1, borderColor: '#D4D4D4', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF',
  },
  quickBtnTxt: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  // Promo banner
  promoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFDE7', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#FDE047',
    marginHorizontal: 16, marginBottom: 16,
  },
  promoIcon: { fontSize: 16, color: '#FFCC00' },
  promoTxt:  { flex: 1, fontSize: 13, fontWeight: '600', color: '#1A1A1A' },

  // Grid
  gridWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#EAEAEA',
    marginHorizontal: 16,
    overflow: 'hidden', // to naturally curve the cell corners
  },
  gridRow: { flexDirection: 'row' },
  cell: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, paddingHorizontal: 4,
    position: 'relative', backgroundColor: '#FFFFFF',
    minHeight: 85,
  },
  // We use actual borders so we don't need margin hacks that break corners
  cellBorderRight:  { borderRightWidth: 1,  borderRightColor:  '#F0F0F0' },
  cellBorderBottom: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cellSelected: {
    borderWidth: 2, borderColor: '#EAB308',
    backgroundColor: '#FEFCE8',
    margin: -1, zIndex: 10, // negative margin pops the border over the separator lines
    borderRadius: 4,
  },
  cellEmpty: { backgroundColor: 'transparent' },

  popularBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: '#EF4444', borderRadius: 20,
    paddingHorizontal: 6, paddingVertical: 2,
    zIndex: 20,
  },
  popularTxt:  { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

  cellAmt:     { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  extraBadge:  { backgroundColor: '#DCFCE7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  extraTxt:    { fontSize: 10, fontWeight: '800', color: '#16A34A' },
  extraBadgePlaceholder: { height: 18 },

  // Proceed
  proceedBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#F8F8F8', paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  proceedBtn: {
    backgroundColor: colors.gold, borderRadius: 50,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  proceedTxt: { fontSize: 16, fontWeight: '900', color: '#1A1A1A' },

  // History
  histBalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  histBalLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 2 },
  histBalAmt:   { fontSize: 28, fontWeight: '900', color: '#1A1A1A' },
  rcBtn: {
    backgroundColor: colors.gold, borderRadius: 8,
    paddingHorizontal: 18, paddingVertical: 9,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  rcBtnTxt: { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },

  breakdown: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F5F5', paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  breakdownTxt:  { flex: 1, fontSize: 13, fontWeight: '600', color: '#555' },
  breakdownBody: { backgroundColor: '#FAFAFA', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  breakdownItem: { fontSize: 13, color: '#1A1A1A', fontWeight: '600' },

  // Sub-tab pills
  pilRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    paddingHorizontal: 10, paddingVertical: 8, gap: 6,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 30, backgroundColor: '#F0F0F0',
  },
  pillActive: { backgroundColor: '#1A1A1A' },
  pillTxt:    { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: '#FFFFFF', fontWeight: '700' },

  // Transactions
  txnCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  txnTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  txnRemark: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginRight: 10 },
  txnAmt:    { fontSize: 14, fontWeight: '800' },
  txnDate:   { fontSize: 11, color: '#888', marginBottom: 3 },
  txnIdRow:  { flexDirection: 'row', alignItems: 'center' },
  txnId:     { fontSize: 11, color: '#888' },
  txnActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  viewChatBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#DDDDDD',
    borderRadius: 6, paddingVertical: 7, alignItems: 'center',
  },
  viewChatTxt: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  chatAgainBtn: {
    flex: 1, backgroundColor: colors.gold,
    borderRadius: 6, paddingVertical: 7, alignItems: 'center',
  },
  chatAgainTxt: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyWrap: { alignItems: 'center', paddingVertical: 80 },
  emptyTxt:  { color: '#888', fontSize: 14 },
});
