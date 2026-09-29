import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import mixpanel from '@/lib/mixpanel';
import '@/components/reino/reino.css';

interface TrialTask {
  id: string;
  day: number;
  title: string;
  description: string;
  completed: boolean;
  action: string; // Route to navigate
}

const TRIAL_TASKS: Omit<TrialTask, 'completed'>[] = [
  {
    id: 'explore_meditations',
    day: 1,
    title: 'Ouça uma meditação longa',
    description: 'Uma das trilhas, de quinze minutos ou mais.',
    action: '/app/programas',
  },
  {
    id: 'complete_rings',
    day: 2,
    title: 'Faça um dia dos Cinco Anéis',
    description: 'Duas perguntas, poucos minutos.',
    action: '/app/rings',
  },
  {
    id: 'unlimited_chat',
    day: 3,
    title: 'Converse com a Eco sem limite',
    description: 'Nestes dias, a conversa não tem teto.',
    action: '/app/chat',
  },
  {
    id: 'memory_insights',
    day: 4,
    title: 'Veja o seu perfil emocional',
    description: 'O que a Eco já percebeu das suas conversas.',
    action: '/app/memory',
  },
];

export default function TrialOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TrialTask[]>([]);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Check if user is on trial
    const subscriptionStatus = (user as any).subscription_status;
    const trialEndDate = (user as any).trial_end_date;

    if (subscriptionStatus === 'trialing' && trialEndDate) {
      setIsTrialActive(true);

      const endDate = new Date(trialEndDate);
      const now = new Date();
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setTrialDaysRemaining(Math.max(0, daysLeft));

      // Load completed tasks from localStorage
      const storageKey = `eco.trial.tasks.${user.id}`;
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        try {
          const completedIds = JSON.parse(saved);
          setTasks(
            TRIAL_TASKS.map((task) => ({
              ...task,
              completed: completedIds.includes(task.id),
            }))
          );
        } catch (error) {
          console.error('Error loading trial tasks:', error);
          setTasks(TRIAL_TASKS.map((task) => ({ ...task, completed: false })));
        }
      } else {
        setTasks(TRIAL_TASKS.map((task) => ({ ...task, completed: false })));
      }
    } else {
      setIsTrialActive(false);
    }
  }, [user]);

  const handleTaskClick = (task: TrialTask) => {
    if (task.completed) return;

    // Mark task as completed
    const updatedTasks = tasks.map((t) =>
      t.id === task.id ? { ...t, completed: true } : t
    );
    setTasks(updatedTasks);

    // Save to localStorage
    const storageKey = `eco.trial.tasks.${user?.id}`;
    const completedIds = updatedTasks.filter((t) => t.completed).map((t) => t.id);
    localStorage.setItem(storageKey, JSON.stringify(completedIds));

    // Track event
    mixpanel.track('Trial Task Clicked', {
      task_id: task.id,
      task_title: task.title,
      user_id: user?.id,
      days_remaining: trialDaysRemaining,
    });

    // Navigate to action
    navigate(task.action);
  };

  if (!isTrialActive) return null;

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  // No reino (set/2026): a lista numerada das trilhas, com o dia feito marcado.
  // Antes: cartão em gradiente, ícone de brilho e aviso com emoji de relógio.
  return (
    <section className="reino-teste" aria-labelledby="reino-teste-titulo">
      <p className="reino-rotulo" id="reino-teste-titulo">
        Seus dias com tudo aberto · {trialDaysRemaining === 1 ? 'falta 1 dia' : `faltam ${trialDaysRemaining} dias`}
      </p>
      <p className="reino-teste__sub">
        {completedCount} de {totalCount} feitos. Quatro coisas para conhecer o que a assinatura abre.
      </p>
      <ol className="reino-sumario reino-sessoes">
        {tasks.map((task, i) => (
          <li key={task.id} className={task.completed ? 'is-feita' : undefined}>
            <button
              type="button"
              className="reino-sessao"
              onClick={() => handleTaskClick(task)}
              disabled={task.completed}
            >
              <span className="reino-sumario__n">{task.completed ? '✓' : String(i + 1).padStart(2, '0')}</span>
              <span className="reino-sessao__texto">
                <span className="reino-sumario__t">{task.title}</span>
                <span className="reino-sessao__descricao">{task.description}</span>
              </span>
              <span className="reino-sumario__m">{task.completed ? 'feito' : 'fazer'}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
