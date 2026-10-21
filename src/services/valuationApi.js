import api from "../lib/api";

const unwrap = (p) => p.then((r) => r.data.data).catch((e) => {
  throw new Error(e.response?.data?.message || e.message);
});

export const valuationApi = {
  permissions: () => unwrap(api.get("/valuations/me/permissions")),
  assets: () => unwrap(api.get("/valuations/assets")),
  asset: (id) => unwrap(api.get(`/valuations/assets/${id}`)),
  history: (id) => unwrap(api.get(`/valuations/assets/${id}/history`)),
  proposals: (params = {}) => unwrap(api.get("/valuations/proposals", { params })),
  proposal: (id) => unwrap(api.get(`/valuations/proposals/${id}`)),
  // FormData so a valuation report file can be attached.
  submit: (form) => unwrap(api.post("/valuations/proposals", form, { headers: { "Content-Type": "multipart/form-data" } })),
  approve: (id, comment) => unwrap(api.post(`/valuations/proposals/${id}/approve`, { comment })),
  reject: (id, reason) => unwrap(api.post(`/valuations/proposals/${id}/reject`, { reason })),
  publish: (id) => unwrap(api.post(`/valuations/proposals/${id}/publish`)),
  reviewRequests: () => unwrap(api.get("/valuations/review-requests")),
  requestReview: (id, reason) => unwrap(api.post(`/valuations/assets/${id}/review-requests`, { reason })),
};
