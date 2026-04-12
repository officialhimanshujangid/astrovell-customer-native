import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer     from './slices/authSlice';
import homeReducer     from './slices/homeSlice';
import chatReducer     from './slices/chatSlice';
import walletReducer   from './slices/walletSlice';
import panchangReducer from './slices/panchangSlice';
import horoscopeReducer from './slices/horoscopeSlice';

// Only persist auth slice so login session survives app restarts
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'], // home, chat, wallet, panchang are transient
};

const rootReducer = combineReducers({
  auth:     authReducer,
  home:     homeReducer,
  chat:     chatReducer,
  wallet:   walletReducer,
  panchang: panchangReducer,
  horoscope: horoscopeReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
