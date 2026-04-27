import Constants from 'expo-constants';
export const API_URL = Constants?.expoConfig?.extra?.apiUrl as string || process.env.API_URL || 'http://192.168.1.102:5000';
