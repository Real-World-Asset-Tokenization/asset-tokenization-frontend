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

export default api;
