import { SHOW_API_BASE_WARNING } from "@/config/apiBase";

export type ApiBaseWarningCardProps = {
  rawApiBaseDisplay: string;
  defaultApiBase: string;
  effectiveApiBase: string;
};

export default function ApiBaseWarningCard({
  rawApiBaseDisplay,
  defaultApiBase,
  effectiveApiBase,
}: ApiBaseWarningCardProps) {
  if (!SHOW_API_BASE_WARNING) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">API_BASE não configurado</p>
      <p className="mt-1 text-xs leading-relaxed">RAW_API_BASE (bruto): {rawApiBaseDisplay}</p>
      <p className="mt-1 text-xs leading-relaxed">Padrão aplicado: {defaultApiBase}</p>
      <p className="mt-1 text-xs leading-relaxed">Endpoint ativo (getApiBase): {effectiveApiBase}</p>
    </div>
  );
}
