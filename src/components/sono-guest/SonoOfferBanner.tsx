import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Moon, ArrowRight } from 'lucide-react';

const SONO_LIGHT = '#C4B5FD';
const SONO_DARK = '#7C3AED';

/** Tempo expandido (legível) antes de recolher pra pílula discreta. */
const MINIMIZE_AFTER_MS = 10000;

interface SonoOfferBannerProps {
  /** Abre o checkout no passo 'offer'. O evento "Banner oferta clicado" é
   *  disparado pelo pai (GuestSonoPlayer) antes de chamar isto. */
  onClick: () => void;
  /** Já entra como pílula (sem a fase expandida) — usado ao voltar do checkout pra
   *  meditação, pra não repetir a entrada destacada. */
  startMinimized?: boolean;
}

/**
 * Banner de acesso antecipado à oferta — surge aos 150s da Noite 1 (o gatilho e o
 * evento "exibido" vivem no GuestSonoPlayer; aqui é só a UI). Entra destacado e
 * auto-minimiza pra uma pílula discreta, respeitando o tom calmo do áudio.
 *
 * Renderizado NO FLUXO do player, logo acima dos controles — por isso nunca cobre
 * play/pause nem a barra de progresso (catch de UX: quem está relaxando precisa
 * conseguir pausar/buscar). Sem botão de fechar: fica sticky pela sessão.
 */
export function SonoOfferBanner({ onClick, startMinimized = false }: SonoOfferBannerProps) {
  const reduceMotion = useReducedMotion();
  const [minimized, setMinimized] = useState(startMinimized);

  useEffect(() => {
    if (startMinimized) return; // já minimizado: sem fase expandida nem timer
    const id = setTimeout(() => setMinimized(true), MINIMIZE_AFTER_MS);
    return () => clearTimeout(id); // não deixa o timer solto se o player desmontar
  }, [startMinimized]);

  const entry = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  if (minimized) {
    return (
      <div className="flex justify-center px-5 pb-2">
        <motion.button
          {...entry}
          transition={{ duration: reduceMotion ? 0.2 : 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={onClick}
          className="flex items-center gap-2 rounded-full px-4 py-2 touch-manipulation transition-transform active:scale-[0.97]"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(196,181,253,0.28)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <Moon size={14} fill="currentColor" style={{ color: SONO_LIGHT }} />
          <span className="text-[12.5px] font-semibold" style={{ color: 'rgba(232,226,255,0.9)' }}>
            Ver as próximas noites
          </span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="px-5 pb-2">
      <motion.button
        {...entry}
        transition={{ duration: reduceMotion ? 0.2 : 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={onClick}
        className="flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left touch-manipulation transition-transform active:scale-[0.99] md:mx-auto md:max-w-md"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(196,181,253,0.26)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 10px 30px rgba(8,5,24,0.35)',
        }}
      >
        <span
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: 'rgba(124,58,237,0.26)', border: '1px solid rgba(167,139,250,0.4)' }}
        >
          <Moon size={18} fill="currentColor" style={{ color: SONO_LIGHT }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'rgba(196,181,253,0.6)' }}>
            As próximas noites
          </span>
          <span className="mt-0.5 block text-[14px] font-bold leading-snug text-white">
            As outras 6 noites já estão prontas
          </span>
        </span>
        <span
          className="flex h-8 flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${SONO_LIGHT} 0%, ${SONO_DARK} 100%)` }}
        >
          Ver a oferta
          <ArrowRight size={13} />
        </span>
      </motion.button>
    </div>
  );
}
