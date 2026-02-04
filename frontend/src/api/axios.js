import axios from 'axios';

const apiHost = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`;
export const baseURL = apiHost.replace(/\/$/, "");
export const wsURL = baseURL.replace(/^http/, 'ws');

const api = axios.create({
    baseURL: baseURL,
    withCredentials: true,
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

// Handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only redirect to login if the error isn't from the login/auth stage itself
        const url = error.config?.url || '';
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
