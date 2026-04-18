import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://astrology-i7c9.onrender.com';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor — attach Bearer token and Language from AsyncStorage
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const [token, lang] = await Promise.all([
        AsyncStorage.getItem('customerToken'),
        AsyncStorage.getItem('customerGlobalLang')
      ]);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (lang) {
        config.headers['Accept-Language'] = lang;
        // Also inject into body payload dynamically (some backend APIs look for body.lang)
        if (config.data && typeof config.data === 'object' && !config.data.lang) {
          config.data.lang = lang;
        }
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} FAILED:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });
    return Promise.reject(error);
  }
);

export default apiClient;
