import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getHeaders = (getState) => {
  const token = getState().auth.token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchWalletBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/getWalletBalance', {}, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const fetchWalletTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (params = { startIndex: 0, fetchRecord: 50 }, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/getWalletTransactions', params, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const fetchRechargeAmounts = createAsyncThunk(
  'wallet/fetchRechargeAmounts',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/getRechargeAmount', {}, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const fetchPaymentConfig = createAsyncThunk(
  'wallet/fetchPaymentConfig',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/getPaymentConfig', {}, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const addPayment = createAsyncThunk(
  'wallet/addPayment',
  async (data, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/addpayment', data, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const razorpayCreateOrder = createAsyncThunk(
  'wallet/razorpayCreateOrder',
  async (data, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/razorpay/createOrder', data, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const razorpayVerify = createAsyncThunk(
  'wallet/razorpayVerify',
  async (data, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/razorpay/verify', data, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const cancelPayment = createAsyncThunk(
  'wallet/cancelPayment',
  async (data, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/cancelPayment', data, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

// Used by Expo Go simulation — marks payment success on server without needing
// a real Razorpay HMAC signature (signature validation is skipped server-side
// for the paymentSuccess endpoint, unlike razorpayVerify).
export const paymentSuccess = createAsyncThunk(
  'wallet/paymentSuccess',
  async (data, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/paymentSuccess', data, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const applyCoupon = createAsyncThunk(
  'wallet/applyCoupon',
  async (data, { getState, rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/applyCoupon', data, getHeaders(getState));
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    balance: 0,
    balanceLoad: false,

    transactions: [],
    txnLoad: false,
    txnErr: null,

    rechargeAmounts: [],
    rechargeLoad: false,

    paymentConfig: null,
    configLoad: false,

    // Payment flow
    paymentLoading: false,
    paymentError: null,

    // Coupon
    appliedCoupon: null,
    couponLoad: false,
    couponError: null,
  },
  reducers: {
    setBalance: (state, action) => {
      state.balance = action.payload;
    },
    clearAppliedCoupon: (state) => {
      state.appliedCoupon = null;
      state.couponError = null;
    },
    clearPaymentError: (state) => {
      state.paymentError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchWalletBalance
      .addCase(fetchWalletBalance.pending,   (s) => { s.balanceLoad = true; })
      .addCase(fetchWalletBalance.fulfilled, (s, a) => {
        s.balanceLoad = false;
        const wallet = a.payload?.recordList || a.payload?.data;
        if (wallet) s.balance = parseFloat(wallet.amount || 0);
      })
      .addCase(fetchWalletBalance.rejected,  (s) => { s.balanceLoad = false; })

      // fetchWalletTransactions
      .addCase(fetchWalletTransactions.pending,   (s) => { s.txnLoad = true; s.txnErr = null; })
      .addCase(fetchWalletTransactions.fulfilled, (s, a) => {
        s.txnLoad = false;
        const list = a.payload?.recordList || a.payload?.data || [];
        s.transactions = Array.isArray(list) ? list : [];
      })
      .addCase(fetchWalletTransactions.rejected,  (s, a) => {
        s.txnLoad  = false;
        s.txnErr   = a.payload?.message || 'Failed to load transactions';
      })

      // fetchRechargeAmounts
      .addCase(fetchRechargeAmounts.pending,   (s) => { s.rechargeLoad = true; })
      .addCase(fetchRechargeAmounts.fulfilled, (s, a) => {
        s.rechargeLoad = false;
        const list = a.payload?.recordList || a.payload?.data || [];
        s.rechargeAmounts = Array.isArray(list) ? list : [];
      })
      .addCase(fetchRechargeAmounts.rejected,  (s) => { s.rechargeLoad = false; })

      // fetchPaymentConfig
      .addCase(fetchPaymentConfig.pending,   (s) => { s.configLoad = true; })
      .addCase(fetchPaymentConfig.fulfilled, (s, a) => {
        s.configLoad = false;
        s.paymentConfig = a.payload;
      })
      .addCase(fetchPaymentConfig.rejected,  (s) => { s.configLoad = false; })

      // addPayment
      .addCase(addPayment.pending,   (s) => { s.paymentLoading = true; s.paymentError = null; })
      .addCase(addPayment.fulfilled, (s) => { s.paymentLoading = false; })
      .addCase(addPayment.rejected,  (s, a) => {
        s.paymentLoading = false;
        s.paymentError = a.payload?.message || 'Payment failed';
      })

      // razorpayVerify — update balance on success
      .addCase(razorpayVerify.fulfilled, (s, a) => {
        if (a.payload?.walletBalance !== undefined) {
          s.balance = parseFloat(a.payload.walletBalance);
        }
      })

      // applyCoupon
      .addCase(applyCoupon.pending,   (s) => { s.couponLoad = true; s.couponError = null; })
      .addCase(applyCoupon.fulfilled, (s, a) => {
        s.couponLoad = false;
        if (a.payload?.status === 200) {
          s.appliedCoupon = a.payload.coupon;
        } else {
          s.couponError = a.payload?.message || 'Invalid coupon';
        }
      })
      .addCase(applyCoupon.rejected,  (s, a) => {
        s.couponLoad  = false;
        s.couponError = a.payload?.message || 'Coupon error';
      });
  },
});

export const { setBalance, clearAppliedCoupon, clearPaymentError } = walletSlice.actions;
export default walletSlice.reducer;
