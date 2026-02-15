import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Circle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import mixpanel from '@/lib/mixpanel';

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
    title: 'Explore meditações premium',
    description: 'Ouça uma meditação de 15+ minutos',
    action: '/app/programas',
  },
  {
    id: 'complete_rings',
    day: 2,
    title: 'Complete os 5 Anéis',
    description: 'Pratique ritual completo diariamente',
    action: '/app/rings',
  },
  {
    id: 'unlimited_chat',
    day: 3,
    title: 'Converse ilimitadamente com Eco',
    description: 'Sem limites durante seu trial',
    action: '/app',
  },
  {
    id: 'memory_insights',
    day: 4,
    title: 'Veja insights do seu perfil emocional',
    description: 'Análises avançadas disponíveis',
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-br from-eco-primary/10 to-eco-accent/10 border border-eco-primary/30 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-eco-primary" />
            <h3 className="font-semibold text-base sm:text-lg">
              Seu Trial Premium ({trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'} restantes)
            </h3>
          </div>
          <span className="text-xs sm:text-sm text-eco-muted">
            {completedCount}/{totalCount}
          </span>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task)}
              disabled={task.completed}
              className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
                task.completed
                  ? 'bg-green-50 border border-green-200 cursor-default'
                  : 'bg-white border border-eco-line hover:border-eco-primary hover:shadow-md active:scale-[0.99]'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {task.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-eco-muted" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-medium text-sm sm:text-base">{task.title}</p>
                <p className="text-xs sm:text-sm text-eco-muted mt-0.5">{task.description}</p>
              </div>

              {!task.completed && (
                <span className="text-xs sm:text-sm text-eco-primary font-semibold shrink-0">
                  Fazer →
                </span>
              )}
            </button>
          ))}
        </div>

        {trialDaysRemaining <= 2 && (
          <div className="mt-4 p-3 bg-eco-warn/10 border border-eco-warn/30 rounded-xl">
            <p className="text-xs sm:text-sm text-eco-warn text-center font-medium">
              ⏰ Seu trial termina em {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'}. Aproveite ao máximo!
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
