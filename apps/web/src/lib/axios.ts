import envConfig from '@/config/env';
import axios from 'axios';
import { toApiError } from './api-error';

const axiosInstance = axios.create({
  baseURL: envConfig.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshAccessToken = async () => {
  try {
    const response = await axios.post(
      `${envConfig.API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const { access_token: accessToken } = response.data.data;

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
      localStorage.setItem('user', JSON.stringify({ ...user, access_token: accessToken }));
    }

    return accessToken;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    localStorage.removeItem('user');
    window.location.href = '/login';
    return null;
  }
};

axiosInstance.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user')!);
    const accessToken = user?.access_token;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      }
    }

    return Promise.reject(toApiError(error));
  },
);

export default axiosInstance;
