import axios from 'axios';
import { API_URL } from '@/constants/Config';
import { Alert } from 'react-native';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15s timeout
});

// Basit online fallback (expo-network kur: npx expo install expo-network)
const isOnline = async () => true;

// Retry logic
const retryRequest = async (originalRequest: any, retries = 3) => {
  if (retries === 0) throw new Error('Max retries exceeded');

  try {
    const online = await isOnline();
    if (!online) {
      Alert.alert('Bağlantı Hatası', 'İnternet bağlantınızı kontrol edin.');
      throw new Error('No internet');
    }

    return api(originalRequest);
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      Alert.alert('Zaman Aşımı', 'Sunucu yanıt vermiyor. Yeniden deneyin.');
    }
    return retryRequest(originalRequest, retries - 1);
  }
};

// Request interceptor
api.interceptors.request.use((config) => {
  // Headers/auth ekle
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    if (error.response?.status === 404) {
      Alert.alert('Bulunamadı', 'İstediğiniz veri mevcut değil.');
    } else if (error.response?.status === 500) {
      Alert.alert('Sunucu Hatası', 'Backend sorunu. Yeniden deneyin.');
    } else if (error.message === 'Network Error') {
      Alert.alert('Ağ Hatası', 'Sunucuya ulaşılamıyor.');
    } else if (!error.response) {
      Alert.alert('Bağlantı Sorunu', 'Sunucu yanıt vermiyor.');
    }

    // Specific retry for 5xx
    if (error.response?.status >= 500 && error.config) {
      return retryRequest(error.config, 2);
    }

    return Promise.reject(error);
  }
);

export default api;

