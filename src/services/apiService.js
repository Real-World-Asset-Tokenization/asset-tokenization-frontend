import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==========================================
// AUTHENTICATION API
// ==========================================

export async function registerUser(data) {
  try {
    const res = await api.post("/auth/register", data);
    return res.data;
  } catch (error) {
    console.error("API error registering user:", error);
    throw error;
  }
}

export async function loginUser(email, password) {
  try {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  } catch (error) {
    console.error("API error logging in:", error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const res = await api.get("/auth/me");
    return res.data.data;
  } catch (error) {
    console.error("API error fetching current user:", error);
    throw error;
  }
}

export async function getAllUsers() {
  try {
    const res = await api.get("/auth/users");
    return res.data.data;
  } catch (error) {
    console.error("API error fetching all users:", error);
    throw error;
  }
}

export async function verifyUser(userId) {
  try {
    const res = await api.post(`/auth/verify/${userId}`);
    return res.data;
  } catch (error) {
    console.error("API error verifying user:", error);
    throw error;
  }
}

export async function fetchAssets(filter = {}) {
  try {
    const params = {};
    if (filter.status) params.status = filter.status;
    const res = await api.get("/assets", { params });
    return res.data.data;
  } catch (error) {
    console.error("API error fetching assets:", error);
    throw error;
  }
}

export async function fetchAssetById(id) {
  try {
    const res = await api.get(`/assets/${id}`);
    return res.data.data;
  } catch (error) {
    console.error(`API error fetching asset ${id}:`, error);
    throw error;
  }
}

export async function registerAssetBackend(data) {
  try {
    const res = await api.post("/assets", data);
    return res.data.data;
  } catch (error) {
    console.error("API error creating asset:", error);
    throw error;
  }
}

export async function updateAssetStatusBackend(id, status, txHash = "") {
  try {
    const res = await api.patch(`/assets/${id}/status`, { status, txHash });
    return res.data.data;
  } catch (error) {
    console.error(`API error updating asset status ${id}:`, error);
    throw error;
  }
}

export async function fetchStats() {
  try {
    const res = await api.get("/assets/stats");
    return res.data.data;
  } catch (error) {
    console.error("API error fetching stats:", error);
    return null;
  }
}

export async function requestFaucet(address) {
  try {
    const res = await api.post("/assets/faucet", { address });
    return res.data;
  } catch (error) {
    console.error("API error requesting faucet:", error);
    throw error;
  }
}

export async function fetchAvailableSupply(assetId) {
  try {
    const res = await api.get(`/assets/${assetId}/available`);
    return res.data.available || 0;
  } catch (error) {
    console.error("API error fetching available supply:", error);
    return 0;
  }
}

export async function buySharesApi(assetId, buyerAddress, amount, paymentTxHash = "") {
  try {
    const res = await api.post(`/assets/${assetId}/buy`, {
      buyerAddress,
      amount,
      paymentTxHash
    });
    return res.data;
  } catch (error) {
    console.error("API error buying shares:", error);
    throw error;
  }
}

export async function swapTokensApi({ userAddress, sourceAssetId, targetAssetId, sourceAmount, transferTxHash = "" }) {
  try {
    const res = await api.post("/assets/swap", {
      userAddress,
      sourceAssetId,
      targetAssetId,
      sourceAmount,
      transferTxHash
    });
    return res.data;
  } catch (error) {
    console.error("API error swapping tokens:", error);
    throw error;
  }
}

// ==========================================
// KYC API
// ==========================================

export async function uploadKYCDocument(formData) {
  try {
    const res = await api.post("/kyc/upload-document", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    console.error("API error uploading KYC document:", error);
    throw error;
  }
}

export async function uploadKYCSelfie(formData) {
  try {
    const res = await api.post("/kyc/upload-selfie", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    console.error("API error uploading KYC selfie:", error);
    throw error;
  }
}

export async function verifyKYC() {
  try {
    const res = await api.post("/kyc/verify");
    return res.data;
  } catch (error) {
    console.error("API error verifying KYC:", error);
    throw error;
  }
}

export async function getKYCStatus() {
  try {
    const res = await api.get("/kyc/status");
    return res.data.data;
  } catch (error) {
    console.error("API error fetching KYC status:", error);
    throw error;
  }
}

export async function getKYCDetails(userId) {
  try {
    const res = await api.get(`/kyc/admin/details/${userId}`);
    return res.data.data;
  } catch (error) {
    console.error("API error fetching KYC details:", error);
    throw error;
  }
}

export async function updateKYCStatus(userId, status) {
  try {
    const res = await api.put(`/kyc/admin/status/${userId}`, { status });
    return res.data;
  } catch (error) {
    console.error("API error updating KYC status:", error);
    throw error;
  }
}

// ==========================================
// ASSET VERIFICATION API
// ==========================================

export async function uploadAssetDocuments(formData) {
  try {
    const res = await api.post("/assets/upload", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (error) {
    console.error("API error uploading asset documents:", error);
    throw error;
  }
}

export async function verifyAsset(assetId) {
  try {
    const res = await api.post(`/assets/verify/${assetId}`);
    return res.data;
  } catch (error) {
    console.error("API error verifying asset:", error);
    throw error;
  }
}

export async function getAssetVerificationStatus(assetId) {
  try {
    const res = await api.get(`/assets/status/${assetId}`);
    return res.data.data;
  } catch (error) {
    console.error("API error fetching asset status:", error);
    throw error;
  }
}

export async function getUserAssets() {
  try {
    const res = await api.get("/assets/my-assets");
    return res.data.data;
  } catch (error) {
    console.error("API error fetching user assets:", error);
    throw error;
  }
}

export async function getAllAssetsAdmin() {
  try {
    const res = await api.get("/assets/admin/all");
    return res.data.data;
  } catch (error) {
    console.error("API error fetching all assets:", error);
    throw error;
  }
}

export async function getAssetDetailsAdmin(assetId) {
  try {
    const res = await api.get(`/assets/admin/details/${assetId}`);
    return res.data.data;
  } catch (error) {
    console.error("API error fetching asset details:", error);
    throw error;
  }
}

export async function updateAssetVerificationStatus(assetId, verificationStatus, rejectionReason) {
  try {
    const res = await api.put(`/assets/admin/status/${assetId}`, {
      verificationStatus,
      rejectionReason
    });
    return res.data;
  } catch (error) {
    console.error("API error updating asset verification status:", error);
    throw error;
  }
}

