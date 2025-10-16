import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";

import { updateBanditArms, updatePolicy } from "../api/adminControls";
import { getSessionId } from "../utils/identity";

const envFlag = import.meta.env.VITE_ENABLE_ADMIN_COMMANDS;
export const ENABLE_ADMIN_COMMANDS = envFlag === "true" || envFlag === "1";

const extractRoles = (user: User | null | undefined): string[] => {
  if (!user) return [];

  const roles = new Set<string>();
  const pushValue = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const text = typeof item === "string" ? item.trim() : "";
        if (text) roles.add(text.toLowerCase());
      });
      return;
    }
    if (typeof value === "string") {
      value
        .split(/[,\s]+/)
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean)
        .forEach((part) => roles.add(part));
    }
  };

  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const userMeta = user.user_metadata as Record<string, unknown> | undefined;
  const claims = (appMeta?.claims ?? userMeta?.claims) as
    | Record<string, unknown>
    | undefined;

  pushValue(appMeta?.roles);
  pushValue(appMeta?.role);
  pushValue(userMeta?.roles);
  pushValue(userMeta?.role);
  pushValue(claims?.roles);
  pushValue(claims?.role);

  return Array.from(roles);
};

const userIsAdmin = (user: User | null | undefined) => {
  const roles = extractRoles(user);
  if (roles.length === 0) return false;
  return roles.some((role) =>
    ["admin", "superadmin", "staff", "ops", "operator"].includes(role),
  );
};

type CommandInterface = {
  updatePolicy: typeof updatePolicy;
  updateBanditArms: typeof updateBanditArms;
  sessionId: string | null;
};

export const useAdminCommands = (
  user: User | null,
  preferredSessionId?: string | null,
) => {
  useEffect(() => {
    if (!ENABLE_ADMIN_COMMANDS) return;
    if (!user || !userIsAdmin(user)) return;
    if (typeof window === "undefined") return;

    const sessionId = preferredSessionId ?? getSessionId();

    const existing = (window as any).__ecoAdmin;
    const commandInterface: CommandInterface = {
      updatePolicy,
      updateBanditArms,
      sessionId: sessionId ?? null,
    };

    const merged = {
      ...(existing && typeof existing === "object" ? existing : {}),
      ...commandInterface,
    };

    (window as any).__ecoAdmin = merged;

    if (import.meta.env.DEV) {
      console.info(
        "[eco-admin] comandos disponíveis em window.__ecoAdmin:",
        Object.keys(merged),
      );
    }

    return () => {
      const current = (window as any).__ecoAdmin;
      if (current === merged) {
        delete (window as any).__ecoAdmin;
      }
    };
  }, [preferredSessionId, user]);
};
