import { useState } from 'react';
import { X } from 'lucide-react';
import { useDrJoeCheckout } from '@/hooks/useDrJoeCheckout';

interface DrJoeOfferModalProps {
  open: boolean;
  onClose: () => void;
  origin?: string;
}

export default function DrJoeOfferModal({ open, onClose, origin = 'dr_joe_locked' }: DrJoeOfferModalProps) {
  const { loading, openCheckout } = useDrJoeCheckout();
  const [showRedirectWarning, setShowRedirectWarning] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    if (loading) return;
    setShowRedirectWarning(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#070A12] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Oferta especial de entrada
            </p>
            <p className="mt-1 text-base font-semibold text-white/90">
              Coleção Dr. Joe Dispenza
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/15 disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="text-center">
            <p className="text-sm text-white/45">
              De <span className="line-through">R$ 97</span> por
            </p>
            <p className="mt-1 font-display text-4xl font-bold text-white">
              R$ 37
            </p>
            <p className="mt-1 text-xs text-white/35">
              Pagamento único · Acesso vitalício
            </p>
          </div>

          <ul className="flex flex-col gap-1.5">
            {[
              'Acesso completo à prática',
              'Meditações guiadas para sustentar esse estado',
              'Liberação imediata após confirmação',
              'Acesso vitalício',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                <span className="mt-0.5 text-eco-baby">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {!showRedirectWarning ? (
            <button
              onClick={() => setShowRedirectWarning(true)}
              disabled={loading}
              className="w-full rounded-full py-3.5 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
              style={{
                background:
                  'linear-gradient(135deg, rgba(176,166,216,0.96) 0%, rgba(148,136,196,0.96) 52%, rgba(100,90,160,0.96) 100%)',
                boxShadow: '0 14px 40px rgba(192,180,224,0.16)',
              }}
            >
              Desbloquear por R$ 37 →
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                <p className="text-sm text-white/65">
                  Você será redirecionado para o pagamento seguro via Mercado Pago e voltará automaticamente após concluir.
                </p>
              </div>
              <button
                onClick={() => openCheckout(origin)}
                disabled={loading}
                className="w-full rounded-full py-3.5 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(176,166,216,0.96) 0%, rgba(148,136,196,0.96) 52%, rgba(100,90,160,0.96) 100%)',
                  boxShadow: '0 14px 40px rgba(192,180,224,0.16)',
                }}
              >
                {loading ? 'Abrindo pagamento…' : 'Continuar para pagamento →'}
              </button>
              <button
                onClick={() => setShowRedirectWarning(false)}
                disabled={loading}
                className="text-center text-sm text-white/35 transition-colors hover:text-white/55 disabled:opacity-60"
              >
                Voltar
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-white/25">
            Suporte: ecotopia.app777@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}

