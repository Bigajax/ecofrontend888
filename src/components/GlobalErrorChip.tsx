export type GlobalErrorChipProps = {
  visible: boolean;
  onClick: () => void;
};

export default function GlobalErrorChip({ visible, onClick }: GlobalErrorChipProps) {
  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-4 right-4 z-50 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-amber-600"
    >
      Erro capturado
    </button>
  );
}
