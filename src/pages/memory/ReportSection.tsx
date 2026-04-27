import React, { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { useMemoryData } from "./memoryData";
import MapaEmocional2D from "../../components/MapaEmocional2D";
import LinhaDoTempoEmocional from "../../components/LinhaDoTempoEmocional";
import StackedAreaSemanalEmocional from "../../components/StackedAreaSemanalEmocional";
import DailyIntensityStrip from "../../components/DailyIntensityStrip";
import EcoBubbleLoading from "../../components/EcoBubbleLoading";
import { useSubscriptionTier, usePremiumContent } from "../../hooks/usePremiumContent";
import { canAccess } from "../../constants/meditationTiers";
import UpgradeModal from "../../components/subscription/UpgradeModal";

/* ---------- Helpers / UI ---------- */

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-1">
    <div
      className="flex items-center gap-2 text-[28px] leading-tight font-semibold transition-colors duration-300"
      style={{
        color: 'var(--eco-text, #38322A)',
        fontFamily: 'var(--font-display, Playfair Display, Georgia, serif)',
      }}
    >
      <span>{title}</span>
    </div>
    {subtitle && (
      <p
        className="text-[13px] mt-1 transition-colors duration-300"
        style={{ color: 'var(--eco-muted, #9C938A)' }}
      >
        {subtitle}
      </p>
    )}
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: "blue" | "gray" | "orange" }> = ({
  children,
  tone = "gray",
}) => {
  const toneStyles = {
    blue: {
      backgroundColor: 'rgba(163, 145, 126, 0.12)',
      color: 'var(--eco-user, #A7846C)',
      borderColor: 'rgba(163, 145, 126, 0.2)',
    },
    gray: {
      backgroundColor: '#FFFFFF',
      color: 'var(--eco-text, #38322A)',
      borderColor: 'rgba(0,0,0,0.07)',
    },
    orange: {
      backgroundColor: 'rgba(198, 169, 149, 0.12)',
      color: 'var(--eco-accent, #C6A995)',
      borderColor: 'rgba(198, 169, 149, 0.2)',
    },
  };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all duration-300 backdrop-blur-sm"
      style={toneStyles[tone]}
    >
      {children}
    </span>
  );
};

const Card: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  right,
  children,
}) => (
  <div
    className="rounded-2xl border p-4 sm:p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 4px 24px rgba(13,52,97,0.06)',
    }}
  >
    <div className="flex items-start justify-between mb-3">
      <h4
        className="text-[17px] font-semibold tracking-[-0.01em] transition-colors duration-300"
        style={{ color: 'var(--eco-text, #38322A)' }}
      >
        {title}
      </h4>
      <div className="shrink-0">{right}</div>
    </div>
    {children}
  </div>
);

const EmptyState: React.FC<{ title: string; desc?: string; icon?: string }> = ({
  title,
  desc,
  icon = "🪷",
}) => (
  <div className="flex flex-col items-center text-center py-10">
    <div className="text-5xl mb-4">{icon}</div>
    <p
      className="text-base sm:text-lg font-medium mb-1 transition-colors duration-300"
      style={{ color: 'var(--eco-text, #38322A)' }}
    >
      {title}
    </p>
    {desc && (
      <p
        className="text-sm max-w-xs transition-colors duration-300"
        style={{ color: 'var(--eco-muted, #9C938A)' }}
      >
        {desc}
      </p>
    )}
  </div>
);

const MetricRow: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="flex items-baseline justify-between py-1.5">
    <span
      className="text-[13px] transition-colors duration-300"
      style={{ color: 'var(--eco-muted, #9C938A)' }}
    >
      {label}
    </span>
    <div
      className="text-[20px] font-semibold transition-colors duration-300"
      style={{ color: 'var(--eco-user, #A7846C)' }}
    >
      {value}
    </div>
    {hint && (
      <span
        className="ml-2 text-[12px] transition-colors duration-300"
        style={{ color: 'var(--eco-muted, #9C938A)' }}
      >
        {hint}
      </span>
    )}
  </div>
);

