import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/supabaseClient';

const ResetSenha: React.FC = () => {
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;

    const validateRecoverySession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!active) return;

      if (sessionError) {
        setError('Não foi possível validar o link de recuperação. Tente novamente.');
        setSessionReady(false);
        return;
      }

      if (!data.session || !data.session.user) {
        setError('Este link de redefinição é inválido ou expirou. Solicite um novo link.');
        setSessionReady(false);
        return;
      }

      setSessionReady(true);
    };

    validateRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      sessionReady &&
      !success &&
      !loading &&
      novaSenha.trim().length >= 8 &&
      confirmarSenha.trim().length >= 8 &&
      novaSenha === confirmarSenha
    );
  }, [sessionReady, success, loading, novaSenha, confirmarSenha]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sessionReady || loading) return;

    const trimmedPassword = novaSenha.trim();
    const trimmedConfirmation = confirmarSenha.trim();

    if (trimmedPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      setSuccess('');
      return;
    }

    if (trimmedPassword !== trimmedConfirmation) {
      setError('As senhas devem ser iguais.');
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password: trimmedPassword,
    });

    if (updateError) {
      setError(updateError.message || 'Não foi possível atualizar a senha.');
      setLoading(false);
      return;
    }

    setSuccess('Senha atualizada!');
    setLoading(false);
    setNovaSenha('');
    setConfirmarSenha('');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl" aria-hidden />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
      </div>

      <div
        className="relative w-full max-w-md space-y-6 rounded-3xl border border-white/25 bg-white/10 p-10 text-white backdrop-blur-2xl"
      >
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Redefinir senha</h1>
          <p className="text-sm text-slate-200/80">
            Crie uma nova senha para acessar sua conta com segurança.
          </p>
        </header>

        <div aria-live="assertive" className="sr-only">
          {error}
        </div>
        <div aria-live="polite" className="sr-only">
          {success}
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
            {success}
          </p>
        )}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-100" htmlFor="nova-senha">
              Nova senha
            </label>
            <input
              id="nova-senha"
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
              minLength={8}
              disabled={!sessionReady || loading || Boolean(success)}
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-300/70 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
              placeholder="Digite a nova senha"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-100" htmlFor="confirmar-senha">
              Confirmar senha
            </label>
            <input
              id="confirmar-senha"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(event) => setConfirmarSenha(event.target.value)}
              minLength={8}
              disabled={!sessionReady || loading || Boolean(success)}
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder:text-slate-300/70 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
              placeholder="Confirme a nova senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-emerald-400/90 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-300/50 disabled:text-slate-500"
          >
            {loading ? 'Atualizando...' : 'Atualizar senha'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Voltar para login
        </button>
      </div>
    </div>
  );
};

export default ResetSenha;

