import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import mixpanel from '@/lib/mixpanel';

/**
 * Porta de entrada do EcoDream dentro do Ritual Boa Noite (logado, pago).
 * Fecha o ciclo do bônus: o que foi prometido na oferta do Protocolo do Sono
 * ("Interprete seus sonhos com a Eco") reaparece aqui como destino acionável,
 * levando à feature em /app/dream. Mesma identidade dourada do modal da oferta
 * (SonoEcoDreamBonusModal) — outra superfície, mesma marca.
 *
 * Renderizado só quando a pessoa tem acesso (comprou / premium); o EcoDream
 * exige conta, então a porta só faz sentido para quem está logado.
 */
export function SonoEcoDreamEntryCard() {
  const navigate = useNavigate();

  const handleClick = () => {
    try {
      mixpanel.track('Sono · EcoDream porta clicada', { surface: 'ritual_boa_noite' });
    } catch {
      // analytics — silencia
    }
    navigate('/app/dream');
  };

  return (
    <section className="mx-auto max-w-lg px-4 pt-2 pb-12 sm:px-6">
      <motion.button
        type="button"
        onClick={handleClick}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ type: 'spring', stiffness: 65, damping: 18 }}
        className="group relative w-full overflow-hidden rounded-3xl p-5 text-left transition-transform hover:scale-[1.01] active:scale-[0.99]"
        style={{
          // Noite quente/dourada — distinta do violeta do ritual, igual ao modal.
          background: 'linear-gradient(155deg, rgba(238,192,121,0.10) 0%, #150F2F 42%, #0B0820 100%)',
          border: '1px solid rgba(238,192,121,0.24)',
          boxShadow: '0 14px 50px rgba(8,5,24,0.5), inset 0 1px 0 rgba(245,224,154,0.10)',
        }}
      >
        {/* Clarão de lua no canto */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(238,192,121,0.20) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-center gap-4">
          {/* Logo do EcoDream — tile branco estilo ícone de app */}
          <span
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl"
            style={{ background: '#FFFFFF', border: '1px solid rgba(238,192,121,0.4)' }}
          >
            <img src="/images/eco-dream-icon.webp" alt="" className="h-full w-full object-cover" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: '#EEC079' }}>
              Incluído no seu acesso
            </p>
            <h3 className="mt-1 font-display text-[18px] font-semibold leading-tight text-white">
              EcoDream
            </h3>
            <p className="mt-1 text-[13px] leading-snug" style={{ color: 'rgba(240,232,214,0.62)' }}>
              Conte um sonho e a Eco interpreta pelo olhar de Freud e Jung — em segundos.
            </p>
          </div>

          {/* Seta — afundância de destino */}
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5"
            style={{ background: 'rgba(238,192,121,0.12)', border: '1px solid rgba(238,192,121,0.34)' }}
          >
            <ArrowRight className="h-4 w-4" style={{ color: '#EEC079' }} />
          </span>
        </div>
      </motion.button>
    </section>
  );
}
