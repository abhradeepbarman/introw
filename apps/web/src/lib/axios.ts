import envConfig from '@/config/env';
import axios from 'axios';
import { toApiError } from './api-error';

const REFRESH_PATH = '/auth/refresh';
const ME_PATH = '/auth/me';

const axiosInstance = axios.create({
  baseURL: envConfig.API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let pendingRefresh: Promise<boolean> | null = null;

const refreshAccessToken = () => {
  pendingRefresh ??= axiosInstance
    .post(REFRESH_PATH)
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      pendingRefresh = null;
    });

  return pendingRefresh;
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url !== REFRESH_PATH
    ) {
      originalRequest._retry = true;

      if (await refreshAccessToken()) {
        return axiosInstance(originalRequest);
      }

      if (originalRequest.url !== ME_PATH) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(toApiError(error));
  },
);

export default axiosInstance;
