export type ToastPayload = {
  title: string;
  description?: string;
};

const dispatchToast = (payload: ToastPayload) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("toast", {
      detail: payload,
    }),
  );
};

export const toast = {
  success(title: string, description?: string) {
    dispatchToast({ title, description });
  },
  error(title: string, description?: string) {
    dispatchToast({ title, description });
  },
};
