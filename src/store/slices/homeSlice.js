import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/apiClient';

const BASE_IMG = 'https://astrology-i7c9.onrender.com/';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const imgUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;   // already absolute
  return `${BASE_IMG}${path}`;
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchAstrologers = createAsyncThunk(
  'home/fetchAstrologers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/astro/getAstrologer', {
        startIndex: 0,
        fetchRecord: 20,
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const fetchPujaCategories = createAsyncThunk(
  'home/fetchPujaCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/getPujaCategory', {});
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const fetchAstromallProducts = createAsyncThunk(
  'home/fetchAstromallProducts',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/getAstromallProduct', {});
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const fetchHoroscopeSign = createAsyncThunk(
  'home/fetchHoroscopeSign',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/getHororscopeSign', {});
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const fetchBanners = createAsyncThunk(
  'home/fetchBanners',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/customer/getBanner', {});
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

export const fetchBlogs = createAsyncThunk(
  'home/fetchBlogs',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/astro/getAppBlog', {});
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data || { message: e.message });
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const homeSlice = createSlice({
  name: 'home',
  initialState: {
    astrologers:      [],
    astrologersTotal: 0,
    astrologersLoad:  false,
    astrologersErr:   null,

    pujaCategories:   [],
    pujaLoad:         false,
    pujaErr:          null,

    astromallProducts: [],
    astromallLoad:     false,
    astromallErr:      null,

    horoscopeSigns:   [],
    signsLoad:        false,
    signsErr:         null,

    banners:          [],
    bannersLoad:      false,
    bannersErr:       null,

    blogs:            [],
    blogsLoad:        false,
    blogsErr:         null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // ── astrologers ────────────────────────────────────────────────────
      .addCase(fetchAstrologers.pending,   (s) => { s.astrologersLoad = true;  s.astrologersErr = null; })
      .addCase(fetchAstrologers.fulfilled, (s, a) => {
        s.astrologersLoad  = false;
        s.astrologers      = a.payload.recordList || [];
        s.astrologersTotal = a.payload.totalCount || 0;
      })
      .addCase(fetchAstrologers.rejected,  (s, a) => {
        s.astrologersLoad = false;
        s.astrologersErr  = a.payload?.message || 'Failed to load astrologers';
      })

      // ── puja categories ────────────────────────────────────────────────
      .addCase(fetchPujaCategories.pending,   (s) => { s.pujaLoad = true;  s.pujaErr = null; })
      .addCase(fetchPujaCategories.fulfilled, (s, a) => {
        s.pujaLoad       = false;
        s.pujaCategories = a.payload.recordList || [];
      })
      .addCase(fetchPujaCategories.rejected,  (s, a) => {
        s.pujaLoad = false;
        s.pujaErr  = a.payload?.message || 'Failed to load puja categories';
      })

      // ── astromall products ─────────────────────────────────────────────
      .addCase(fetchAstromallProducts.pending,   (s) => { s.astromallLoad = true;  s.astromallErr = null; })
      .addCase(fetchAstromallProducts.fulfilled, (s, a) => {
        s.astromallLoad     = false;
        s.astromallProducts = a.payload.recordList || [];
      })
      .addCase(fetchAstromallProducts.rejected,  (s, a) => {
        s.astromallLoad = false;
        s.astromallErr  = a.payload?.message || 'Failed to load products';
      })

      // ── horoscope signs ────────────────────────────────────────────────
      .addCase(fetchHoroscopeSign.pending,   (s) => { s.signsLoad = true;  s.signsErr = null; })
      .addCase(fetchHoroscopeSign.fulfilled, (s, a) => {
        s.signsLoad      = false;
        s.horoscopeSigns = a.payload.recordList || [];
      })
      .addCase(fetchHoroscopeSign.rejected,  (s, a) => {
        s.signsLoad = false;
        s.signsErr  = a.payload?.message || 'Failed to load signs';
      })

      // ── banners ────────────────────────────────────────────────────────
      .addCase(fetchBanners.pending,   (s) => { s.bannersLoad = true;  s.bannersErr = null; })
      .addCase(fetchBanners.fulfilled, (s, a) => {
        s.bannersLoad = false;
        // Only keep banners that have a non-empty image
        s.banners     = (a.payload.recordList || []).filter(b => b.bannerImage);
      })
      .addCase(fetchBanners.rejected,  (s, a) => {
        s.bannersLoad = false;
        s.bannersErr  = a.payload?.message || 'Failed to load banners';
      })

      // ── blogs ──────────────────────────────────────────────────────────
      .addCase(fetchBlogs.pending,   (s) => { s.blogsLoad = true;  s.blogsErr = null; })
      .addCase(fetchBlogs.fulfilled, (s, a) => {
        s.blogsLoad = false;
        s.blogs     = a.payload.recordList || [];
      })
      .addCase(fetchBlogs.rejected,  (s, a) => {
        s.blogsLoad = false;
        s.blogsErr  = a.payload?.message || 'Failed to load blogs';
      });
  },
});

export default homeSlice.reducer;
