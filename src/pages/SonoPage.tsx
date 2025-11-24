import React from 'react';
import { Clock, Brain, Sparkles, Moon } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';

export default function SonoPage() {
  return (
    <div className="min-h-screen bg-white">
      <HomeHeader />

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Grid de Recursos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {/* Meditação para Dormir */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                <Brain className="h-5 w-5 text-indigo-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              Meditação para Dormir
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Técnicas guiadas de meditação para relaxar e adormecer profundamente.
            </p>
          </div>

          {/* Histórias para Dormir */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <Sparkles className="h-5 w-5 text-purple-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              Histórias para Dormir
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Narrativas relaxantes para acalmar a mente antes de dormir.
            </p>
          </div>

          {/* Rotina de Sono */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Clock className="h-5 w-5 text-blue-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              Rotina de Sono
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Estabeleça uma rotina saudável para melhorar seu padrão de sono.
            </p>
          </div>

          {/* Sons Relaxantes */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-500/10 group-hover:bg-teal-500/20 transition-colors">
                <Moon className="h-5 w-5 text-teal-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-teal-500/10 text-teal-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              Sons Relaxantes
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Áudios ambientais para criar o ambiente perfeito para dormir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