const Disclosure: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="mt-3 border-t pt-3 transition-colors duration-300"
      style={{ borderColor: 'rgba(0,0,0,0.07)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left transition-colors duration-300 hover:opacity-80"
        aria-expanded={open}
      >
        <span
          className="text-[13px] font-medium"
          style={{ color: 'var(--eco-text, #38322A)' }}
        >
          {title}
        </span>
        <span
          className="text-xl leading-none transition-transform duration-300"
          style={{ color: 'var(--eco-muted, #9C938A)' }}
        >
          {open ? "–" : "+"}
        </span>
      </button>
      {open && (
        <div
          className="mt-2 text-[12px] space-y-2 transition-colors duration-300"
          style={{ color: 'var(--eco-text, #38322A)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const QuadrantLegend = () => (
  <div className="grid grid-cols-2 gap-2 text-[11px]">
    {[
      { title: "Positivo • Calmo", desc: "(X:+, Y:−) tranquilo, satisfeito" },
      { title: "Positivo • Intenso", desc: "(X:+, Y:+) animado, eufórico" },
      { title: "Negativo • Calmo", desc: "(X:−, Y:−) melancólico, cansado" },
      { title: "Negativo • Intenso", desc: "(X:−, Y:+) irritado, ansioso" },
    ].map((item, idx) => (
      <div
        key={idx}
        className="rounded-lg border p-2 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: 'rgba(0,0,0,0.07)',
        }}
      >
        <div
          className="font-medium transition-colors duration-300"
          style={{ color: 'var(--eco-text, #38322A)' }}
        >
          {item.title}
        </div>
        <div
          className="text-[11px] transition-colors duration-300"
          style={{ color: 'var(--eco-muted, #9C938A)' }}
        >
          {item.desc}
        </div>
      </div>
    ))}
  </div>
);

/* ---------- Premium Gate ---------- */

const RelatorioPremiumTeaser: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
  <section className="space-y-4">
    <div
      className="sticky top-0 z-20 -mx-1 px-1 py-2 border-b backdrop-blur"
      style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.07)' }}
    >
      <SectionHeader title="Resumo" subtitle="Relatório Emocional" />
    </div>

    <div className="grid grid-cols-1 gap-4">
      {/* Placeholder 1 */}
      {(['Intensidade por Dia', 'Volume Semanal', 'Mapa Emocional 2D'] as const).map((title) => (
        <div key={title} className="relative rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(0,0,0,0.07)', minHeight: 200 }}>
          {/* Simulated blurred content */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f3eeE7] to-[#e8ddd5] blur-[3px] opacity-60" />
          <div className="absolute inset-0 backdrop-blur-[6px] bg-white/30" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md">
              <Lock size={22} className="text-[var(--eco-user,#A7846C)]" />
            </div>
            <span className="text-sm font-semibold text-[var(--eco-text,#38322A)]">{title}</span>
          </div>
        </div>
      ))}
    </div>

    {/* CTA */}
    <div className="rounded-2xl border p-5 text-center" style={{ borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(237,244,255,0.5)' }}>
      <p className="font-semibold text-[var(--eco-text,#38322A)] mb-1">Relatório Emocional Premium</p>
      <p className="text-sm text-[var(--eco-muted,#9C938A)] mb-4">
        Visualize padrões, mapa 2D e intensidade emocional ao longo do tempo. Exclusivo para Premium.
      </p>
      <button
        onClick={onUpgrade}
        className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #1A4FB5 0%, #0D3461 100%)' }}
      >
        <Lock size={14} />
        Desbloquear Relatório
      </button>
      <p className="mt-2 text-[11px] text-[var(--eco-muted,#9C938A)]">Sempre gratuito cancelar</p>
    </div>
  </section>
);

/* ---------- Main ---------- */

const ReportSection: React.FC = () => {
  const tier = useSubscriptionTier();
  const { requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
  const { relatorio, relatorioLoading, relatorioError, relatorioErrorDetails } = useMemoryData();
  const [heatmapRange, setHeatmapRange] = useState<30 | 90 | 180 | undefined>(30);
  const isFree = !canAccess('relatorio_emocional', tier);

  // useMemo sempre chamado (antes de qualquer early return — regras de hooks)
  const mapaEmocional2D = useMemo(() => {
    if (!Array.isArray(relatorio?.mapa_emocional))
      return [] as Array<{
        emocao: string;
        valenciaNormalizada: number;
        excitacaoNormalizada: number;
        cor?: string;
      }>;

    return relatorio!.mapa_emocional
      .map((p: any) => ({
        emocao: p.emocao ?? p.emocao_principal ?? "Desconhecida",
        valenciaNormalizada: clamp(typeof p.valencia === "number" ? p.valencia : p.x ?? 0),
        excitacaoNormalizada: clamp(typeof p.excitacao === "number" ? p.excitacao : p.y ?? 0),
        cor: p.cor ?? undefined,
      }))
      .filter(
        (p: any) =>
          typeof p.valenciaNormalizada === "number" &&
          typeof p.excitacaoNormalizada === "number"
      );
  }, [relatorio]);

  // FREE TIER: mostrar teaser elegante (after all hooks)
  if (isFree) {
    return (
      <>
        <RelatorioPremiumTeaser onUpgrade={() => requestUpgrade('relatorio_emocional')} />
        <UpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          source="relatorio_emocional"
        />
      </>
    );
  }

  if (relatorioLoading) {
    return (
      <section
        className="space-y-4 max-h-[82vh] overflow-y-auto pr-1 transition-colors duration-300"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div
          className="sticky top-0 z-20 -mx-1 px-1 py-2 border-b backdrop-blur supports-[backdrop-filter]:backdrop-blur transition-colors duration-300"
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderColor: 'rgba(0,0,0,0.07)',
          }}
        >
          <div className="flex items-center justify-between">
            <SectionHeader title="Resumo" subtitle="Relatório Emocional" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card title="Carregando análise…">
            <div className="h-48 grid place-items-center">
              <EcoBubbleLoading size={80} text="Preparando seu relatório..." />
            </div>
          </Card>

          <Card title="Carregando visualizações…">
            <div className="h-56 grid place-items-center">
              <EcoBubbleLoading size={60} />
            </div>
          </Card>
        </div>
      </section>
    );
  }

  if (relatorioError) {
    return (
      <div
        className="rounded-2xl border p-5 text-sm backdrop-blur-sm"
        style={{
          backgroundColor: 'rgba(217, 119, 6, 0.08)',
          borderColor: 'rgba(217, 119, 6, 0.3)',
          color: 'var(--eco-text, #38322A)',
        }}
      >
        <p className="font-semibold">{relatorioError}</p>
        {relatorioErrorDetails?.status || relatorioErrorDetails?.message ? (
          <p
            className="mt-2 text-[12px] transition-colors duration-300"
            style={{ color: 'var(--eco-muted, #9C938A)' }}
          >
            Detalhes técnicos:{' '}
            {relatorioErrorDetails?.status
              ? `${relatorioErrorDetails.status}${
                  relatorioErrorDetails.statusText ? ` ${relatorioErrorDetails.statusText}` : ''
                }`
              : 'status indisponível'}
            {relatorioErrorDetails?.message ? ` • ${relatorioErrorDetails.message}` : ''}
          </p>
        ) : null}
      </div>
    );
  }

  const hasLT = !!relatorio?.linha_do_tempo_intensidade?.length;
  const hasMapa = (mapaEmocional2D.length ?? 0) > 0;

  const rangeLabel =
    heatmapRange === 30 ? "Últimos 30 dias" :
    heatmapRange === 90 ? "Últimos 90 dias" :
    heatmapRange === 180 ? "Últimos 180 dias" : "Ano";

  return (
    <section
      className="space-y-4 max-h-[82vh] overflow-y-auto pr-1 transition-colors duration-300"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      {/* Header sticky */}
      <div
        className="sticky top-0 z-20 -mx-1 px-1 py-2 border-b backdrop-blur supports-[backdrop-filter]:backdrop-blur transition-colors duration-300"
        style={{
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderColor: 'rgba(0,0,0,0.07)',
        }}
      >
        <div className="flex items-center justify-between">
          <SectionHeader title="Resumo" subtitle="Relatório Emocional" />
        </div>
      </div>

      <div className="h-2" />

      <div className="grid grid-cols-1 gap-4">
        {/* 🔷 Intensidade por Dia */}
        {hasLT && (
          <Card title="Intensidade por Dia" right={<Pill tone="orange">{rangeLabel}</Pill>}>
            <div className="mb-2 flex gap-2">
              {([30, 90, 180] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setHeatmapRange(v)}
                  className="px-3 py-1.5 rounded-full text-[12px] border font-medium transition-all duration-300 hover:-translate-y-0.5"
                  style={
                    heatmapRange === v
                      ? {
                          background: 'linear-gradient(135deg, #1A4FB5 0%, #0D3461 100%)',
                          color: 'white',
                          borderColor: '#1A4FB5',
                          boxShadow: '0 2px 12px rgba(26,79,181,0.20)',
                        }
                      : {
                          backgroundColor: '#FFFFFF',
                          color: 'var(--eco-text, #38322A)',
                          borderColor: 'rgba(0,0,0,0.07)',
                        }
                  }
                >
                  {v} d
                </button>
              ))}
              <button
                onClick={() => setHeatmapRange(undefined)}
                className="px-3 py-1.5 rounded-full text-[12px] border font-medium transition-all duration-300 hover:-translate-y-0.5"
                style={
                  heatmapRange === undefined
                    ? {
                        background: 'linear-gradient(90deg, var(--eco-user, #A7846C), var(--eco-accent, #C6A995))',
                        color: 'white',
                        borderColor: 'var(--eco-accent, #C6A995)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      }
                    : {
                        backgroundColor: '#FFFFFF',
                        color: 'var(--eco-text, #38322A)',
                        borderColor: 'rgba(0,0,0,0.07)',
                      }
                }
              >
                Ano
              </button>
            </div>

            <div
              className="rounded-2xl overflow-hidden px-3 py-2 border transition-all duration-300"
              style={{
                backgroundColor: 'rgba(237,244,255,0.35)',
                borderColor: 'rgba(0,0,0,0.07)',
              }}
            >
              <DailyIntensityStrip
                data={relatorio!.linha_do_tempo_intensidade}
                rangeDays={heatmapRange}
                trackHeight={22}
              />
            </div>

            <div
              className="mt-2 text-[12px] transition-colors duration-300"
              style={{ color: 'var(--eco-muted, #9C938A)' }}
            >
              <p>
                <span
                  className="font-medium transition-colors duration-300"
                  style={{ color: 'var(--eco-text, #38322A)' }}
                >
                  Como ler:
                </span>{' '}
                cada quadrado é um dia; claro = baixa intensidade, escuro = alta (0–10). Sequências
                escuras indicam semanas mais intensas.
              </p>
            </div>
          </Card>
        )}

        {/* 🔶 Stacked Area Semanal */}
        {hasLT && (
          <Card title="Volume Semanal por Domínio" right={<Pill tone="orange">Semanas</Pill>}>
            <div
              className="rounded-2xl overflow-hidden border transition-all duration-300"
              style={{
                backgroundColor: 'rgba(237,244,255,0.35)',
                borderColor: 'rgba(0,0,0,0.07)',
              }}
            >
              <StackedAreaSemanalEmocional
                data={relatorio!.linha_do_tempo_intensidade}
                height={240}
              />
            </div>
            <div
              className="mt-2 text-[12px] transition-colors duration-300"
              style={{ color: 'var(--eco-muted, #9C938A)' }}
            >
              <p>
                <span
                  className="font-medium transition-colors duration-300"
                  style={{ color: 'var(--eco-text, #38322A)' }}
                >
                  Como ler:
                </span>{' '}
                cada faixa mostra o quanto cada domínio contribuiu em cada semana. Áreas maiores
                indicam semanas mais intensas.
              </p>
            </div>
          </Card>
        )}

        {/* 🟢 Mapa 2D */}
        {hasMapa && (
          <Card title="Mapa Emocional 2D" right={<Pill tone="blue">Emoções</Pill>}>
            <div
              className="rounded-2xl overflow-hidden border transition-all duration-300"
              style={{
                backgroundColor: 'rgba(237,244,255,0.35)',
                borderColor: 'rgba(0,0,0,0.07)',
              }}
            >
              <MapaEmocional2D data={mapaEmocional2D} height={340} radius={14} />
            </div>

            <div
              className="mt-2 text-[12px] transition-colors duration-300"
              style={{ color: 'var(--eco-muted, #9C938A)' }}
            >
              <p>
                <span
                  className="font-medium transition-colors duration-300"
                  style={{ color: 'var(--eco-text, #38322A)' }}
                >
                  Como ler:
                </span>{' '}
                as células hexagonais indicam <b>densidade de memórias</b>; quanto mais escura a
                área, mais recorrentes foram registros naquela região. X = valência (negativa →
                positiva) e Y = excitação (baixa → alta).
              </p>
            </div>

            <div className="mt-3">
              <QuadrantLegend />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <MetricRow label="Pontos plotados" value={<span>{mapaEmocional2D.length}</span>} />
              <MetricRow label="Memórias" value={<span>{relatorio?.total_memorias ?? "—"}</span>} />
              <MetricRow label="Última atualização" value={<span>{relatorio?.atualizado_em ?? "—"}</span>} />
            </div>

            <Disclosure title="Detalhes do Mapa 2D">
              <ul className="list-disc pl-4 space-y-1">
                <li>Use os quadrantes para distinguir calmo/intenso e negativo/positivo.</li>
                <li>Manchas densas sugerem estados recorrentes.</li>
                <li>Compare períodos diferentes para observar mudanças.</li>
              </ul>
            </Disclosure>
          </Card>
        )}

        {/* 🚧 Detalhe por Domínio – temporariamente "fechado" */}
        {hasLT && (
          <Card title="Detalhe por Domínio" right={<Pill tone="orange">Linhas</Pill>}>
            <div
              className="relative rounded-2xl overflow-hidden border transition-all duration-300"
              style={{
                backgroundColor: 'rgba(237,244,255,0.35)',
                borderColor: 'rgba(0,0,0,0.07)',
              }}
            >
              {/* Conteúdo "embaçado" */}
              <div className="blur-[2px] select-none pointer-events-none">
                <LinhaDoTempoEmocional data={relatorio!.linha_do_tempo_intensidade} yMax={10} />
              </div>

              {/* Véu turvo + selo Em construção */}
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div
                  className="absolute inset-0 backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(237,244,255,0.85)' }}
                />
                <div className="relative">
                  <span
                    className="px-3 py-1.5 rounded-full border text-sm font-medium backdrop-blur-sm transition-all duration-300"
                    style={{
                      borderColor: 'rgba(0,0,0,0.07)',
                      backgroundColor: 'rgba(255,255,255,0.97)',
                      color: 'var(--eco-text, #38322A)',
                    }}
                  >
                    Em construção
                  </span>
                </div>
              </div>
            </div>

            <div
              className="mt-2 text-[12px] transition-colors duration-300"
              style={{ color: 'var(--eco-muted, #9C938A)' }}
            >
              Esta visualização está passando por melhorias — em breve liberamos a versão completa.
            </div>
          </Card>
        )}

        {!hasMapa && !hasLT && (
          <Card title="Relatório Emocional">
            <EmptyState
              title="Seu Relatório Emocional está em branco"
              desc="Para criar seu primeiro relatório, compartilhe suas memórias mais marcantes com a Eco."
            />
          </Card>
        )}

        {!!relatorio && (
          <div
            className="text-center text-[12px] transition-colors duration-300"
            style={{ color: 'var(--eco-muted, #9C938A)' }}
          >
            Total de memórias significativas: {relatorio.total_memorias ?? "Indisponível"}
          </div>
        )}
      </div>
    </section>
  );
};

export default ReportSection;
