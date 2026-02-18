import { useState, useEffect, Component, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useConversionMetrics } from '@/hooks/useConversionMetrics';
import { useAuth } from '@/contexts/AuthContext';
import PhoneFrame from '@/components/PhoneFrame';

// Admin emails whitelist
const ADMIN_EMAILS = [
  'admin@ecotopia.com',
  'rafael@ecotopia.com',
  'rafaelrazeira@hotmail.com',
  // Add more admin emails here
];

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  color: string;
}

function MetricCard({ label, value, icon: Icon, change, color }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-eco-line p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-${color}/10 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}`} />
        </div>
        {change && (
          <span className={`text-sm font-semibold ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm text-eco-muted">{label}</p>
    </motion.div>
  );
}

function ConversionDashboard() {
  const { user } = useAuth();
  const {
    userDistribution,
    conversionFunnel,
    churnRate,
    ltv,
    triggerStats,
    loading,
    error,
    refetch,
  } = useConversionMetrics();

  const [exporting, setExporting] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isAdmin && !loading) {
      // Redirect non-admin users
      window.location.href = '/app';
    }
  }, [isAdmin, loading]);

  if (loading) {
    return (
      <PhoneFrame>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-eco-primary mx-auto mb-3" />
            <p className="text-eco-muted">Carregando métricas...</p>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (!isAdmin) {
    return (
      <PhoneFrame>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-eco-muted">Acesso negado</p>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Mostrar aviso se estiver usando dados de exemplo
  const isUsingPlaceholderData = error?.includes('exemplo') || error?.includes('não configurado');

  if (error && !isUsingPlaceholderData) {
    return (
      <PhoneFrame>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800">Erro ao carregar métricas: {error}</p>
            <button
              onClick={refetch}
              className="mt-3 text-sm text-red-600 underline"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // Prepare data for charts
  const distributionData = [
    { name: 'Free', value: userDistribution.free, color: '#94A3B8' },
    { name: 'Trial', value: userDistribution.trial, color: '#3B82F6' },
    { name: 'Essentials', value: userDistribution.essentials, color: '#8B5CF6' },
    { name: 'Premium', value: userDistribution.premium, color: '#10B981' },
  ];

  const funnelData = [
    { stage: 'Signups', count: conversionFunnel.signups, rate: 100 },
    { stage: 'Trials', count: conversionFunnel.trialsStarted, rate: conversionFunnel.signupToTrial },
    { stage: 'Paid', count: conversionFunnel.paidConversions, rate: conversionFunnel.trialToPaid },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      // Generate CSV export
      const csvContent = [
        ['Metric', 'Value'],
        ['Total Users', userDistribution.total],
        ['Free Users', userDistribution.free],
        ['Trial Users', userDistribution.trial],
        ['Essentials Users', userDistribution.essentials],
        ['Premium Users', userDistribution.premium],
        ['Signup → Trial Rate', `${conversionFunnel.signupToTrial.toFixed(1)}%`],
        ['Trial → Paid Rate', `${conversionFunnel.trialToPaid.toFixed(1)}%`],
        ['Churn Rate', `${churnRate.toFixed(1)}%`],
        ['LTV', `R$ ${ltv.toFixed(2)}`],
      ]
        .map((row) => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversion-metrics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PhoneFrame>
      <div className="p-6 pb-24 space-y-8">
        {/* Aviso de dados de exemplo */}
        {isUsingPlaceholderData && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Modo Demo - Dados de Exemplo
                </p>
                <p className="text-xs text-yellow-800">
                  {error || 'O banco de dados não está configurado. Os dados abaixo são apenas exemplos para visualização.'}
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  <strong>Para dados reais:</strong> Configure as tabelas <code className="bg-yellow-100 px-1 rounded">users</code> e{' '}
                  <code className="bg-yellow-100 px-1 rounded">subscription_events</code> no Supabase.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">
              Conversion Analytics
            </h1>
            <p className="text-sm text-eco-muted">
              Dashboard de métricas de conversão
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              disabled={loading}
              className="p-2 rounded-lg bg-eco-light hover:bg-eco-medium transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="p-2 rounded-lg bg-eco-primary text-white hover:bg-eco-primary/90 transition-colors"
              title="Exportar CSV"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Total de Usuários"
            value={userDistribution.total}
            icon={Users}
            color="eco-primary"
          />
          <MetricCard
            label="Usuários Premium"
            value={userDistribution.premium + userDistribution.essentials}
            icon={TrendingUp}
            color="green-600"
          />
          <MetricCard
            label="Trial → Paid"
            value={`${conversionFunnel.trialToPaid.toFixed(1)}%`}
            icon={Activity}
            color="blue-600"
          />
          <MetricCard
            label="Lifetime Value"
            value={`R$ ${ltv.toFixed(0)}`}
            icon={DollarSign}
            color="purple-600"
          />
        </div>

        {/* User Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-eco-line p-6">
          <h3 className="font-semibold mb-4">Distribuição de Usuários</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl border border-eco-line p-6">
          <h3 className="font-semibold mb-4">Funil de Conversão</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3B82F6" name="Usuários" />
              <Bar dataKey="rate" fill="#10B981" name="Taxa (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Triggers */}
        {triggerStats.length > 0 && (
          <div className="bg-white rounded-xl border border-eco-line p-6">
            <h3 className="font-semibold mb-4">Top Conversion Triggers</h3>
            <div className="space-y-3">
              {triggerStats.map((trigger) => (
                <div
                  key={trigger.trigger_type}
                  className="flex items-center justify-between p-3 bg-eco-light rounded-xl"
                >
                  <div>
                    <p className="font-medium">{trigger.trigger_type}</p>
                    <p className="text-xs text-eco-muted">
                      {trigger.total_hits} hits • {trigger.conversions} conversões
                    </p>
                  </div>
                  <span className="font-semibold text-eco-primary">
                    {trigger.conversion_rate.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Churn & LTV */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-eco-line p-6">
            <h4 className="font-semibold mb-2">Churn Rate</h4>
            <p className="text-3xl font-bold text-red-600">{churnRate.toFixed(1)}%</p>
            <p className="text-xs text-eco-muted mt-1">Últimos 30 dias</p>
          </div>
          <div className="bg-white rounded-xl border border-eco-line p-6">
            <h4 className="font-semibold mb-2">LTV Médio</h4>
            <p className="text-3xl font-bold text-green-600">R$ {ltv.toFixed(0)}</p>
            <p className="text-xs text-eco-muted mt-1">Por usuário premium</p>
          </div>
        </div>

        {/* Baseline Notice */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900 font-semibold mb-2">
            📊 Fase 0: Coleta de Baseline
          </p>
          <p className="text-xs text-blue-800">
            Estas métricas servem como baseline antes de implementar limites e otimizações.
            Recomendado coletar dados por 1-2 semanas antes de fazer mudanças significativas.
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}

// Error Boundary para capturar erros
class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <PhoneFrame>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-red-800 mb-3">
                Erro no Dashboard
              </h2>
              <p className="text-red-600 mb-4">
                {this.state.error?.message || 'Erro desconhecido'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </PhoneFrame>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component
export default function ConversionDashboardWithBoundary() {
  return (
    <DashboardErrorBoundary>
      <ConversionDashboard />
    </DashboardErrorBoundary>
  );
}
