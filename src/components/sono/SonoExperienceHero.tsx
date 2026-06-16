import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { trackHeadlineExibida } from '@/lib/mixpanelAssinarFunnel';

/**
 * 4ª hero da família /sono — o "convite" puro da experiência guest
 * (/sono/experiencia). Ao contrário das 3 variantes de venda da landing
 * (sem_remedio, mente_nao_desliga, acorda_cansado — ver useSonoHeroVariant),
 * esta NÃO vende: convida a deitar e apertar play. A venda fica pro checkout
 * inline, depois da Noite 1.
 *
 * Estrutura pronta pra variantes por ângulo de anúncio (?hero=) no futuro — por
 * ora é um convite único. A variante exibida ('convite') entra no contest de
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

// Tokens locais — candlelight quente sobre noite profunda (não roxo de app).
const AMBER = '#D4A847';
const AMBER_DEEP = '#C9922A';
const BG0 = '#060609';
const IVORY = '#F0E3C0';

// Guard de módulo (não useRef): a árvore remonta quando o userId muda
// (RootProviders chaveado por userId), e useRef morreria junto — re-disparando.
let conviteHeadlineTracked = false;

export function SonoExperienceHero({ onListen, onBack, onExploreApp }: SonoExperienceHeroProps) {
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
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
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

      {/* Fundo noturno — respiração lenta */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage: 'url("/images/meditacoes-sono-hero.webp")',
          backgroundPosition: 'center 32%',
        }}
        initial={{ scale: 1.08 }}
        animate={{ scale: [1.08, 1.14, 1.08] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Vinheta mais funda que o hero de venda — íntimo, quase quarto escuro */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgba(6,6,9,0.34) 0%, rgba(6,6,9,0.20) 26%, rgba(6,6,9,0.66) 60%, ${BG0} 100%)`,
        }}
      />
      {/* Brilho quente baixo — vela, não néon */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          bottom: '14%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '300px',
          height: '190px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(212,168,71,0.08) 0%, transparent 70%)',
          filter: 'blur(54px)',
        }}
      />

      {/* Conteúdo — empurrado pro terço inferior pra dar ar à imagem */}
      <div className="relative z-10 mt-auto flex w-full flex-col items-center px-6 pb-16 text-center sm:px-8 sm:pb-20">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center sm:max-w-md">

          {/* Eyebrow — atrito zero, sem venda */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: AMBER, boxShadow: '0 0 5px rgba(212,168,71,0.6)' }}
            />
            8 minutos · sem cadastro
          </motion.div>

          {/* Headline — convite, não diagnóstico */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
            className="mt-5 font-display font-bold leading-[1.04] text-white"
            style={{
              fontSize: 'clamp(2.2rem, 7.4vw, 3.2rem)',
              textShadow: '0 4px 40px rgba(0,0,0,0.72), 0 1px 6px rgba(0,0,0,0.5)',
            }}
          >
            Deite-se.
            <br />
            <em style={{ color: IVORY, fontStyle: 'italic' }}>O resto a gente conduz.</em>
          </motion.h1>

          {/* Subtítulo — instrução íntima, prepara o corpo */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: 'easeOut' }}
            className="mt-4 text-[15px] font-light leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Coloque os fones, apague a luz
            <br />
            e aperte play.
          </motion.p>

          {/* CTA único — candlelight */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.34, ease: 'easeOut' }}
            onClick={onListen}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-full py-4 text-[15px] font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DEEP} 100%)`,
              color: '#0D1120',
              boxShadow: '0 10px 36px rgba(212,168,71,0.28), 0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Ouvir agora
          </motion.button>

          {/* Nota discreta — reforça que é a experiência, não um cadastro */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.48 }}
            className="mt-4 text-[12px]"
            style={{ color: 'rgba(255,255,255,0.32)' }}
          >
            Sua primeira noite, por conta da casa.
          </motion.p>

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
