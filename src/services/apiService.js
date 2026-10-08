import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

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

