import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock, Moon, Play, Sparkles } from 'lucide-react';
import { trackHeadlineExibida } from '@/lib/mixpanelAssinarFunnel';

/**
 * 4ª hero da família /sono — o "convite" puro da experiência guest
 * (/sono/experiencia). Ao contrário das 3 variantes de venda da landing
 * (sem_remedio, mente_nao_desliga, acorda_cansado — ver useSonoHeroVariant),
 * esta NÃO vende: convida a deitar e apertar play. A venda fica pro checkout
 * inline, depois da Noite 1.
 *
 * Estrutura "abrir um app de sono" (estilo App Store): fundo imersivo do vale
 * (lua + trilha de luzes guiando ao horizonte), eyebrow de ritual, título em
 * duas vozes e CTA roxo. A variante exibida ('convite') entra no contest de
 * headline do funil via `Funil Sono · Headline exibida`.
 */
interface SonoExperienceHeroProps {
  /** Inicia a Noite 1 (mesma ação do CTA do hero antigo). */
  onListen: () => void;
  /** Voltar (navigate(-1)). */
  onBack: () => void;
  /**
   * Atalho pro app completo — só pro free autenticado (criou conta mas não
   * pagou): aparece um link discreto abaixo do CTA. `undefined` = não mostra
   * (guest sem conta ou usuário pago).
   */
  onExploreApp?: () => void;
}

// Tokens locais — noite fria de lavanda; o único calor é a trilha de luzes.
const NIGHT0 = '#0C0920';
const LILAC = '#C7B8F0';
const LAVENDER_MIST = 'rgba(199,184,240,0.72)';
const ORB_WARM = '#F0C4E8';

// Guard de módulo (não useRef): a árvore remonta quando o userId muda
// (RootProviders chaveado por userId), e useRef morreria junto — re-disparando.
let conviteHeadlineTracked = false;

export function SonoExperienceHero({ onListen, onBack, onExploreApp }: SonoExperienceHeroProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (conviteHeadlineTracked) return;
    conviteHeadlineTracked = true;
    try {
      trackHeadlineExibida({ variant: 'convite' });
    } catch {
      // tracking nunca pode quebrar a página
    }
  }, []);

  return (
    <section
      className="relative flex min-h-[460px] h-[60vh] max-h-[560px] flex-col justify-end overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Voltar */}
      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-all hover:text-white/80"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Fundo do vale — lua, céu estrelado, trilha de luzes guiando ao sono.
          Leve zoom-out lento (respira); reduzido por prefers-reduced-motion. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: 'url("/images/sono-experiencia-bg.webp")',
          backgroundPosition: 'center 82%',
        }}
        initial={{ scale: 1.06 }}
        animate={{ scale: 1.0 }}
        transition={{ duration: 9, ease: 'easeOut' }}
      />
      {/* Scrim — leve em cima (deixa a trilha de luzes brilhar), escurece atrás do
          texto e dissolve no preto-noite pra costurar na página */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgba(12,9,32,0.18) 0%, rgba(12,9,32,0.06) 30%, rgba(12,9,32,0.50) 66%, ${NIGHT0} 100%)`,
        }}
      />

      {/* Conteúdo — ancorado no pé do banner, sobre a trilha de luzes */}
      <div className="relative z-10 flex w-full flex-col items-center px-6 pb-9 text-center sm:px-8 sm:pb-11">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center sm:max-w-md">

          {/* Eyebrow — pill de ritual, estilo App Store */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{
              background: 'rgba(199,184,240,0.10)',
              border: '1px solid rgba(199,184,240,0.22)',
              color: LILAC,
              backdropFilter: 'blur(12px)',
            }}
          >
            <Moon className="h-3 w-3" style={{ color: ORB_WARM }} fill="currentColor" />
            Ritual Boa Noite · Noite 1 de 7
          </motion.div>

          {/* Headline — duas vozes: estado + promessa em gradiente */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
            className="mt-5 font-display font-semibold leading-[1.05] text-white"
            style={{
              fontSize: 'clamp(2.2rem, 7.6vw, 3.2rem)',
              letterSpacing: '-0.02em',
              textShadow: '0 4px 40px rgba(0,0,0,0.55), 0 1px 6px rgba(0,0,0,0.45)',
            }}
          >
            Sua primeira noite
            <br />
            já está{' '}
            <span style={{ color: LILAC }}>pronta.</span>
          </motion.h1>

          {/* Subtítulo — instrução íntima em serifa (Lora) */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: 'easeOut' }}
            className="mt-4 font-subtitle text-[16px] italic leading-relaxed"
            style={{ color: LAVENDER_MIST }}
          >
            Coloque os fones, apague a luz.
            <br />
            A voz conduz o resto.
          </motion.p>

          {/* CTA único — pill roxo com a única luz quente (eco da trilha) */}
          <div className="relative mt-8 w-full">
            {/* Under-glow roxo, pulsa devagar (brilha atrás do vidro) */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[120%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: `radial-gradient(ellipse, rgba(167,139,250,0.42) 0%, rgba(124,58,237,0.22) 48%, transparent 74%)`,
                filter: 'blur(26px)',
              }}
              initial={{ opacity: 0.6 }}
              animate={reduceMotion ? { opacity: 0.7 } : { opacity: [0.55, 0.9, 0.55] }}
              transition={reduceMotion ? { duration: 0 } : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.34, ease: 'easeOut' }}
              onClick={onListen}
              className="flex w-full items-center justify-center gap-3 rounded-full py-4 pl-4 pr-6 text-[16px] font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, rgba(196,181,253,0.22) 0%, rgba(124,58,237,0.30) 100%)`,
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(196,181,253,0.5)',
                boxShadow: '0 10px 34px rgba(124,58,237,0.30), inset 0 1px 0 rgba(255,255,255,0.28)',
              }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
              </span>
              Ouvir a Noite 1
            </motion.button>
          </div>

          {/* Meta chips — reasseguro estilo App Store (10 min · gratuito) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.48 }}
            className="mt-5 flex items-center justify-center gap-2"
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
              style={{
                background: 'rgba(199,184,240,0.12)',
                border: '1px solid rgba(199,184,240,0.24)',
                color: LILAC,
                backdropFilter: 'blur(8px)',
              }}
            >
              <Clock className="h-3.5 w-3.5" />
              10 min
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
              style={{
                background: 'rgba(240,196,232,0.14)',
                border: '1px solid rgba(240,196,232,0.28)',
                color: ORB_WARM,
                backdropFilter: 'blur(8px)',
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Gratuito
            </span>
          </motion.div>

          {/* Atalho pro app — só pro free autenticado (criou conta, não pagou) */}
          {onExploreApp && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.56 }}
              onClick={onExploreApp}
              className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors hover:text-white"
              style={{ color: 'rgba(196,181,253,0.75)' }}
            >
              Explorar o app completo
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
}
