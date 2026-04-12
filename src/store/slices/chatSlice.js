import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

// ─── Thunks ──────────────────────────────────────────────────────────────────

const getHeaders = (getState) => {
  const token = getState().auth.token;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const addChatRequest = createAsyncThunk(
  'chat/addChatRequest',
  async (data, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/customer/chatRequest/add', data, getHeaders(getState));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const addIntakeForm = createAsyncThunk(
  'chat/addIntakeForm',
  async (data, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/customer/chatRequest/addIntakeForm', data, getHeaders(getState));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const getIntakeForm = createAsyncThunk(
  'chat/getIntakeForm',
  async (data, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/customer/chatRequest/getIntakeForm', data, getHeaders(getState));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const getChatDetail = createAsyncThunk(
  'chat/getChatDetail',
  async (data, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/customer/chatRequest/getChatDetail', data, getHeaders(getState));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const getMessages = createAsyncThunk(
  'chat/getMessages',
  async (data, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/customer/chatRequest/getMessages', data, getHeaders(getState));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const getChatHistory = createAsyncThunk(
  'chat/getChatHistory',
  async (params, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/customer/getChatHistory', params, getHeaders(getState));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const getWalletBalance = createAsyncThunk(
  'chat/getWalletBalance',
  async (_, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/customer/getWalletBalance', {}, getHeaders(getState));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    history: [],
    historyLoad: false,
    historyErr: null,

    activeChat: null,
    activeSession: null,    // for ChatScreen resume card
    messages: [],
    messagesLoad: false,

    intakeLoading: false,
    requestLoading: false,

    walletBalance: 0,
    walletLoad: false,
  },
  reducers: {
    clearActiveChat: (state) => {
      state.activeChat = null;
      state.messages = [];
    },
    updateMessages: (state, action) => {
      const msg = action.payload;
      if (!state.messages.find(m => (m.id && m.id === msg.id) || (m._id && m._id === msg._id))) {
        state.messages.push(msg);
      }
    },
    // Update status of specific messages (sent → delivered → read)
    updateMessageStatus: (state, action) => {
      const { messageIds, status } = action.payload;
      state.messages = state.messages.map(m =>
        messageIds.includes(m.id) ? { ...m, status } : m
      );
    },
    // Store active session (for ChatScreen resume card)
    setActiveSession: (state, action) => {
      state.activeSession = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getChatHistory.pending, (s) => { s.historyLoad = true; })
      .addCase(getChatHistory.fulfilled, (s, a) => {
        s.historyLoad = false;
        s.history = a.payload.recordList || [];
      })
      .addCase(getChatHistory.rejected, (s, a) => {
        s.historyLoad = false;
        s.historyErr = a.payload?.message || 'Failed to load history';
      })
      .addCase(getChatDetail.fulfilled, (s, a) => {
        s.activeChat = a.payload.recordList || a.payload.data;
      })
      .addCase(getMessages.pending, (s) => { s.messagesLoad = true; })
      .addCase(getMessages.fulfilled, (s, a) => {
        s.messagesLoad = false;
        s.messages = a.payload.recordList || a.payload.data || [];
      })
      .addCase(getMessages.rejected, (s) => { s.messagesLoad = false; })
      .addCase(addIntakeForm.pending, (s) => { s.intakeLoading = true; })
      .addCase(addIntakeForm.fulfilled, (s) => { s.intakeLoading = false; })
      .addCase(addIntakeForm.rejected, (s) => { s.intakeLoading = false; })
      .addCase(addChatRequest.pending, (s) => { s.requestLoading = true; })
      .addCase(addChatRequest.fulfilled, (s) => { s.requestLoading = false; })
      .addCase(addChatRequest.rejected, (s) => { s.requestLoading = false; })
      .addCase(getWalletBalance.fulfilled, (s, a) => {
        const payload = a.payload;
        const wallet = payload.recordList || payload.data;
        s.walletBalance = parseFloat(wallet?.amount || 0);
      });
  },
});

export const { clearActiveChat, updateMessages, updateMessageStatus, setActiveSession } = chatSlice.actions;
export default chatSlice.reducer;
