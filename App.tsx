
import React, { useState, useEffect } from 'react';
import { MainLayout } from './components/Layout';
import { AnalysisForm } from './components/AnalysisForm';
import { ReportView } from './components/ReportView';
import { LoadingScreen } from './components/LoadingScreen';
import { AppState, CandidateData } from './types';
import { performOSINTAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isAnalyzing: false,
    result: null,
    error: null,
    step: 'idle',
    cooldownSeconds: 0
  });

  // Efeito para gerenciar a contagem regressiva do cooldown
  useEffect(() => {
    let timer: number;
    if (state.cooldownSeconds > 0) {
      timer = window.setInterval(() => {
        setState(prev => ({
          ...prev,
          cooldownSeconds: prev.cooldownSeconds - 1,
          // Se o tempo acabar, limpa o erro de limite automaticamente
          error: prev.cooldownSeconds <= 1 ? null : prev.error
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [state.cooldownSeconds]);

  const handleStartAnalysis = async (data: CandidateData) => {
    if (state.cooldownSeconds > 0) return;

    setState({
      ...state,
      isAnalyzing: true,
      error: null,
      step: 'searching',
      result: null
    });

    try {
      const result = await performOSINTAnalysis(data);
      setState({
        ...state,
        isAnalyzing: false,
        result,
        error: null,
        step: 'done'
      });
    } catch (err: any) {
      const isRateLimit = err.message.includes("Limite de requisições");
      
      setState({
        ...state,
        isAnalyzing: false,
        error: err.message,
        step: 'idle',
        cooldownSeconds: isRateLimit ? 60 : 0 // Inicia 60s se for erro de cota
      });
    }
  };

  return (
    <MainLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda - Formulário */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="mb-2">
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              Root<span className="text-blue-500 italic">ID</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Analista OSINT Autônomo para validação profissional. Localizamos a origem digital de perfis técnicos para garantir contratações seguras.
            </p>
          </div>
          
          <AnalysisForm 
            onAnalyze={handleStartAnalysis} 
            isLoading={state.isAnalyzing}
            cooldownSeconds={state.cooldownSeconds}
          />

          {state.error && (
            <div className={`border rounded-lg p-4 flex gap-3 animate-in fade-in zoom-in ${state.cooldownSeconds > 0 ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs font-medium">
                <p className="font-bold mb-1 uppercase tracking-wider">
                  {state.cooldownSeconds > 0 ? 'Aguarde a Cota' : 'Erro do Sistema'}
                </p>
                <p>{state.error}</p>
                {state.cooldownSeconds > 0 && (
                   <p className="mt-2 font-bold text-lg">{state.cooldownSeconds}s restantes...</p>
                )}
                {state.cooldownSeconds === 0 && (
                  <button 
                      onClick={() => setState({...state, error: null})}
                      className="mt-2 text-white bg-red-500/20 px-2 py-1 rounded hover:bg-red-500/40 transition-colors"
                  >
                      Dispensar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita - Resultados */}
        <div className="lg:col-span-8 min-h-[500px]">
          {state.isAnalyzing ? (
            <LoadingScreen />
          ) : state.result ? (
            <ReportView result={state.result} />
          ) : (
            <div className="h-full border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-slate-900/20">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 opacity-40">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">Aguardando Parâmetros</h3>
              <p className="max-w-xs text-sm">
                Inicie o protocolo RootID fornecendo o nome e cargo do candidato. A IA cuidará de mapear todas as fontes públicas.
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default App;
