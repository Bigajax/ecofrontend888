import { useState, useEffect } from 'react';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5FBFF] via-[#E3F5FF] to-[#F5FBFF]">
      <HomeHeader />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-gray-300 overflow-hidden">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6EC8FF] to-[#4BA8E0] text-white text-2xl font-bold">
                {user?.user_metadata?.full_name?.charAt(0) || (isGuestMode ? 'C' : 'U')}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.user_metadata?.full_name || (isGuestMode ? 'Convidado' : 'Usuário')}
            </h1>
            <p className="text-sm text-gray-500">
              {isGuestMode ? 'Modo convidado' : user?.email?.split('@')[0] || '@usuario'}
            </p>
          </div>
        </div>

        {/* Main Content: Sidebar + Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Menu */}
          <div className="lg:col-span-3">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-4">
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedMenu === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-[#F5FBFF] text-[#6EC8FF]'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
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
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-6 md:p-8">
              {selectedMenu === 'estatisticas' && <EstatisticasTotais />}
              {selectedMenu === 'favoritos' && <Favoritos />}
              {selectedMenu === 'assinatura' && <SubscriptionManagement />}

              {selectedMenu === 'configuracoes' && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações</h2>

                  {/* Guest mode warning */}
                  {isGuestMode && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-sm text-blue-800">
                        <strong>Modo convidado:</strong> Você está usando o ECO como convidado.
                        <button
                          onClick={() => navigate('/register')}
                          className="ml-1 underline font-semibold hover:text-blue-900"
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
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                        Informações Pessoais
                      </h3>

                      {/* Form Fields */}
                      <div className="space-y-4">
                        {/* Nome */}
                        <div>
                          <label className="block text-sm text-gray-500 mb-2">Nome</label>
                          <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            disabled={isGuestMode}
                            placeholder={isGuestMode ? "Disponível apenas para usuários registrados" : ""}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6EC8FF] focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                          />
                        </div>

                        {/* E-mail */}
                        <div>
                          <label className="block text-sm text-gray-500 mb-2">E-mail</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={isGuestMode}
                            placeholder={isGuestMode ? "Disponível apenas para usuários registrados" : ""}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6EC8FF] focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                          />
                        </div>

                        {/* Data de Nascimento */}
                        <div>
                          <label className="block text-sm text-gray-500 mb-2">Data de nascimento</label>
                          <input
                            type="text"
                            value={formData.dataNascimento}
                            onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                            disabled={isGuestMode}
                            placeholder={isGuestMode ? "Disponível apenas para usuários registrados" : ""}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#6EC8FF] focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Update Button */}
                    {isGuestMode ? (
                      <button
                        onClick={() => navigate('/register')}
                        className="px-8 py-3 bg-[#6EC8FF] text-white font-medium rounded-full hover:bg-[#4BA8E0] transition-colors shadow-md hover:shadow-lg active:scale-95"
                      >
                        Criar conta gratuita
                      </button>
                    ) : (
                      <button
                        onClick={handleUpdate}
                        className="px-8 py-3 bg-[#6EC8FF] text-white font-medium rounded-full hover:bg-[#4BA8E0] transition-colors shadow-md hover:shadow-lg active:scale-95"
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
