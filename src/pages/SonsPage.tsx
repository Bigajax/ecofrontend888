import React from 'react';
import { Music, Volume2, Radio, Headphones } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';

export default function SonsPage() {
  return (
    <div className="min-h-screen bg-white">
      <HomeHeader />

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Grid de Categorias */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Natureza */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                <Volume2 className="h-5 w-5 text-emerald-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              Sons da Natureza
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Chuva, ondas do mar, pássaros e outros sons naturais relaxantes.
            </p>
          </div>

          {/* Música Ambiente */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Music className="h-5 w-5 text-blue-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              Música Ambiente
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Melodias suaves e instrumentais para criar ambientes relaxantes.
            </p>
          </div>

          {/* Foco e Concentração */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <Headphones className="h-5 w-5 text-purple-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              Foco e Concentração
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Sons binaurais e frequências para aumentar a produtividade.
            </p>
          </div>

          {/* Meditação */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                <Radio className="h-5 w-5 text-indigo-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              Meditação
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Áudios guiados e músicas específicas para práticas meditativas.
            </p>
          </div>

          {/* White Noise */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-500/10 group-hover:bg-gray-500/20 transition-colors">
                <Volume2 className="h-5 w-5 text-gray-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-gray-500/10 text-gray-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              White Noise
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Ruídos brancos e sons constantes para bloquear distrações.
            </p>
          </div>

          {/* Sons Urbanos */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                <Music className="h-5 w-5 text-orange-500" strokeWidth={2} />
              </div>
              <span className="text-xs px-2.5 sm:px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 font-medium">
                Em breve
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#38322A] mb-2">
              Sons Urbanos
            </h3>
            <p className="text-sm text-[#38322A]/60 leading-relaxed">
              Cafeterias, chuva na cidade e outros sons urbanos relaxantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
