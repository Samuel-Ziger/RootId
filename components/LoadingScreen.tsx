
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
    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg overflow-hidden relative min-h-[400px] flex flex-col items-center justify-center">
      {/* Scanner Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-1 scanner-line" style={{ backgroundColor: '#17752a', boxShadow: '0 0 15px rgba(23,117,42,0.5)' }}></div>
      </div>

      <div className="relative z-10 text-center">
        <div className="relative mb-8 inline-block">
          <svg className="w-20 h-20 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="#17752a">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#17752a' }}></div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">Análise em Andamento</h3>
        <p className="mono text-sm animate-pulse h-6" style={{ color: '#17752a' }}>{STEPS[currentStep]}</p>
        
        <div className="mt-8 flex gap-1 justify-center">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 w-6 rounded-full transition-all duration-500 ${i <= currentStep ? '' : 'bg-gray-200'}`}
              style={i <= currentStep ? { backgroundColor: '#17752a' } : {}}
            ></div>
          ))}
        </div>
      </div>
      
      <div className="mt-12 w-full max-w-md bg-gray-50 border border-gray-200 rounded p-4 text-left overflow-hidden">
        <div className="flex gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
        <div className="text-[10px] mono space-y-1" style={{ color: '#17752a' }}>
            <p className="opacity-50"># OSINT-SCAN-MODULE ACTIVATED</p>
            <p>&gt; TARGET_IDENTIFIED: SEARCH_STRING_LOADED</p>
            <p>&gt; FETCHING_GROUNDING_CHUNKS...</p>
            {currentStep > 2 && <p>&gt; SOURCES_MAPPED: {currentStep * 2} RELEVANT_MATCHES</p>}
            {currentStep > 5 && <p>&gt; ANALYZING_REPUTATION_DATA...</p>}
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .scanner-line { animation: scan 2s linear infinite; }
      `}</style>
    </div>
  );
};
