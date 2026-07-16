// src/lib/laravelApi.js
import axios from 'axios';

const LARAVEL_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007/api';

const laravelApi = axios.create({
  baseURL: LARAVEL_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// Interceptor: Tự động thêm token
laravelApi.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    console.log(`🚀 [Laravel API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Interceptor: Xử lý response
laravelApi.interceptors.response.use(
  (response) => {
    console.log(`✅ [Laravel API] ${response.config.url} -> ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ [Laravel API] Error:`, error.response?.status, error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default laravelApi;