import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as programsApi from '@/api/programsApi';
import { Calendar, CheckCircle, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Enrollment {
  enrollmentId: string;
  programId: string;
  status: string;
  progress: number;
  currentStep: number;
  startedAt: string;
  completedAt: string | null;
  lastAccessedAt: string;
}

interface RiquezaMentalHistoryProps {
  onViewAnswers?: (enrollmentId: string) => void;
  currentEnrollmentId?: string;
}

export default function RiquezaMentalHistory({
  onViewAnswers,
  currentEnrollmentId,
}: RiquezaMentalHistoryProps) {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);
  const [enrollmentDetails, setEnrollmentDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load enrollment history
  useEffect(() => {
    async function loadHistory() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await programsApi.getUserHistory();
        // Filter only "Quem Pensa Enriquece" program
        const filtered = data.enrollments.filter(e => e.programId === 'rec_2');
        setEnrollments(filtered);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [user]);

  // Load details of selected enrollment
  async function handleViewDetails(enrollmentId: string) {
    setSelectedEnrollment(enrollmentId);
    setLoadingDetails(true);

    try {
      const details = await programsApi.getEnrollment(enrollmentId);
      setEnrollmentDetails(details);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoadingDetails(false);
    }
  }

  function formatDate(dateString: string) {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  }

  function formatDuration(startedAt: string, completedAt: string | null) {
    if (!completedAt) return null;

    try {
      const start = new Date(startedAt);
      const end = new Date(completedAt);
      const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

      if (minutes < 60) return `${minutes} minutos`;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}min`;
    } catch {
      return null;
    }
  }

  // Separate current vs past enrollments
  const currentEnrollments = enrollments.filter(
    e => e.status === 'in_progress' && e.enrollmentId !== currentEnrollmentId
  );
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-eco-muted mb-4">
          Faça login para ver seu histórico de sessões
        </p>
        <button
          onClick={() => (window.location.href = '/login')}
          className="px-6 py-3 bg-eco-baby text-white rounded-xl hover:bg-eco-baby/90 transition-all"
        >
          Fazer Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-eco-accent" size={32} />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-eco-muted text-lg mb-2">Nenhuma sessão anterior</p>
        <p className="text-eco-muted text-sm">
          Complete o programa para ver seu histórico aqui
        </p>
      </div>
    );
  }

  // If viewing details
  if (selectedEnrollment && enrollmentDetails) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => {
            setSelectedEnrollment(null);
            setEnrollmentDetails(null);
          }}
          className="flex items-center gap-2 text-eco-text hover:text-eco-accent transition-colors"
        >
          <ChevronRight size={16} className="rotate-180" />
          <span className="text-sm">Voltar para histórico</span>
        </button>

        {/* Enrollment info */}
        <div className="glass-shell rounded-2xl p-6">
          <h3 className="font-display text-xl text-eco-text mb-4">
            Sessão de {formatDate(enrollmentDetails.startedAt)}
          </h3>

          {enrollmentDetails.completedAt && (
            <div className="flex items-center gap-4 text-sm text-eco-muted mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-eco-accent" />
                <span>Concluída</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>
                  {formatDuration(enrollmentDetails.startedAt, enrollmentDetails.completedAt)}
                </span>
              </div>
            </div>
          )}

          {/* Answers */}
          <div className="space-y-6">
            {Object.entries(enrollmentDetails.answers || {}).map(([stepNum, stepAnswers]: [string, any]) => (
              <div key={stepNum} className="border-l-2 border-eco-accent/30 pl-4">
                <h4 className="font-display text-eco-text mb-2">
                  Passo {stepNum}
                </h4>
                <div className="space-y-2">
                  {Object.entries(stepAnswers).map(([key, value]: [string, any]) => (
                    <div key={key} className="text-sm">
                      <p className="text-eco-text">
                        {Array.isArray(value) ? value.join(', ') : value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Other in-progress sessions */}
      {currentEnrollments.length > 0 && (
        <div>
          <h3 className="font-display text-xl text-eco-text mb-4">
            🔄 Sessões em Andamento
          </h3>
          <div className="space-y-3">
            {currentEnrollments.map(enrollment => (
              <div
                key={enrollment.enrollmentId}
                className="glass-shell rounded-xl p-4 hover:bg-eco-accent/5 transition-all cursor-pointer"
                onClick={() => handleViewDetails(enrollment.enrollmentId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-eco-text">
                        Passo {enrollment.currentStep + 1} de 6
                      </span>
                      <span className="text-xs text-eco-muted">
                        {enrollment.progress}% concluído
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-eco-muted">
                      <Calendar size={12} />
                      <span>Iniciado em {formatDate(enrollment.startedAt)}</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-eco-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed sessions */}
      {completedEnrollments.length > 0 && (
        <div>
          <h3 className="font-display text-xl text-eco-text mb-4">
            ✅ Sessões Concluídas
          </h3>
          <div className="space-y-3">
            {completedEnrollments.map(enrollment => (
              <div
                key={enrollment.enrollmentId}
                className="glass-shell rounded-xl p-4 hover:bg-eco-accent/5 transition-all cursor-pointer"
                onClick={() => handleViewDetails(enrollment.enrollmentId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle size={16} className="text-eco-accent" />
                      <span className="text-sm font-medium text-eco-text">
                        Concluída
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-eco-muted">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} />
                        <span>{formatDate(enrollment.completedAt!)}</span>
                      </div>
                      {enrollment.completedAt && (
                        <div className="flex items-center gap-2">
                          <Clock size={12} />
                          <span>
                            {formatDuration(enrollment.startedAt, enrollment.completedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-eco-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loadingDetails && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-eco-accent" size={32} />
        </div>
      )}
    </div>
  );
}
