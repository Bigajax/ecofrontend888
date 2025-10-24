// src/components/GlobalToast.tsx
import { useEffect, useState } from "react";

export default function GlobalToast() {
  const [msg, setMsg] = useState<{title: string; description?: string} | null>(null);

  useEffect(() => {
    const h = (e: any) => setMsg(e.detail);
    window.addEventListener("toast", h);
    return () => window.removeEventListener("toast", h);
  }, []);

  if (!msg) return null;
  return (
    <div className="fixed inset-x-0 top-4 flex justify-center z-[9999]">
      <div className="backdrop-blur-xl bg-white/70 border border-white/40 rounded-2xl px-4 py-3">
        <div className="font-semibold">{msg.title}</div>
        {msg.description && <div className="text-sm opacity-80">{msg.description}</div>}
      </div>
    </div>
  );
}
