import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as programsApi from '@/api/programsApi';
import { Calendar, CheckCircle, Clock, ChevronRight, Loader2, Archive, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  riquezaMentalSteps,
  formatAnswerValue,
  type StepConfig,
  type FieldConfig,
} from '@/config/riquezaMentalQuestions';

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
  refreshTrigger?: number; // Add trigger to force refresh
}

export default function RiquezaMentalHistory({
  onViewAnswers,
  currentEnrollmentId,
  refreshTrigger = 0,
}: RiquezaMentalHistoryProps) {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);
  const [enrollmentDetails, setEnrollmentDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<string | null>(null);

  // Load enrollment history
  useEffect(() => {
    async function loadHistory() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('[RiquezaMentalHistory] Loading history...');
        const data = await programsApi.getUserHistory();
        // Filter only "Quem Pensa Enriquece" program and exclude abandoned sessions
        const filtered = data.enrollments.filter(
          e => e.programId === 'rec_2' && e.status !== 'abandoned'
        );
        console.log('[RiquezaMentalHistory] Found enrollments:', filtered.length);
        setEnrollments(filtered);
      } catch (error) {
        console.error('[RiquezaMentalHistory] Erro ao carregar histórico:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [user, refreshTrigger]); // Re-run when refreshTrigger changes

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

  async function handleArchiveSession(enrollmentId: string) {
    setArchiving(enrollmentId);
    try {
      await programsApi.abandonProgram(enrollmentId);
      // Remove da lista local
      setEnrollments(prev => prev.filter(e => e.enrollmentId !== enrollmentId));
      setShowArchiveConfirm(null);
      // Se estávamos visualizando essa sessão, voltar para a lista
      if (selectedEnrollment === enrollmentId) {
        setSelectedEnrollment(null);
        setEnrollmentDetails(null);
      }
    } catch (error) {
      console.error('Erro ao arquivar sessão:', error);
      alert('Erro ao arquivar sessão. Tente novamente.');
    } finally {
      setArchiving(null);
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
    // Flatten answers structure: { "1": { "step1": "..." }, "3": { "step3_fear": "...", "step3_belief": "..." } }
    // to { "step1": "...", "step3_fear": "...", "step3_belief": "..." }
    const flatAnswers: Record<string, any> = {};
    Object.values(enrollmentDetails.answers || {}).forEach((stepAnswers: any) => {
      Object.entries(stepAnswers).forEach(([key, value]) => {
        flatAnswers[key] = value;
      });
    });

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
        <div className="glass-shell rounded-2xl p-6 space-y-6">
          {/* Header */}
          <div>
            <h3 className="font-display text-xl text-eco-text mb-3">
              Sessão de {formatDate(enrollmentDetails.startedAt)}
            </h3>

            {enrollmentDetails.completedAt && (
              <div className="flex items-center gap-4 text-sm text-eco-muted mb-4">
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
          </div>

          {/* Divider */}
          <div className="border-t border-eco-accent/10"></div>

          {/* Answers organized by steps */}
          <div className="space-y-8">
            {riquezaMentalSteps.map((step) => {
              // Check if this step has any answers
              const stepHasAnswers = step.fields.some(field => flatAnswers[field.key]);
              if (!stepHasAnswers) return null;

              return (
                <div key={step.stepNumber} className="space-y-4">
                  {/* Step header */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{step.icon}</span>
                    <div>
                      <h4 className="font-display text-lg text-eco-text">{step.title}</h4>
                      {step.subtitle && (
                        <p className="text-sm text-eco-muted">{step.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {/* Step fields */}
                  <div className="pl-11 space-y-4">
                    {step.fields.map((field) => {
                      const value = flatAnswers[field.key];
                      if (!value) return null;

                      const formattedValue = formatAnswerValue(field, value);

                      return (
                        <div key={field.key} className="space-y-2">
                          {/* Question */}
                          <p className="text-sm font-medium text-eco-text/70">
                            📌 {field.question}
                          </p>
                          {/* Answer */}
                          <div className="bg-eco-accent/5 rounded-lg px-4 py-3 border border-eco-accent/10">
                            <p className="text-eco-text whitespace-pre-wrap">
                              {formattedValue}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Separator between steps */}
                  {step.stepNumber < riquezaMentalSteps.length && (
                    <div className="border-t border-eco-accent/5 mt-6"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer: Archive button */}
          <div className="border-t border-eco-accent/10 pt-6">
            <button
              onClick={() => setShowArchiveConfirm(selectedEnrollment)}
              disabled={archiving === selectedEnrollment}
              className="flex items-center gap-2 px-4 py-2 text-sm text-eco-muted hover:text-eco-text hover:bg-eco-accent/5 rounded-lg transition-all disabled:opacity-50"
            >
              {archiving === selectedEnrollment ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Arquivando...</span>
                </>
              ) : (
                <>
                  <Archive size={16} />
                  <span>Arquivar sessão</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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

      {/* Archive confirmation modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-shell rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-start gap-3">
              <Archive size={24} className="text-eco-accent mt-1" />
              <div className="flex-1">
                <h3 className="font-display text-lg text-eco-text mb-2">
                  Arquivar sessão?
                </h3>
                <p className="text-sm text-eco-muted">
                  Esta sessão ficará oculta do seu histórico, mas não será deletada permanentemente.
                  Você pode recuperá-la mais tarde se necessário.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowArchiveConfirm(null)}
                className="flex-1 px-4 py-2 text-sm text-eco-text bg-eco-accent/5 hover:bg-eco-accent/10 rounded-lg transition-all"
                disabled={archiving !== null}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleArchiveSession(showArchiveConfirm)}
                disabled={archiving !== null}
                className="flex-1 px-4 py-2 text-sm text-white bg-eco-accent hover:bg-eco-accent/90 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {archiving === showArchiveConfirm ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Arquivando...
                  </>
                ) : (
                  'Arquivar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
