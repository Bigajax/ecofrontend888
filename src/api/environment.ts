export const isDev = Boolean((import.meta as any)?.env?.DEV);

export const hasWindow = () => typeof window !== "undefined";
