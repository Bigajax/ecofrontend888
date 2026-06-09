import { useEffect } from 'react';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import EcotopiaHero from '@/components/landing/EcotopiaHero';
import DiagnosticoSection from '@/components/landing/DiagnosticoSection';
import TresPilaresSection from '@/components/landing/TresPilaresSection';
import TestimoniosSection from '@/components/landing/TestimoniosSection';
import EmpresasSection from '@/components/landing/EmpresasSection';
import MethodMarquee from '@/components/landing/MethodMarquee';
import BibliotecaSection from '@/components/landing/BibliotecaSection';
import JoinSection from '@/components/landing/JoinSection';
import FaqSection from '@/components/landing/FaqSection';
import FechamentoSection from '@/components/landing/FechamentoSection';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import mixpanel from '@/lib/mixpanel';

export default function EcotopiaLandingPage() {
  useScrollReveal('.ecotopia-lp');

  useEffect(() => {
    try {
      mixpanel.track('Landing · Vista', { pagina: 'principal' });
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
      <TestimoniosSection />
      <EmpresasSection />
      <MethodMarquee />
      <BibliotecaSection />
      <JoinSection />
      <FaqSection />
      <FechamentoSection />
      <EcotopiaFooter />
    </div>
  );
}
