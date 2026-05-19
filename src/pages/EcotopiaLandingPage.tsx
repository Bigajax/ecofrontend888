import { useEffect } from 'react';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaHero from '@/components/landing/EcotopiaHero';
import DiagnosticoSection from '@/components/landing/DiagnosticoSection';
import TresPilaresSection from '@/components/landing/TresPilaresSection';
import BibliotecaPraticasSection from '@/components/landing/BibliotecaPraticasSection';
import AutoridadeSection from '@/components/landing/AutoridadeSection';
import ObjecoesSection from '@/components/landing/ObjecoesSection';
import PrecoSection from '@/components/landing/PrecoSection';
import FaqSection from '@/components/landing/FaqSection';
import FechamentoSection from '@/components/landing/FechamentoSection';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import mixpanel from '@/lib/mixpanel';

export default function EcotopiaLandingPage() {
  useScrollReveal('.ecotopia-lp');

  useEffect(() => {
    try {
      mixpanel.track('Landing Page Viewed', { page: 'ecotopia_root' });
    } catch {
      // noop
    }
  }, []);

  return (
    <div className="ecotopia-lp">
      <EcotopiaTopbar />
      <EcotopiaHero />
      <DiagnosticoSection />
      <TresPilaresSection />
      <BibliotecaPraticasSection />
      <AutoridadeSection />
      <ObjecoesSection />
      <PrecoSection />
      <FaqSection />
      <FechamentoSection />
      <EcotopiaFooter />
    </div>
  );
}
