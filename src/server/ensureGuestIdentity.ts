import type { NextFunction, Request, Response } from "express";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type IdentitySource = "header" | "query" | "none";

type HeaderLike = Pick<Request, "get">;

type Logger = {
  warn: (message: string, payload?: Record<string, unknown>) => void;
  info?: (message: string, payload?: Record<string, unknown>) => void;
  debug?: (message: string, payload?: Record<string, unknown>) => void;
};

const getLogger = (): Logger => {
  const globalLog = (globalThis as typeof globalThis & { log?: Logger }).log;
  if (globalLog && typeof globalLog.warn === "function") {
    return globalLog;
  }
  return {
    warn: (message, payload) => {
      try {
        console.warn(message, payload);
      } catch {
        /* noop */
      }
    },
    info: (message, payload) => {
      try {
        console.info(message, payload);
      } catch {
        /* noop */
      }
    },
    debug: (message, payload) => {
      try {
        console.debug(message, payload);
      } catch {
        /* noop */
      }
    },
  };
};

const isUuid = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return UUID_V4_REGEX.test(trimmed);
};

const extractHeader = (req: HeaderLike, headerNames: string[]): string | null => {
  for (const name of headerNames) {
    try {
      const value = req.get(name);
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    } catch {
      /* noop */
    }
  }
  return null;
};

const extractQuery = (queryValue: unknown): string | null => {
  if (Array.isArray(queryValue)) {
    for (const item of queryValue) {
      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }
    }
    return null;
  }
  if (typeof queryValue === "string" && queryValue.trim()) {
    return queryValue.trim();
  }
  return null;
};

export const ensureGuestIdentity = (req: Request, res: Response, next: NextFunction) => {
  const logger = getLogger();

  const headerGuest = extractHeader(req, ["X-Eco-Guest-Id", "x-eco-guest-id", "X-Guest-Id", "x-guest-id"]);
  const queryGuest = extractQuery(req.query?.guest_id ?? req.query?.guest ?? null);
  const guestId = headerGuest && isUuid(headerGuest) ? headerGuest : queryGuest && isUuid(queryGuest) ? queryGuest : null;
  const guestSource: IdentitySource = guestId
    ? headerGuest && headerGuest === guestId
      ? "header"
      : queryGuest && queryGuest === guestId
      ? "query"
      : "none"
    : "none";

  const headerSession = extractHeader(req, [
    "X-Eco-Session-Id",
    "x-eco-session-id",
    "X-Session-Id",
    "x-session-id",
  ]);
  const querySession = extractQuery(req.query?.session_id ?? req.query?.session ?? null);
  const sessionId = headerSession && isUuid(headerSession)
    ? headerSession
    : querySession && isUuid(querySession)
    ? querySession
    : null;
  const sessionSource: IdentitySource = sessionId
    ? headerSession && headerSession === sessionId
      ? "header"
      : querySession && querySession === sessionId
      ? "query"
      : "none"
    : "none";

  logger.debug?.("[identity] resolved", {
    guestSource,
    sessionSource,
    guestId: guestId ?? null,
    sessionId: sessionId ?? null,
    path: req.originalUrl ?? req.url,
  });

  if (!guestId || !sessionId) {
    logger.warn("[identity] missing guest/session id", {
      guest: guestId ?? headerGuest ?? queryGuest ?? null,
      session: sessionId ?? headerSession ?? querySession ?? null,
      guestSource,
      sessionSource,
    });
    return res.status(400).json({ error: "missing_guest_id", message: "Informe X-Eco-Guest-Id" });
  }

  (req as Request & { guestId?: string; sessionId?: string }).guestId = guestId;
  (req as Request & { guestId?: string; sessionId?: string }).sessionId = sessionId;

  return next();
};

export default ensureGuestIdentity;
