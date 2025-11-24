import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MOCK_PRACTICES, MOCK_TOTALS } from './mockStatsData';

export default function EstatisticasTotais() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2025, 9, 1));

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const getMonthDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(new Date(year, month, -startDayOfWeek + i + 1));
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const monthDays = getMonthDays(currentMonth);
  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-10">
      {/* BLOCO A: Cabeçalho */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Estatísticas totais</h2>
        <p className="text-sm text-gray-600">
          Acompanhe sua sequência e sua presença ao longo do mês.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 border border-amber-200">
          <span className="text-sm font-medium text-amber-900">
            Sequência atual: {MOCK_TOTALS.sequenciaAtual} dias
          </span>
        </div>
      </div>

      {/* BLOCO B: Calendário mensal */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
        {/* Header do mês */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 capitalize">
            {monthName}
          </h3>
          <button
            onClick={nextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grade dos dias */}
        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((d, idx) => {
            const dateString = d.toISOString().split('T')[0];
            const dayPractices = MOCK_PRACTICES[dateString] || [];
            const isCurrentMonth = d.getMonth() === currentMonth.getMonth();

            return (
              <div
                key={idx}
                className={`min-h-[70px] p-2 rounded-xl border flex flex-col items-center justify-between ${
                  !isCurrentMonth
                    ? 'border-gray-100 bg-gray-50 opacity-40'
                    : dayPractices.length > 0
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <span className={`text-sm font-medium ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}`}>
                  {d.getDate()}
                </span>
                {isCurrentMonth && dayPractices.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {dayPractices.includes('meditacao') && (
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                    )}
                    {dayPractices.includes('aneis') && (
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    )}
                    {dayPractices.includes('enriquece') && (
                      <span className="w-3 h-3 rounded-full bg-amber-400" />
                    )}
                    {dayPractices.includes('reflexao') && (
                      <span className="w-3 h-3 rounded-full bg-violet-400" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BLOCO C: Cards de totais */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{MOCK_TOTALS.meditacoes}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
            Meditações concluídas
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{MOCK_TOTALS.aneisDias}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
            Dias com Anéis da Disciplina
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{MOCK_TOTALS.enriquece}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
            Passos de Quem Pensa Enriquece
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{MOCK_TOTALS.reflexoes}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
            Sessões de reflexão
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{MOCK_TOTALS.maiorSequencia}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
            Maior sequência de dias
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{MOCK_TOTALS.sequenciaAtual}</div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">
            Sequência atual
          </div>
        </div>
      </div>

      {/* BLOCO D: Insight da Eco */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Insight da Eco</h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          Você esteve mais presente aos domingos e mantém uma boa energia emocional ao iniciar a semana.
        </p>
      </div>
    </div>
  );
}
