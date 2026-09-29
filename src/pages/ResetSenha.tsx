import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';
import Entrada from '@/components/reino/ReinoEntrada';

/**
 * Nova senha, aberta pelo link do e-mail. A sessão de recuperação pode chegar um
 * instante depois da página (o Supabase lê o link da URL), então a validação
 * também escuta o evento de login antes de declarar o link vencido.
 */
const ResetSenha: React.FC = () => {
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkVencido, setLinkVencido] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (active && session?.user) {
        setSessionReady(true);
        setLinkVencido(false);
      }
    });

    const validar = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.user) {
        setSessionReady(true);
        return;
      }
      // dá um tempo para o link ser lido antes de dizer que venceu
      window.setTimeout(async () => {
        if (!active) return;
        const { data: again } = await supabase.auth.getSession();
        if (!active) return;
        if (again.session?.user) setSessionReady(true);
        else setLinkVencido(true);
      }, 1500);
    };

    validar();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const canSubmit = useMemo(
    () => sessionReady && !success && !loading && novaSenha.trim().length >= 8 && novaSenha === confirmarSenha,
    [sessionReady, success, loading, novaSenha, confirmarSenha]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionReady || loading) return;

    const senha = novaSenha.trim();
    if (senha.length < 8) {
      setError('A senha precisa de pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirmarSenha.trim()) {
      setError('As duas senhas não são iguais.');
      return;
    }

    setLoading(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (updateError) {
      setError('Não deu para trocar a senha agora. Tente de novo em instantes.');
      return;
    }
    setSuccess(true);
    setNovaSenha('');
    setConfirmarSenha('');
  };

  if (success) {
    return (
      <Entrada>
        <h1 className="reino-entrada__titulo">Senha trocada.</h1>
        <p className="reino-entrada__sobre">Da próxima vez, entre com a senha nova.</p>
        <button type="button" className="reino-placa reino-entrada__entrar" onClick={() => navigate('/app')}>
          Entrar no reino <span aria-hidden="true">→</span>
        </button>
      </Entrada>
    );
  }

  if (linkVencido) {
    return (
      <Entrada>
        <h1 className="reino-entrada__titulo">Este link já venceu.</h1>
        <p className="reino-entrada__sobre">
          Links de nova senha valem por pouco tempo. Na entrada, digite o seu e-mail e toque em "Esqueceu a senha?" para
          receber outro.
        </p>
        <button type="button" className="reino-placa reino-entrada__entrar" onClick={() => navigate('/login')}>
          Ir para a entrada <span aria-hidden="true">→</span>
        </button>
      </Entrada>
    );
  }

  return (
    <Entrada>
      <h1 className="reino-entrada__titulo">Crie uma senha nova.</h1>
      <p className="reino-entrada__sobre">Pelo menos 8 caracteres.</p>

      <form className="reino-entrada__form" onSubmit={handleSubmit} noValidate>
        <div className="reino-entrada__campo">
          <label className="reino-entrada__rotulo" htmlFor="nova-senha">
            Nova senha
          </label>
          <span className="reino-entrada__senha">
            <input
              id="nova-senha"
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => {
                setNovaSenha(e.target.value);
                setError('');
              }}
              disabled={!sessionReady || loading}
              required
            />
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              className="reino-entrada__olho"
              aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={mostrar}
            >
              {mostrar ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </div>

        <label className="reino-entrada__campo">
          <span className="reino-entrada__rotulo">Repita a senha</span>
          <input
            id="confirmar-senha"
            type={mostrar ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(e) => {
              setConfirmarSenha(e.target.value);
              setError('');
            }}
            disabled={!sessionReady || loading}
            required
          />
        </label>

        <div className="reino-entrada__retorno">
          <div role="alert" aria-live="assertive">
            {error && <p className="is-erro">{error}</p>}
          </div>
          <div role="status" aria-live="polite">
            {!error && !sessionReady && <p>Abrindo o link…</p>}
            {!error && confirmarSenha && novaSenha !== confirmarSenha && <p>As duas ainda não são iguais.</p>}
          </div>
        </div>

        <button type="submit" className="reino-placa reino-entrada__entrar" disabled={!canSubmit}>
          {loading ? 'Salvando…' : 'Salvar senha'}
        </button>
      </form>

      <div className="reino-entrada__pe">
        <button type="button" className="reino-entrada__link" onClick={() => navigate('/login')}>
          Voltar para a entrada
        </button>
      </div>
    </Entrada>
  );
};

export default ResetSenha;
