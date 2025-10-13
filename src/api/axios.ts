import axios from "axios";

import { API_BASE_URL } from "../constants/api";
import { getOrCreateGuestId } from "./guestIdentity";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: false,
});

const hasWindow = typeof window !== "undefined";

const AUTH_TOKEN_KEY = "auth_token";

api.interceptors.request.use((config) => {
  const headers = (config.headers ??= {});
  const token = hasWindow ? window.localStorage.getItem(AUTH_TOKEN_KEY) || "" : "";
  const isLogged = Boolean(token);

  if (isLogged) {
    headers["Authorization"] = `Bearer ${token}`;
    delete headers["X-Guest-Id"];
    delete headers["x-guest-id"];
    config.withCredentials = true;
  } else {
    headers["X-Guest-Id"] = getOrCreateGuestId();
    delete headers["Authorization"];
    delete headers["authorization"];
    config.withCredentials = false;
  }

  return config;
});

export default api;
