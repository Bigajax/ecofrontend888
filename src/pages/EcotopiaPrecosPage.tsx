import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '@/ecotopia-landing.css';
import EcotopiaTopbar from '@/components/landing/EcotopiaTopbar';
import PrecoSection from '@/components/landing/PrecoSection';
import FaqSection from '@/components/landing/FaqSection';
import EcotopiaFooter from '@/components/landing/EcotopiaFooter';
import { useScrollReveal } from '@/components/landing/useScrollReveal';
import mixpanel from '@/lib/mixpanel';

export default function EcotopiaPrecosPage() {
  useScrollReveal('.ecotopia-lp');

  useEffect(() => {
    try {
      mixpanel.track('Landing · Vista', { pagina: 'precos' });
    } catch {
      // noop
    }
  }, []);

  return (
    <div className="ecotopia-lp">
      <EcotopiaTopbar />

      <section className="lp-hero" style={{ paddingBottom: '20px' }}>
        <h1 className="reveal-soft">
          <span>Um preço.</span>
          <span>Tudo incluído.</span>
        </h1>
        <p
          className="reveal-soft animation-delay-100"
          style={{
            fontSize: '17px',
            color: 'var(--lp-muted)',
            maxWidth: '480px',
            margin: '0 auto',
          }}
        >
          7 dias gratuitos. Cancele em 1 clique. Sem fidelidade. Sem letra miúda.
        </p>
      </section>

      <PrecoSection sectionId="pricing_page" from="pricing_page" withHeader={false} />

      <FaqSection compact />

      <section
        style={{
          textAlign: 'center',
          padding: '60px 32px 80px',
          background: 'var(--lp-cream)',
        }}
      >
        <h2
          className="lp-section-title scroll-reveal"
          style={{ margin: '0 auto 28px', maxWidth: '24ch' }}
        >
          Comece pelos 7 dias gratuitos. Decida depois.
        </h2>
        <Link to="/assinar?step=plan&plan=annual&from=pricing_page" className="cta-primary">
          Começar 7 dias gratuitos
        </Link>
      </section>

      <EcotopiaFooter />
    </div>
  );
}
