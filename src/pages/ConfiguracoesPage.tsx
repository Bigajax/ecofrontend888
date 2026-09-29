import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Astro, ReinoPintura, type ReinoRegiao } from '@/components/reino/ReinoScene';
import { getReinoMood, type ReinoMood } from '@/components/reino/reinoMood';
import { RESPONSAVEL } from '@/pages/legal/responsavel';
import EstatisticasTotais from '@/components/settings/EstatisticasTotais';
import Favoritos from '@/components/settings/Favoritos';
import SubscriptionManagement from '@/components/settings/SubscriptionManagement';
import '@/components/reino/reino.css';

/**
 * Sua conta, no reino. No lugar da bolinha com a inicial, a pintura da hora.
 *
 * Sai o que não funcionava (set/2026): "Atualizar" só fazia console.log,
 * "Histórico de Humor" e "Idioma" abriam um painel vazio e a data de
 * nascimento não era usada em lugar nenhum. Agora o nome salva de verdade
 * (metadata do Supabase) e o e-mail aparece como é, sem campo que finge editar.
 */
const MENU = [
  { id: 'configuracoes', label: 'Seus dados' },
  { id: 'estatisticas', label: 'Seu progresso' },
  { id: 'favoritos', label: 'Favoritos' },
  { id: 'assinatura', label: 'Assinatura' },
] as const;

const PINTURA: Record<ReinoMood, { regiao: ReinoRegiao; foco: string }> = {
  amanhecer: { regiao: 'portico', foco: '85% 50%' },
  entardecer: { regiao: 'casa', foco: '15% 50%' },
  noite: { regiao: 'vale', foco: '45% 50%' },
};

const SAUDACAO: Record<ReinoMood, string> = {
  amanhecer: 'Bom dia',
  entardecer: 'Boa tarde',
  noite: 'Boa noite',
};

export default function ConfiguracoesPage() {
  const { user, signOut, isGuestMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mood = getReinoMood();
  const [selectedMenu, setSelectedMenu] = useState('configuracoes');

  useEffect(() => {
    const menuParam = new URLSearchParams(location.search).get('menu');
    if (menuParam) {
      setSelectedMenu(menuParam);
    } else if (location.state?.selectedMenu) {
      setSelectedMenu(location.state.selectedMenu);
    }
  }, [location.state, location.search]);

  const nomeSalvo: string = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const primeiroNome = nomeSalvo.trim().split(/\s+/)[0];
  const [nome, setNome] = useState(nomeSalvo);
  const [salvando, setSalvando] = useState(false);
  const [retorno, setRetorno] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    setNome(nomeSalvo);
  }, [nomeSalvo]);

  const salvarNome = async (e: FormEvent) => {
    e.preventDefault();
    const limpo = nome.trim();
    if (!limpo || limpo === nomeSalvo || salvando) return;
    setSalvando(true);
    setRetorno(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: limpo } });
    setSalvando(false);
    setRetorno(
      error
        ? { tipo: 'erro', texto: 'Não deu para salvar agora. Tente de novo em instantes.' }
        : { tipo: 'ok', texto: 'Nome salvo.' }
    );
  };

  const sair = async () => {
    try {
      const prefixos = ['eco.guestId', 'eco.sessionId', 'eco.chat.v1', 'sb-'];
      Object.keys(localStorage).forEach((key) => {
        if (prefixos.some((p) => key.startsWith(p))) localStorage.removeItem(key);
      });
      sessionStorage.clear();
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      window.location.href = '/login';
    }
  };

  const pintura = PINTURA[mood];

  return (
    <div className="reino-app reino-conta" data-mood={mood}>
      <HomeHeader />

      <main className="reino-corpo reino-conta__corpo">
        <header className="reino-conta__topo">
          <div className="reino-conta__retrato reino-rasgo-a">
            <ReinoPintura regiao={pintura.regiao} foco={pintura.foco} />
          </div>
          <div>
            <h1 className="reino-conta__ola">
              <Astro className="reino-conta__astro" mood={mood} />
              {isGuestMode ? 'Você está de visita.' : primeiroNome ? `${SAUDACAO[mood]}, ${primeiroNome}.` : 'Sua conta'}
            </h1>
            {!isGuestMode && user?.email && <p className="reino-conta__email">{user.email}</p>}
          </div>
        </header>

        <div className="reino-conta__grade">
          <nav className="reino-conta__menu" aria-label="Sua conta">
            {MENU.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`reino-conta__item${selectedMenu === item.id ? ' is-ativo' : ''}`}
                aria-current={selectedMenu === item.id ? 'page' : undefined}
                onClick={() => setSelectedMenu(item.id)}
              >
                {item.label}
              </button>
            ))}
            <button type="button" className="reino-conta__item is-sair" onClick={sair}>
              Sair da conta
            </button>
          </nav>

          <section className="reino-conta__painel">
            {selectedMenu === 'estatisticas' && <EstatisticasTotais />}
            {selectedMenu === 'favoritos' && <Favoritos />}
            {selectedMenu === 'assinatura' && <SubscriptionManagement />}

            {selectedMenu === 'configuracoes' && (
              <>
                <h2 className="reino-corpo__titulo reino-conta__titulo">Seus dados</h2>

                {isGuestMode ? (
                  <div className="reino-conta__visita">
                    <p>Crie uma conta para guardar o seu progresso, os favoritos e as conversas com a Eco.</p>
                    <button type="button" className="reino-placa" onClick={() => navigate('/register')}>
                      Criar conta <span aria-hidden="true">→</span>
                    </button>
                  </div>
                ) : (
                  <form className="reino-entrada__form reino-conta__form" onSubmit={salvarNome}>
                    <label className="reino-entrada__campo">
                      <span className="reino-entrada__rotulo">Como a Eco chama você</span>
                      <input
                        type="text"
                        value={nome}
                        autoComplete="name"
                        placeholder="Seu nome"
                        onChange={(e) => {
                          setNome(e.target.value);
                          setRetorno(null);
                        }}
                      />
                    </label>

                    <div className="reino-entrada__campo">
                      <span className="reino-entrada__rotulo">E-mail</span>
                      <p className="reino-conta__valor">{user?.email}</p>
                      <p className="reino-conta__dica">
                        Para trocar o e-mail, escreva para{' '}
                        <a href={`mailto:${RESPONSAVEL.email}`}>{RESPONSAVEL.email}</a>.
                      </p>
                    </div>

                    <div className="reino-entrada__retorno" role="status">
                      {retorno && <p className={retorno.tipo === 'ok' ? 'is-ok' : 'is-erro'}>{retorno.texto}</p>}
                    </div>

                    <button
                      type="submit"
                      className="reino-placa reino-conta__salvar"
                      disabled={salvando || !nome.trim() || nome.trim() === nomeSalvo}
                    >
                      {salvando ? 'Salvando' : 'Salvar'}
                    </button>
                  </form>
                )}
              </>
            )}
          </section>
        </div>

        <footer className="reino-conta__pe">
          <Link to="/termos">Termos de uso</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/cancelar-assinatura">Como cancelar</Link>
        </footer>
      </main>
    </div>
  );
}
