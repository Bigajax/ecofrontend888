import { useState } from 'react';
import { useSonoCheckout } from '@/hooks/useSonoCheckout';
import { trackGuestPurchaseStarted } from '@/lib/mixpanelSonoGuestEvents';

interface PurchaseModalProps {
  capturedEmail: string | null;
  onClose: () => void;
}

export function PurchaseModal({ capturedEmail, onClose }: PurchaseModalProps) {
  const { loading, openCheckout } = useSonoCheckout();
  const [email, setEmail] = useState(capturedEmail ?? '');
  const [error, setError] = useState<string | null>(null);

  const handlePay = () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Informe um email válido para receber seu acesso.');
      return;
    }
    setError(null);
    trackGuestPurchaseStarted();
    openCheckout();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-800">Protocolo Sono Profundo — 7 Noites</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          {/* Price */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-2">
              <p className="text-sm line-through text-gray-300">R$97</p>
              <p className="text-3xl font-bold text-gray-800">R$37</p>
            </div>
            <p className="text-sm text-gray-400">Pagamento único · Acesso vitalício</p>
          </div>

          {/* Features */}
          <ul className="flex flex-col gap-1.5">
            {[
              '7 meditações guiadas',
              'Bônus SOS — Não Consigo Dormir',
              'Sons de fundo para dormir',
              'Acesso vitalício ao protocolo',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span>
                {f}
              </li>
            ))}
          </ul>

          {/* Email field */}
          <div className="flex flex-col gap-1.5">
            {capturedEmail ? (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(124,110,246,0.06)', border: '1px solid rgba(124,110,246,0.2)' }}
              >
                <span className="text-gray-500">Receber acesso em: </span>
                <span className="font-medium text-gray-700">{capturedEmail}</span>
                <button
                  onClick={() => setEmail('')}
                  className="ml-2 text-xs text-violet-500 hover:underline"
                >
                  alterar
                </button>
              </div>
            ) : (
              <>
                <label className="text-xs font-medium text-gray-500">
                  Email para receber seu acesso
                </label>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
                />
                <p className="text-xs text-gray-400">A conta é criada automaticamente após o pagamento.</p>
              </>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Pay button — goes directly to checkout */}
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)', boxShadow: '0 8px 28px rgba(107,79,187,0.40)' }}
          >
            {loading ? 'Abrindo pagamento...' : 'Garantir acesso completo — R$37 →'}
          </button>

          {/* Guarantee */}
          <p className="text-center text-xs text-gray-400">
            🔒 Garantia incondicional de 7 dias. Se não funcionar, devolvemos tudo.
          </p>
        </div>
      </div>
    </div>
  );
}
