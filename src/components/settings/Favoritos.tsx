import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { trackMeditationEvent } from '@/analytics/meditation';
import { lerGuardadas, tirarDasGuardadas, type Guardada } from '@/utils/guardadas';

/**
 * Guardadas (set/2026): as meditações que a pessoa guardou no player, da mais
 * recente para a mais antiga. Tocar abre o player; "Tirar" remove. Antes: três
 * meditações fixas, iguais para todo mundo, em cartões de vidro.
 */
export default function Favoritos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [guardadas, setGuardadas] = useState<Guardada[]>(() => lerGuardadas(uid));

  const tocar = (g: Guardada) => {
    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: g.id,
          title: g.title,
          duration: g.duration,
          audioUrl: g.audioUrl,
          imageUrl: g.imageUrl,
          gradient: g.gradient,
          category: g.category,
          isPremium: false,
        },
        returnTo: '/app/configuracoes',
      },
    });
  };

  const tirar = (g: Guardada) => {
    trackMeditationEvent('Front-end: Meditation Unfavorited', {
      meditation_id: g.id,
      meditation_title: g.title,
      category: g.category || 'unknown',
      source: 'settings' as const,
    });
    tirarDasGuardadas(uid, g.id);
    setGuardadas(lerGuardadas(uid));
  };

  return (
    <div>
      <h2 className="reino-corpo__titulo reino-conta__titulo">Guardadas</h2>

      {guardadas.length === 0 ? (
        <div className="reino-dias__vazio">
          <p>Nada guardado ainda. No player, toque em Guardar e a meditação aparece aqui.</p>
          <button type="button" className="reino-placa" style={{ marginTop: 16 }} onClick={() => navigate('/app/programas')}>
            Ver as trilhas <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : (
        <ul className="reino-sumario reino-guardadas">
          {guardadas.map((g) => (
            <li key={g.id} className="reino-guardadas__item">
              <button type="button" className="reino-guardadas__tocar" onClick={() => tocar(g)}>
                <span className="reino-guardadas__capa reino-rasgo-b" aria-hidden="true">
                  <img src={g.imageUrl} alt="" loading="lazy" />
                </span>
                <span className="reino-sessao__texto">
                  <span className="reino-sumario__t">{g.title}</span>
                  <span className="reino-sessao__descricao">{g.duration}</span>
                </span>
              </button>
              <button type="button" className="reino-guardadas__tirar" onClick={() => tirar(g)}>
                Tirar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
