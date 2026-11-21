import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

/**
 * AUTH TOKEN STORAGE TRADE-OFF
 * ---------------------------------------------------
 * We use a Bearer token kept in localStorage rather than httpOnly cookies.
 *
 * Why not cookies (the safer XSS-resistant option)?
 *   The deployment runs behind a wildcard-CORS Cloudflare ingress that injects
 *   `Access-Control-Allow-Origin: *`, which browsers refuse to combine with
 *   credentialed (cookie) requests. Until the ingress can reflect the request
 *   origin, cookie-based auth is not viable in this environment.
 *
 * What we do to compensate:
 *   • Tokens are short-lived (8 h access + 7 d refresh).
 *   • All inputs are React-escaped (no `dangerouslySetInnerHTML`).
 *   • Server-side endpoints sanitise & validate every payload.
 *   • The token has no CSRF surface (Authorization header, not auto-attached).
 *   • A `setAuthToken(null)` wipes the value on logout and on 401.
 *
 * When the production ingress supports origin reflection, swap to
 * httpOnly + Secure + SameSite=Strict cookies — `auth.py` already supports it.
 */
const TOKEN_KEY = "s360_token";

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common["Authorization"];
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

const initTok = getAuthToken();
if (initTok) api.defaults.headers.common["Authorization"] = `Bearer ${initTok}`;

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && getAuthToken()) {
      setAuthToken(null);
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    return Promise.reject(err);
  }
);

export function formatErr(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
