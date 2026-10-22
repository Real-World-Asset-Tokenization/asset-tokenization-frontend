import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) =>
    api.post('/auth/register', data),

  login: (data) =>
    api.post('/auth/login', data),

  getAllUsers: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return api.get('/auth/users', {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  updateWallet: (walletAddress) =>
    api.put('/auth/wallet', { walletAddress }),
  checkWallet: (walletAddress) =>
    api.get(`/auth/wallet/check/${walletAddress}`),

  getMe: () =>
    api.get('/auth/me'),
};

export const kycAPI = {
  uploadDocument: (formData) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Uploading document to:', `${API_URL}/kyc/upload-document`);
    console.log('User token:', user.token ? 'Present' : 'Missing');
    return axios.post(`${API_URL}/kyc/upload-document`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  uploadSelfie: (formData) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Uploading selfie to:', `${API_URL}/kyc/upload-selfie`);
    console.log('User token:', user.token ? 'Present' : 'Missing');
    return axios.post(`${API_URL}/kyc/upload-selfie`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  verifyKYC: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.post(`${API_URL}/kyc/verify`, {}, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  getKYCStatus: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Fetching KYC status from:', `${API_URL}/kyc/status`);
    console.log('User token:', user.token ? 'Present' : 'Missing');
    return axios.get(`${API_URL}/kyc/status`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  runPipeline: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Running pipeline at:', `${API_URL}/pipeline/verify`);
    console.log('User token:', user.token ? 'Present' : 'Missing');
    return axios.post(`${API_URL}/pipeline/verify`, {}, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  // Admin APIs
  getKYCDetailsByUserId: (userId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.get(`${API_URL}/kyc/admin/details/${userId}`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  updateKYCStatus: (userId, data) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.put(`${API_URL}/kyc/admin/status/${userId}`, data, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  // Asset APIs
  uploadAsset: (formData) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.post(`${API_URL}/assets/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  getUserAssets: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.get(`${API_URL}/assets/my-assets`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  verifyAsset: (assetId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.post(`${API_URL}/assets/verify/${assetId}`, {}, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  tokenizeAsset: (assetId, data = {}) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.post(`${API_URL}/assets/${assetId}/tokenize`, data, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  getAssetStatus: (assetId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.get(`${API_URL}/assets/status/${assetId}`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  getAllAssets: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.get(`${API_URL}/assets/admin/all`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  getAssetDetails: (assetId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.get(`${API_URL}/assets/admin/details/${assetId}`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },

  updateAssetStatus: (assetId, data) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return axios.put(`${API_URL}/assets/admin/status/${assetId}`, data, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
  },
};

// Off-chain signed sell orders and full-property sales (the token is attached by the interceptor above).
export const ordersAPI = {
  list: (assetId) => api.get("/orders", { params: assetId != null ? { assetId } : {} }),
  create: (order, signature) => api.post("/orders", { order, signature }),
  cancel: (orderHash) => api.post(`/orders/${orderHash}/cancel`),
  stale: () => api.get("/orders/stale"),
};

export const salesAPI = {
  list: () => api.get("/sales"),
  get: (offerId, address) => api.get(`/sales/${offerId}`, { params: address ? { address } : {} }),
  vote: (offerId, support, signature) => api.post(`/sales/${offerId}/votes`, { support, signature }),
  payout: (offerId, address) => api.get(`/sales/${offerId}/payout/${address}`),
  open: (offerId) => api.post(`/sales/${offerId}/open`),
  relayVotes: (offerId) => api.post(`/sales/${offerId}/relay-votes`),
  finalize: (offerId) => api.post(`/sales/${offerId}/finalize`),
  confirm: (offerId) => api.post(`/sales/${offerId}/confirm`),
  cancel: (offerId) => api.post(`/sales/${offerId}/cancel`),
};

// Admin-only gas analytics (the token is attached by the interceptor above).
export const gasAPI = {
  getSummary: () => api.get('/gas/summary'),
  getBenchmark: () => api.get('/gas/benchmark'),
  getOptimizations: () => api.get('/gas/optimizations'),
  getScenario: () => api.get('/gas/scenario'),
  getTransactions: (params) => api.get('/gas/transactions', { params }),
  sync: () => api.post('/gas/sync'),
};

export default api;
