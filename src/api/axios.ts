import axios from "axios";

import { getApiBase } from "../config/apiBase";
import { buildIdentityHeaders, syncGuestId } from "../lib/guestId";
import { ensureHttpsUrl } from "../utils/ensureHttpsUrl";

const api = axios.create({
  baseURL: ensureHttpsUrl(getApiBase()),
  timeout: 60000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const hasWindow = typeof window !== "undefined";

const AUTH_TOKEN_KEY = "auth_token";

api.interceptors.request.use((config) => {
  const headers = (config.headers ??= {});
  const token = hasWindow ? window.localStorage.getItem(AUTH_TOKEN_KEY) || "" : "";

  config.withCredentials = true;

  const identityHeaders = buildIdentityHeaders();
  for (const [key, value] of Object.entries(identityHeaders)) {
    headers[key] = value;
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    delete headers["Authorization"];
    delete headers["authorization"];
  }

  delete headers["X-Guest-Id"];
  delete headers["x-guest-id"];

  return config;
});

type HeaderMap = Record<string, string | string[] | undefined> | undefined;

const extractGuestIdFromHeaders = (headers: HeaderMap): string | null => {
  if (!headers) return null;
  const raw =
    (headers["x-eco-guest-id"] as string | undefined) ||
    (headers["X-Eco-Guest-Id"] as string | undefined) ||
    (headers["x-guest-id"] as string | undefined) ||
    (headers["X-Guest-Id"] as string | undefined);
  return typeof raw === "string" ? raw : null;
};

api.interceptors.response.use(
  (response) => {
    const serverGuestId = extractGuestIdFromHeaders(response?.headers as HeaderMap);
    if (serverGuestId) syncGuestId(serverGuestId);
    return response;
  },
  (error) => {
    const serverGuestId = extractGuestIdFromHeaders(
      (error?.response?.headers as HeaderMap) ?? undefined,
    );
    if (serverGuestId) syncGuestId(serverGuestId);
    return Promise.reject(error);
  },
);

export default api;
