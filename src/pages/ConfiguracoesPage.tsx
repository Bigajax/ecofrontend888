import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, Heart, Award, Settings, MessageCircle, Globe, LogOut } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import EstatisticasTotais from '@/components/settings/EstatisticasTotais';
import Favoritos from '@/components/settings/Favoritos';
import SubscriptionManagement from '@/components/settings/SubscriptionManagement';

export default function ConfiguracoesPage() {
  const { user, signOut, isGuestMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedMenu, setSelectedMenu] = useState('configuracoes');

  useEffect(() => {
    // Verificar se há query parameter ?menu=
    const searchParams = new URLSearchParams(location.search);
    const menuParam = searchParams.get('menu');

    if (menuParam) {
      setSelectedMenu(menuParam);
    } else if (location.state?.selectedMenu) {
      setSelectedMenu(location.state.selectedMenu);
    }
  }, [location.state, location.search]);

  // Dados do usuário (mock - depois integrar com API)
  const [formData, setFormData] = useState({
    nome: user?.user_metadata?.full_name || (isGuestMode ? 'Convidado' : 'Usuário'),
    email: user?.email || (isGuestMode ? '' : ''),
    dataNascimento: user?.user_metadata?.birth_date || ''
  });

  const menuItems = [
    { id: 'estatisticas', label: 'Estatísticas totais', icon: TrendingUp },
    { id: 'favoritos', label: 'Favoritos', icon: Heart },
    { id: 'assinatura', label: 'Assinatura', icon: Award },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
    { id: 'historico', label: 'Histórico de Humor', icon: MessageCircle },
    { id: 'idioma', label: 'Idioma', icon: Globe },
    { id: 'sair', label: 'Sair', icon: LogOut },
  ];

  const handleUpdate = () => {
    console.log('Atualizar dados:', formData);
    // TODO: Implementar atualização via API
  };

  const handleExitToLogin = async () => {
    // Fazer LOGOUT completo e sair do app (funciona para usuário logado e convidado)
    try {
      // Limpar dados específicos do usuário, mantendo preferências globais
      const keysToRemove = [
        'eco.guestId',
        'eco.sessionId',
        'eco.chat.v1',
        'sb-',  // Supabase keys
      ];

      // Remove apenas chaves relacionadas ao usuário/sessão
      Object.keys(localStorage).forEach(key => {
        if (keysToRemove.some(prefix => key.startsWith(prefix))) {
          localStorage.removeItem(key);
        }
      });

      // Limpar sessionStorage
      sessionStorage.clear();

      // Fazer logout do Supabase (se houver sessão)
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Redireciona para a página de login
      window.location.href = '/login';
    }
  };

  const handleMenuClick = (itemId: string) => {
    if (itemId === 'sair') {
      handleExitToLogin();
    } else {
      setSelectedMenu(itemId);
    }
  };

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid var(--neutral-border)',
    backgroundColor: 'var(--surface-card)',
    color: 'var(--text-primary)',
  };

  const inputDisabledStyle: React.CSSProperties = {
    ...inputStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
      <HomeHeader />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)' }}>
                {user?.user_metadata?.full_name?.charAt(0) || (isGuestMode ? 'C' : 'U')}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {user?.user_metadata?.full_name || (isGuestMode ? 'Convidado' : 'Usuário')}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {isGuestMode ? 'Modo convidado' : user?.email?.split('@')[0] || '@usuario'}
            </p>
          </div>
        </div>

        {/* Main Content: Sidebar + Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Menu */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedMenu === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                      style={isSelected
                        ? { backgroundColor: 'var(--neutral-hover)', color: 'var(--accent)' }
                        : { color: 'var(--text-muted)' }
                      }
                    >
                      <Icon size={20} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-9">
            <div className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
              {selectedMenu === 'estatisticas' && <EstatisticasTotais />}
              {selectedMenu === 'favoritos' && <Favoritos />}
              {selectedMenu === 'assinatura' && <SubscriptionManagement />}

              {selectedMenu === 'configuracoes' && (
                <>
                  <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Configurações</h2>

                  {/* Guest mode warning */}
                  {isGuestMode && (
                    <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--neutral-hover)', border: '1px solid var(--neutral-border)' }}>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <strong>Modo convidado:</strong> Você está usando o Ecotopia como convidado.
                        <button
                          onClick={() => navigate('/register')}
                          className="ml-1 underline font-semibold"
                          style={{ color: 'var(--accent)' }}
                        >
                          Crie uma conta
                        </button>
                        {' '}para salvar suas informações e acessar todos os recursos.
                      </p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Section Title */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
                        Informações Pessoais
                      </h3>

                      {/* Form Fields */}
                      <div className="space-y-4">
                        {/* Nome */}
                        <div>
                          <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Nome</label>
                          <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            disabled={isGuestMode}
                            placeholder={isGuestMode ? "Disponível apenas para usuários registrados" : ""}
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-transparent transition-all"
                            style={isGuestMode ? inputDisabledStyle : inputStyle}
                          />
                        </div>

                        {/* E-mail */}
                        <div>
                          <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>E-mail</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={isGuestMode}
                            placeholder={isGuestMode ? "Disponível apenas para usuários registrados" : ""}
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-transparent transition-all"
                            style={isGuestMode ? inputDisabledStyle : inputStyle}
                          />
                        </div>

                        {/* Data de Nascimento */}
                        <div>
                          <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Data de nascimento</label>
                          <input
                            type="text"
                            value={formData.dataNascimento}
                            onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                            disabled={isGuestMode}
                            placeholder={isGuestMode ? "Disponível apenas para usuários registrados" : ""}
                            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-transparent transition-all"
                            style={isGuestMode ? inputDisabledStyle : inputStyle}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Update Button */}
                    {isGuestMode ? (
                      <button
                        onClick={() => navigate('/register')}
                        className="min-h-[48px] px-8 py-3 font-medium rounded-full transition-all hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)' }}
                      >
                        Criar conta gratuita
                      </button>
                    ) : (
                      <button
                        onClick={handleUpdate}
                        className="min-h-[48px] px-8 py-3 font-medium rounded-full transition-all hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)' }}
                      >
                        Atualizar
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
