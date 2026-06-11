import { useEffect, useMemo } from 'react';
import { trackHeadlineExibida } from '@/lib/mixpanelAssinarFunnel';

/**
 * Variante do hero da landing /sono, roteada por `utm_term`.
 *
 * Motivo: os anúncios em vídeo do Meta abrem com o diagnóstico "você não tem
 * insônia. tem uma mente que não desliga." — agora o DEFAULT da /sono ecoa essa
 * frase pra todo o tráfego (continuidade na chegada). A promessa antiga "Durma
 * mais rápido em 7 noites" continua acessível via `?utm_term=durma_rapido` (não
 * vira código morto; segue testável em A/B).
 *
 * O h1 é montado como: [h1Line1 em bloco] + [h1Pre <pílula>h1Mark</pílula> h1Pos].
 */
export interface SonoHeroCopy {
  variant: SonoHeroVariant;
  /** Primeira linha, em bloco próprio (só nas variantes que abrem com diagnóstico). */
  h1Line1?: string;
  /** Texto antes da pílula de destaque. */
  h1Pre: string;
  /** Texto dentro da pílula `lp-sono-mark-starry`. */
  h1Mark: string;
  /** Texto após a pílula (ex.: "."). */
  h1Pos?: string;
  lead: string;
  /** Label do botão — regra da página: todo CTA de topo/meio é este. */
  cta: string;
  /** Texto antes do link "cancele quando quiser" no microcopy do hero. */
  microcopyPrefix: string;
}

export type SonoHeroVariant = 'durma_rapido' | 'mente_nao_desliga';

// Hero exibido pra tráfego direto/orgânico e qualquer utm_term não mapeado.
const DEFAULT_VARIANT: SonoHeroVariant = 'mente_nao_desliga';

// Regra de CTA da página: botão de topo/meio é sempre "Iniciar a noite 1 ·
// grátis"; o microcopy imediato menciona "7 dias grátis" pra não parecer que só
// a noite 1 é gratuita. Compartilhado por todas as variantes.
const SHARED_CTA = 'Iniciar a noite 1 · grátis';
const SHARED_MICROCOPY = '7 dias grátis · R$ 0 hoje · ';

const VARIANTS: Record<SonoHeroVariant, SonoHeroCopy> = {
  mente_nao_desliga: {
    variant: 'mente_nao_desliga',
    h1Line1: 'Você não tem insônia.',
    h1Pre: 'Tem uma mente que ',
    h1Mark: 'não desliga',
    h1Pos: '.',
    lead: 'O Protocolo do Sono guia você por 7 noites pra tirar o corpo do modo alerta. 5 minutos por noite, nada mais.',
    cta: SHARED_CTA,
    microcopyPrefix: SHARED_MICROCOPY,
  },
  durma_rapido: {
    variant: 'durma_rapido',
    h1Pre: 'Durma mais rápido em ',
    h1Mark: 'apenas 7 noites',
    lead: 'Criado para quem está cansado, mas não consegue desligar a mente.',
    cta: SHARED_CTA,
    microcopyPrefix: SHARED_MICROCOPY,
  },
};

const STORAGE_KEY = 'eco.sono.hero_variant';

// Guard de módulo (não useRef): a árvore remonta quando o userId muda
// (ChatProvider/RingsProvider chaveados por userId no RootProviders), e useRef
// morre junto no remount — re-disparando o evento. Módulo sobrevive ao remount,
// então "Headline exibida" sai 1x por carregamento real da página.
let headlineTracked = false;

function resolveVariant(): SonoHeroVariant {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('utm_term');
    if (fromUrl && fromUrl in VARIANTS) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl as SonoHeroVariant;
    }
    // Backstop: o utm_term pode se perder numa navegação interna; mantém a
    // variante da chegada durante a sessão (mesmo padrão do eco.assinar.from).
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && stored in VARIANTS) return stored as SonoHeroVariant;
  } catch {
    // sessionStorage indisponível (modo privado etc.) — cai no default
  }
  return DEFAULT_VARIANT;
}

export function useSonoHeroVariant(): SonoHeroCopy {
  const copy = useMemo(() => VARIANTS[resolveVariant()], []);

  useEffect(() => {
    if (headlineTracked) return;
    headlineTracked = true;
    try {
      trackHeadlineExibida({ variant: copy.variant });
    } catch {
      // tracking nunca pode quebrar a página
    }
  }, [copy.variant]);

  return copy;
}
