import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../api/apiClient';

// ─── Thunks ─────────────────────────────────────────────────────────────────

export const checkContactNumber = createAsyncThunk(
  'auth/checkContactNumber',
  async (contactNo, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/customer/checkContactNoExistForUser', {
        contactNo: Number(contactNo),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const loginWithOtp = createAsyncThunk(
  'auth/loginWithOtp',
  async ({ contactNo, otp }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/customer/loginAppUser', {
        contactNo: Number(contactNo),
        otp: String(otp),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await apiClient.post(
        '/api/customer/getProfile',
        { userId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      console.log('--- getProfile Response ---', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.log('--- getProfile FAILED ---', error.message);
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await apiClient.post(
        '/api/customer/user/updateProfile',
        profileData,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isLoggedIn: false,
    profileComplete: false,
    profileCheckLoading: false,   // true while getProfile is in-flight after login
    user: null,
    token: null,
    settings: null,        // Store systemFlag (AppName, Commissions, etc.)
    walletBalance: 0,
    contactNo: null,
    otpReceived: null,
    loading: false,
    profileLoading: false,
    updateLoading: false,
    error: null,
    profileError: null,
    updateError: null,
    globalLang: 'en',
  },
  reducers: {
    setContactNo: (state, action) => {
      state.contactNo = action.payload;
    },
    clearOtp: (state) => {
      state.otpReceived = null;
      state.error = null;
    },
    clearUpdateError: (state) => {
      state.updateError = null;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.profileComplete = false;
      state.profileCheckLoading = false;
      state.user = null;
      state.token = null;
      state.contactNo = null;
      state.otpReceived = null;
      state.error = null;
      state.profileError = null;
      state.updateError = null;
      // Clear persisted token from AsyncStorage
      AsyncStorage.removeItem('customerToken').catch(() => {});
    },
    setGlobalLang: (state, action) => {
      state.globalLang = action.payload;
      AsyncStorage.setItem('customerGlobalLang', action.payload).catch(() => {});
    },
  },
  extraReducers: (builder) => {
    builder
      // ── checkContactNumber ──────────────────────────────────────────────
      .addCase(checkContactNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkContactNumber.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.status === 200) {
          state.otpReceived = action.payload.otp;
        } else {
          state.error = action.payload.message || 'Failed to send OTP';
        }
      })
      .addCase(checkContactNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to send OTP';
      })

      // ── loginWithOtp ────────────────────────────────────────────────────
      .addCase(loginWithOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithOtp.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        if (payload.error === false && payload.status === 200) {
          const record = payload.recordList || {};
          state.isLoggedIn = true;
          state.user = record;
          state.token = payload.token || null;
          state.otpReceived = null;
          // Persist token to AsyncStorage so apiClient interceptor can read it
          if (payload.token) {
            AsyncStorage.setItem('customerToken', payload.token).catch(() => {});
          }
          // STEP 1: Sync profile completion state immediately on login
          state.profileComplete = Number(record.isProfileComplete) === 1;
          state.profileCheckLoading = !state.profileComplete; // Only load if incomplete
          console.log('--- AuthSlice [STEP 1]: Login Sync ---', { isProfileComplete: record.isProfileComplete, profileComplete: state.profileComplete });
        } else {
          state.error = payload.message || 'Login failed';
        }
      })
      .addCase(loginWithOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Login failed';
      })

      // ── getProfile ──────────────────────────────────────────────────────
      .addCase(getProfile.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profileCheckLoading = false;         // profile check done
        const payload = action.payload;
        if (payload.error === false && payload.status === 200) {
          state.user = payload.recordList;
          state.settings = payload.systemFlag || null;
          state.walletBalance = Number(payload.recordList?.totalWalletAmount || payload.totalWalletAmount || 0);
          
          // STEP 2: Finalize authoritative profile state from getProfile
          state.profileComplete = Number(payload.recordList?.isProfileComplete) === 1;
          state.profileCheckLoading = false; 
          console.log('--- AuthSlice [STEP 2]: Profile Finalized ---', { profileComplete: state.profileComplete });
        } else {
          state.profileError = payload.message || 'Failed to load profile';
          state.profileComplete = false;
          state.profileCheckLoading = false;
        }
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileCheckLoading = false;
        state.profileError = action.payload?.message || 'Failed to load profile';
        
        // If the token is explicitly invalid or expired, we must force a logout
        // to prevent a dead "zombie" session. Otherwise, for network errors, preserve state.
        const isAuthError = action.payload?.status === 401 ||
                            action.payload?.message?.toLowerCase().includes('token') ||
                            action.payload?.message?.toLowerCase().includes('unauthorized');
                            
        if (isAuthError) {
           console.log('--- AuthSlice: Token expired detected. Forcing logout. ---');
           state.isLoggedIn = false;
           state.token = null;
           state.user = null;
           state.profileComplete = false;
        } else {
           // For generic network errors: Do NOT reset profileComplete here.
           console.log('--- AuthSlice [STEP 2 FAILED]: getProfile rejected network error. Preserving profileComplete:', state.profileComplete);
        }
      })

      // ── updateProfile ───────────────────────────────────────────────────
      .addCase(updateProfile.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.updateLoading = false;
        const payload = action.payload;
        if (payload.error === false || payload.status === 200) {
          console.log('--- AuthSlice: updateProfile Success. Marking Complete ---');
          state.profileComplete = true;
          // Merge local updates into the user object
          if (state.user) {
            state.user = { ...state.user, ...action.meta.arg };
          }
        } else {
          state.updateError = payload.message || 'Update failed';
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload?.message || 'Update failed';
      })
      
      // ── Sync with WalletSlice ───────────────────────────────────────────
      // Keep auth slice's global walletBalance perfectly in sync with wallet slice's actions
      .addCase('wallet/fetchBalance/fulfilled', (state, action) => {
        const wallet = action.payload?.recordList || action.payload?.data;
        if (wallet) {
          state.walletBalance = Number(wallet.amount || 0);
          if (state.user) state.user.totalWalletAmount = state.walletBalance;
        }
      })
      .addCase('wallet/razorpayVerify/fulfilled', (state, action) => {
        if (action.payload?.walletBalance !== undefined) {
          state.walletBalance = Number(action.payload.walletBalance);
          if (state.user) state.user.totalWalletAmount = state.walletBalance;
        }
      })
      .addCase('wallet/setBalance', (state, action) => {
        state.walletBalance = Number(action.payload || 0);
        if (state.user) state.user.totalWalletAmount = state.walletBalance;
      });
  },
});

export const { setContactNo, clearOtp, clearUpdateError, logout, setGlobalLang } = authSlice.actions;

export default authSlice.reducer;
