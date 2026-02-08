import axios from 'axios';

// Force local backend if running on localhost to avoid connecting to production from local dev
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const apiHost = isLocal
    ? `http://${window.location.hostname}:8000`
    : (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`);

export const baseURL = apiHost.replace(/\/$/, "");
export const wsURL = baseURL.replace(/^http/, 'ws').replace(/^https/, 'wss');

const api = axios.create({
    baseURL: baseURL,
    withCredentials: true,
    timeout: 120000, // 2 minutes timeout to handle cold starts
    headers: {
        'X-CSRF-Token': 'fetch', // Placeholder to satisfy middleware
        'X-Requested-With': 'XMLHttpRequest'
    }
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle responses, errors, and retries
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Retry logic for timeouts or network errors
        // specifically targeting idempotent requests or known safe POSTs like login if needed,
        // but here we generalize for network/server availability issues.
        if (
            originalRequest &&
            !originalRequest._retry &&
            (error.code === 'ECONNABORTED' || error.message.includes('Network Error') || error.response?.status >= 500)
        ) {
            originalRequest._retry = true;
            originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

            if (originalRequest._retryCount <= 2) {
                // Wait 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log(`Retrying request attempt ${originalRequest._retryCount}...`);
                return api(originalRequest);
            }
        }

        // Only redirect to login if the error isn't from the login/auth stage itself
        const url = originalRequest?.url || '';
        const isAuthFlow = url.includes('/api/auth/login') ||
            url.includes('/api/auth/2fa/verify') ||
            url.includes('/api/auth/2fa/setup/finalize');

        if (error.response?.status === 401 && !isAuthFlow) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Check if we are already on the login page to avoid infinite loop
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
