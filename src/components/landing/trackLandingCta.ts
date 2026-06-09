import mixpanel from '@/lib/mixpanel';

type CtaPayload = {
  section: 'hero' | 'pricing' | 'pricing_page' | 'fechamento' | 'objections' | 'biblioteca';
  plan?: 'monthly' | 'annual';
  from: string;
  headline_variant?: '1' | '2';
};

export function trackLandingCta(payload: CtaPayload) {
  try {
    mixpanel.track('Landing · CTA clicado', payload);
  } catch {
    // tracking nunca pode quebrar UX
  }
}

export function trackLandingSectionViewed(section: string, headline_variant?: '1' | '2') {
  try {
    mixpanel.track('Landing · Seção vista', { section, headline_variant });
  } catch {
    // noop
  }
}
