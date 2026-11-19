// Single place that knows where the backend API lives. Set VITE_API_URL (for example
// https://api.example.com/api) for every deployed build; the localhost default is for local development only.
const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;

if (import.meta.env.PROD && !configured) {
  // A production build that silently talks to localhost would fail for every user, so say so loudly.
  console.error("VITE_API_URL is not set: the app cannot reach the backend.");
}

export const API_BASE_URL = (configured || "http://localhost:5001/api").replace(/\/+$/, "");

/** Authorization header for the signed-in user, or an empty object when signed out. */
export function authHeaders() {
  try {
    const token = JSON.parse(localStorage.getItem("user") || "null")?.token || localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
