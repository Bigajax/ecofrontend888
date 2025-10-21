export type HealthBannerProps = {
  visible: boolean;
};

export default function HealthBanner({ visible }: HealthBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white shadow">
      Sem conexão com o servidor
    </div>
  );
}
