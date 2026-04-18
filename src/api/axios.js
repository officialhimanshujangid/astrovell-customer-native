import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://astrology-i7c9.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

API.interceptors.request.use(
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
        if (config.data && typeof config.data === 'object' && !config.data.lang && !(config.data instanceof FormData)) {
          config.data.lang = lang;
        }
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
