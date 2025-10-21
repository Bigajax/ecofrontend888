import { HealthStatus } from '../utils/health';

export type HealthBannerProps = {
  status: HealthStatus;
  visible: boolean;
};

const resolveAppearance = (status: HealthStatus) => {
  if (status === 'down') {
    return {
      className:
        'bg-rose-600 text-white shadow',
      message: 'Sem conexão com o servidor',
    };
  }

  return {
    className: 'bg-amber-400 text-amber-950 shadow',
    message: 'Conexão instável com o servidor',
  };
};

export default function HealthBanner({ status, visible }: HealthBannerProps) {
  if (!visible || (status !== 'degraded' && status !== 'down')) {
    return null;
  }

  const { className, message } = resolveAppearance(status);

  return (
    <div className={`fixed inset-x-0 top-0 z-50 px-4 py-2 text-center text-sm font-semibold ${className}`}>
      {message}
    </div>
  );
}
