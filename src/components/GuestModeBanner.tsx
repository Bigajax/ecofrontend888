import '@/components/reino/reino.css';
import { useNavigate } from 'react-router-dom';

interface GuestModeBannerProps {
  /** Destino pós-cadastro. Quando informado, vai para /register?returnTo=<encoded>. */
  returnTo?: string;
}

/**
 * GuestModeBanner
 *
 * Barra informativa persistente exibida para usuários em modo convidado.
 * Indica que o progresso não será salvo e oferece CTA para criar conta.
 */
export default function GuestModeBanner({ returnTo }: GuestModeBannerProps) {
  const navigate = useNavigate();

  const handleCreateAccount = () => {
    navigate(returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register');
  };

  // No reino: faixa de papel com linha ocre, no mesmo tom da home.
  return (
    <div className="reino-visita">
      <p>Você está de visita. Crie uma conta para guardar o que fizer aqui.</p>
      <button type="button" onClick={handleCreateAccount}>
        Criar conta
      </button>
    </div>
  );
}
