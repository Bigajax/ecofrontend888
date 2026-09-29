import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  EVENTO_CAMINHO,
  estadoDoCaminho,
  juntarDiasDePratica,
  lerDiasDePratica,
  type EstadoDoCaminho,
} from '@/utils/caminhoReino';

/** Datas dos Cinco Anéis já concluídos no aparelho (contam como dias de prática). */
function diasDosAneis(uid: string | null): string[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(`eco.rings.v1.rituals.${uid || 'anon'}`) || '[]');
    return Array.isArray(bruto)
      ? bruto.filter((r) => r?.status === 'completed' && typeof r.date === 'string').map((r) => r.date)
      : [];
  } catch {
    return [];
  }
}

/**
 * Onde a pessoa está no caminho do reino. Atualiza sozinho quando um dia de
 * prática é registrado em qualquer tela.
 */
export function useCaminho(): EstadoDoCaminho {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [dias, setDias] = useState(() => lerDiasDePratica(uid).length);

  useEffect(() => {
    // Dias que já existiam antes do caminho (Cinco Anéis) e dias feitos como
    // visitante passam para a conta, sem disparar marco.
    juntarDiasDePratica(uid, diasDosAneis(uid));
    if (uid) {
      const doVisitante = lerDiasDePratica(null);
      if (doVisitante.length > 0) {
        juntarDiasDePratica(uid, doVisitante);
        try {
          localStorage.removeItem('eco.caminho.v1.guest');
        } catch {
          // nada a limpar
        }
      }
    }
    setDias(lerDiasDePratica(uid).length);

    const atualizar = () => setDias(lerDiasDePratica(uid).length);
    window.addEventListener(EVENTO_CAMINHO, atualizar);
    window.addEventListener('storage', atualizar);
    return () => {
      window.removeEventListener(EVENTO_CAMINHO, atualizar);
      window.removeEventListener('storage', atualizar);
    };
  }, [uid]);

  return estadoDoCaminho(dias);
}
