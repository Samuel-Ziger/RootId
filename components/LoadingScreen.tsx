
import React, { useState, useEffect } from 'react';

const STEPS = [
  "Iniciando protocolo OSINT...",
  "Consultando caches do Google Search...",
  "Mapeando pegada digital do candidato...",
  "Identificando perfis técnicos (GitHub/LinkedIn)...",
  "Analisando repositórios e projetos públicos...",
  "Cross-referenciando cargos declarados...",
  "Avaliando consistência de datas e funções...",
  "Calculando score de senioridade técnica...",
  "Sintetizando relatório final...",
];

export const LoadingScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl overflow-hidden relative min-h-[400px] flex flex-col items-center justify-center">
      {/* Scanner Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="w-full h-1 bg-blue-500 scanner-line shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
      </div>

      <div className="relative z-10 text-center">
        <div className="relative mb-8 inline-block">
          <svg className="w-20 h-20 text-blue-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-100 mb-2">Análise em Andamento</h3>
        <p className="text-blue-400 mono text-sm animate-pulse h-6">{STEPS[currentStep]}</p>
        
        <div className="mt-8 flex gap-1 justify-center">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 w-6 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-blue-500' : 'bg-slate-800'}`}
            ></div>
          ))}
        </div>
      </div>
      
      <div className="mt-12 w-full max-w-md bg-slate-950 border border-slate-800 rounded p-4 text-left overflow-hidden">
        <div className="flex gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
        <div className="text-[10px] mono text-green-500 space-y-1">
            <p className="opacity-50"># OSINT-SCAN-MODULE ACTIVATED</p>
            <p>&gt; TARGET_IDENTIFIED: SEARCH_STRING_LOADED</p>
            <p>&gt; FETCHING_GROUNDING_CHUNKS...</p>
            {currentStep > 2 && <p>&gt; SOURCES_MAPPED: {currentStep * 2} RELEVANT_MATCHES</p>}
            {currentStep > 5 && <p>&gt; ANALYZING_REPUTATION_DATA...</p>}
        </div>
      </div>
    </div>
  );
};
