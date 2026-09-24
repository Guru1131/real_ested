import axios from 'axios';

// Base URL points to environment variable if configured, or relative path
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to resolve direct fallback URLs for PHP backends on live servers
const getFallbackUrls = (rawUrl, method = 'get') => {
  if (!rawUrl) return [];
  const fallbacks = [];
  const methodLower = method ? method.toLowerCase() : 'get';
  const [path, query] = rawUrl.split('?');
  const qStr = query ? `?${query}` : '';

  // 1. Specific mapping rules for REST routes -> PHP files
  if (path === '/api/announcements/admin' || path === 'api/announcements/admin') {
    fallbacks.push('/api/announcements/admin.php?action=admin');
    fallbacks.push('/backend/api/announcements/admin.php?action=admin');
  } else if (path === '/api/announcements' || path === 'api/announcements') {
    if (methodLower === 'post') {
      fallbacks.push('/api/announcements/create.php' + qStr);
      fallbacks.push('/backend/api/announcements/create.php' + qStr);
    } else {
      fallbacks.push('/api/announcements/index.php' + qStr);
      fallbacks.push('/backend/api/announcements/index.php' + qStr);
    }
  } else if (path === '/api/branches' || path === 'api/branches') {
    fallbacks.push('/api/branches/index.php' + qStr);
    fallbacks.push('/backend/api/branches/index.php' + qStr);
  } else if (path === '/api/properties' || path === 'api/properties') {
    if (methodLower === 'post') {
      fallbacks.push('/api/properties/create.php' + qStr);
      fallbacks.push('/backend/api/properties/create.php' + qStr);
    } else {
      fallbacks.push('/api/properties/index.php' + qStr);
      fallbacks.push('/backend/api/properties/index.php' + qStr);
    }
  } else if (path === '/api/users' || path === 'api/users') {
    fallbacks.push('/api/users/index.php' + qStr);
    fallbacks.push('/backend/api/users/index.php' + qStr);
  } else if (path === '/api/leads' || path === 'api/leads') {
    if (methodLower === 'post') {
      fallbacks.push('/api/leads/create.php' + qStr);
      fallbacks.push('/backend/api/leads/create.php' + qStr);
    } else if (methodLower === 'put') {
      fallbacks.push('/api/leads/update.php' + qStr);
      fallbacks.push('/backend/api/leads/update.php' + qStr);
    } else {
      fallbacks.push('/api/leads/index.php' + qStr);
      fallbacks.push('/backend/api/leads/index.php' + qStr);
    }
  } else if (path === '/api/users/brokers' || path === 'api/users/brokers') {
    fallbacks.push('/api/users/brokers.php' + qStr);
    fallbacks.push('/backend/api/users/brokers.php' + qStr);
  } else if (path === '/api/users/broker-staff' || path === 'api/users/broker-staff') {
    fallbacks.push('/api/users/broker_staff.php' + qStr);
    fallbacks.push('/backend/api/users/broker_staff.php' + qStr);
  } else if (path.includes('/api/users/broker/') && path.endsWith('/logs')) {
    const parts = path.split('/');
    const brokerId = parts[parts.indexOf('broker') + 1];
    fallbacks.push(`/api/users/broker_logs.php?broker_id=${brokerId}`);
    fallbacks.push(`/backend/api/users/broker_logs.php?broker_id=${brokerId}`);
  } else if (path === '/api/properties/check-rera' || path === 'api/properties/check-rera') {
    fallbacks.push('/api/properties/check_rera.php' + qStr);
    fallbacks.push('/backend/api/properties/check_rera.php' + qStr);
  } else if (path.includes('/api/properties/detail/')) {
    const param = path.split('/detail/')[1];
    const key = /^\d+$/.test(param) ? 'id' : 'slug';
    fallbacks.push(`/api/properties/detail.php?${key}=${param}`);
    fallbacks.push(`/backend/api/properties/detail.php?${key}=${param}`);
  } else if (path.includes('/api/properties/public/detail/')) {
    const slug = path.split('/public/detail/')[1];
    fallbacks.push(`/api/properties/detail.php?slug=${slug}`);
    fallbacks.push(`/backend/api/properties/detail.php?slug=${slug}`);
  } else if (path.includes('/api/properties/detail-by-id/')) {
    const id = path.split('/detail-by-id/')[1];
    fallbacks.push(`/api/properties/detail.php?id=${id}`);
    fallbacks.push(`/backend/api/properties/detail.php?id=${id}`);
  } else if (path.match(/\/api\/properties\/\d+\/submit$/)) {
    const parts = path.split('/');
    const id = parts[parts.length - 2];
    fallbacks.push(`/api/properties/submit.php?id=${id}`);
    fallbacks.push(`/backend/api/properties/submit.php?id=${id}`);
  } else if (path.match(/\/api\/properties\/\d+\/approve$/)) {
    const parts = path.split('/');
    const id = parts[parts.length - 2];
    fallbacks.push(`/api/properties/approve.php?id=${id}`);
    fallbacks.push(`/backend/api/properties/approve.php?id=${id}`);
  } else if (path.match(/\/api\/properties\/\d+\/share$/)) {
    const parts = path.split('/');
    const id = parts[parts.length - 2];
    fallbacks.push(`/api/properties/share.php?id=${id}`);
    fallbacks.push(`/backend/api/properties/share.php?id=${id}`);
  } else if (path.match(/\/api\/properties\/\d+$/)) {
    const id = path.split('/').pop();
    if (methodLower === 'put' || methodLower === 'post') {
      fallbacks.push(`/api/properties/update.php?id=${id}`);
      fallbacks.push(`/backend/api/properties/update.php?id=${id}`);
    } else {
      fallbacks.push(`/api/properties/index.php?id=${id}`);
      fallbacks.push(`/backend/api/properties/index.php?id=${id}`);
    }
  } else if (path.match(/\/api\/announcements\/\d+$/)) {
    const id = path.split('/').pop();
    if (methodLower === 'put') {
      fallbacks.push(`/api/announcements/update.php?id=${id}`);
      fallbacks.push(`/backend/api/announcements/update.php?id=${id}`);
    } else if (methodLower === 'delete') {
      fallbacks.push(`/api/announcements/delete.php?id=${id}`);
      fallbacks.push(`/backend/api/announcements/delete.php?id=${id}`);
    } else {
      fallbacks.push(`/api/announcements/index.php?id=${id}`);
      fallbacks.push(`/backend/api/announcements/index.php?id=${id}`);
    }
  } else if (path.match(/\/api\/branches\/\d+$/)) {
    const id = path.split('/').pop();
    fallbacks.push(`/api/branches/index.php?id=${id}`);
    fallbacks.push(`/backend/api/branches/index.php?id=${id}`);
  } else if (path.match(/\/api\/users\/\d+$/)) {
    const id = path.split('/').pop();
    fallbacks.push(`/api/users/index.php?id=${id}`);
    fallbacks.push(`/backend/api/users/index.php?id=${id}`);
  } else if (path.match(/\/api\/leads\/\d+\/status$/) || path.match(/\/api\/leads\/\d+$/)) {
    const parts = path.split('/');
    const id = parts[3];
    fallbacks.push(`/api/leads/index.php?id=${id}`);
    fallbacks.push(`/backend/api/leads/index.php?id=${id}`);
  } else if (path === '/api/leads/public' || path === 'api/leads/public') {
    fallbacks.push('/api/leads/create.php?public=1');
    fallbacks.push('/backend/api/leads/create.php?public=1');
  } else if (path === '/api/auth/login' || path === 'api/auth/login') {
    fallbacks.push('/api/auth/login.php');
    fallbacks.push('/backend/api/auth/login.php');
  } else if (path === '/api/auth/profile' || path === 'api/auth/profile') {
    fallbacks.push('/api/auth/profile.php');
    fallbacks.push('/backend/api/auth/profile.php');
  }

  // Generic fallback if path starts with /api/ and wasn't converted
  if (path.startsWith('/api/')) {
    const directBackend = path.replace('/api/', '/backend/api/') + qStr;
    if (!fallbacks.includes(directBackend)) {
      fallbacks.push(directBackend);
    }
  }

  return fallbacks;
};

// Interceptor to inject JWT Bearer Token before every request
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

// Interceptor to handle session expiration (401 errors) and transparent 404 URL fallbacks
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. Session Expiration (401)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // 2. 404 Route Fallback Logic for Live Server environments
    if (error.response && error.response.status === 404 && originalRequest && !originalRequest._retryFailed) {
      if (originalRequest._fallbackIndex === undefined) {
        originalRequest._fallbackCandidates = getFallbackUrls(originalRequest.url, originalRequest.method);
        originalRequest._fallbackIndex = 0;
      }

      if (originalRequest._fallbackCandidates && originalRequest._fallbackIndex < originalRequest._fallbackCandidates.length) {
        const nextUrl = originalRequest._fallbackCandidates[originalRequest._fallbackIndex];
        originalRequest._fallbackIndex += 1;
        originalRequest.url = nextUrl;
        
        try {
          return await api.request(originalRequest);
        } catch (retryErr) {
          // Continue loop if next retry also fails
          if (retryErr.response && retryErr.response.status === 404) {
            return Promise.reject(retryErr);
          }
        }
      } else {
        originalRequest._retryFailed = true;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

