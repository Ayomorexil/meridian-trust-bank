import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

// Toggle between live backend and mock data.
// VITE_USE_MOCK=true  -> use mock API
// VITE_USE_MOCK=false -> use real backend
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug logs (remove after testing)
console.log('=================================');
console.log('USE_MOCK:', USE_MOCK);
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('Axios Base URL:', api.defaults.baseURL);
console.log('=================================');

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log(
    `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
  );

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API ERROR]', error.response?.status, error.response?.data);

    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(
      error.response?.data || {
        message: 'Network error. Please try again.',
      }
    );
  }
);

export default api;
// import axios from 'axios';
// import { useAuthStore } from '../store/useAuthStore';

// // Toggle between a live backend and in-memory mock data — same pattern used
// // across the rest of Demi's projects (VITE_USE_MOCK=true|false).
// export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
// console.log("USE_MOCK:", USE_MOCK);
// console.log("API URL:", import.meta.env.VITE_API_URL);

// const api = axios.create({
//   baseURL: `${import.meta.env.VITE_API_URL}/api` || '/api',
// });

// console.log("API URL:", api.defaults.baseURL);

// api.interceptors.request.use((config) => {
//   const token = useAuthStore.getState().token;
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// api.interceptors.response.use(
//   (res) => res,
//   (err) => {
//     if (err.response?.status === 401) {
//       useAuthStore.getState().logout();
//     }
//     return Promise.reject(err.response?.data || { message: 'Network error. Please try again.' });
//   }
// );

// export default api;
