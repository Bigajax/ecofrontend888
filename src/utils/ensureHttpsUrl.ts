const HTTP_PROTOCOL_REGEX = /^http:\/\//i;

const isBrowserHttps = () => {
  if (typeof globalThis === "undefined") {
    return false;
  }

  try {
    const location = (globalThis as typeof globalThis & { location?: Location }).location;
    return Boolean(location && location.protocol === "https:");
  } catch {
    return false;
  }
};

const shouldForceHttps = () => {
  const inDev = Boolean(import.meta.env?.DEV);
  if (inDev) {
    return isBrowserHttps();
  }

  // In production builds we always prefer HTTPS to avoid mixed-content blocks.
  return true;
};

export const ensureHttpsUrl = (url: string) => {
  if (!url || !HTTP_PROTOCOL_REGEX.test(url)) {
    return url;
  }

  return shouldForceHttps() ? url.replace(HTTP_PROTOCOL_REGEX, "https://") : url;
};

export default ensureHttpsUrl;
