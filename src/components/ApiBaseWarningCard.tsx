export type ApiBaseWarningCardProps = {
  visible: boolean;
  rawApiBaseDisplay: string;
  defaultApiBase: string;
  effectiveApiBase: string;
};

export default function ApiBaseWarningCard({
  visible,
  rawApiBaseDisplay,
  defaultApiBase,
  effectiveApiBase,
}: ApiBaseWarningCardProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow">
      <p className="font-semibold">API_BASE não configurado</p>
      <p className="mt-1 text-xs leading-relaxed">Valor configurado: {rawApiBaseDisplay}. Usando padrão {defaultApiBase}.</p>
      <p className="mt-1 text-xs leading-relaxed">Endpoint ativo: {effectiveApiBase}</p>
    </div>
  );
}
