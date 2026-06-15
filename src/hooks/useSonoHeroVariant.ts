import { useEffect, useMemo } from 'react';
import { trackHeadlineExibida, registerSonoHeroVariant } from '@/lib/mixpanelAssinarFunnel';

/**
 * Variante do hero da landing /sono, roteada por `?hero=`.
 *
 * Motivo: o DEFAULT é "Dormir bem sem remédio" (`sem_remedio`) pra todo o
 * tráfego direto/orgânico. As variantes de anúncio chegam via `?hero=<chave>`:
 * `mente_nao_desliga` ("você não tem insônia, tem uma mente que não desliga") e
 * `acorda_cansado` ("dormiu a noite toda e acordou destruído?") — continuidade
 * da narrativa do criativo, sem contaminar o tráfego frio. A disputa é decidida
 * pelo `Funil Sono · Headline exibida` (breakdown por `variant` / super property
 * `sono_hero_variant`).
 *
 * Por que NÃO `utm_term`: o template de UTM dos anúncios do FB preenche
 * `utm_term` com o ID numérico do adset (ex.: `120242534788860358`), que nunca
 * casa com a chave da variante, então tudo caía no default. O
 * `?hero=` é um param dedicado, fora da taxonomia UTM, que o FB não sobrescreve.
 * `utm_term` continua aceito como fallback pra qualquer link antigo.
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

export type SonoHeroVariant = 'sem_remedio' | 'mente_nao_desliga' | 'acorda_cansado';

// Hero exibido pra tráfego direto/orgânico e qualquer ?hero=/utm_term não mapeado.
const DEFAULT_VARIANT: SonoHeroVariant = 'sem_remedio';

const VARIANTS: Record<SonoHeroVariant, SonoHeroCopy> = {
  // Variante dos vídeos: abre com o diagnóstico e usa o CTA "noite 1" + microcopy
  // que reforça os 7 dias grátis (pra não parecer que só a noite 1 é gratuita).
  mente_nao_desliga: {
    variant: 'mente_nao_desliga',
    h1Line1: 'Você não tem insônia.',
    h1Pre: 'Tem uma mente que ',
    h1Mark: 'não desliga',
    h1Pos: '.',
    lead: 'Como 846 pessoas já fizeram: 7 noites, 5 minutos cada, pra tirar o corpo do modo alerta.',
    cta: 'Iniciar a noite 1 · grátis',
    microcopyPrefix: '7 dias grátis · R$ 0 hoje · ',
  },
  // Variante "acorda cansado": ataca a QUALIDADE do sono (dorme mas não
  // descansa), dor distinta das outras duas. Mesmo padrão de CTA/microcopy de
  // trial da variante de vídeo (tráfego pago).
  acorda_cansado: {
    variant: 'acorda_cansado',
    h1Line1: 'Dormiu a noite toda.',
    h1Pre: 'E acordou ',
    h1Mark: 'destruído',
    h1Pos: '?',
    lead: '8 horas na cama e você acorda como se não tivesse dormido. 846 pessoas reaprenderam a descansar de verdade: 7 noites, 5 minutos cada.',
    cta: 'Quero acordar descansado',
    microcopyPrefix: '7 dias grátis · R$ 0 hoje · ',
  },
  // Default (tráfego frio): mata a objeção nº 1 do público (remédio/dependência).
  // Era 'durma_rapido' ("Durma mais rápido em apenas 7 noites") — renomeado p/
  // `sem_remedio` pra o Mixpanel rotular a headline nova certa (histórico
  // 'durma_rapido' fica separado, que é o correto).
  sem_remedio: {
    variant: 'sem_remedio',
    h1Pre: 'Dormir bem ',
    h1Mark: 'sem remédio',
    h1Pos: '.',
    lead: '846 pessoas reensinaram o corpo a desligar sozinho. 7 noites, 5 minutos cada, sem tarja preta nem dependência.',
    cta: 'Começar meus 7 dias grátis',
    microcopyPrefix: 'Sem cobrança hoje · ',
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
    const params = new URLSearchParams(window.location.search);
    // `?hero=` tem prioridade (param dedicado). `utm_term` é fallback legado —
    // nos anúncios novos ele vem como ID numérico do adset e nunca casa aqui.
    const fromUrl = params.get('hero') || params.get('utm_term');
    if (fromUrl && fromUrl in VARIANTS) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl as SonoHeroVariant;
    }
    // Backstop: o param pode se perder numa navegação interna; mantém a
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
    // Super property idempotente: roda a cada mount pra todo evento do funil
    // sair quebrável por variante, mesmo quando o "Headline exibida" já foi
    // disparado (guard de módulo) num mount anterior.
    registerSonoHeroVariant(copy.variant);
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
