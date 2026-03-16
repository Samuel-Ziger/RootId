
import React, { useState, useEffect } from 'react';
import { MainLayout } from './components/Layout';
import { AnalysisForm } from './components/AnalysisForm';
import { ReportView } from './components/ReportView';
import { LoadingScreen } from './components/LoadingScreen';
import { AppState, CandidateDataInput, AcheUmVeteranoCandidato } from './types';
import { performOSINTAnalysis } from './services/geminiService';

interface AppProps {
  /** Candidato do Ache Um Veterano: quando informado, o formulário é pré-preenchido e a análise usa contexto enriquecido */
  candidato?: AcheUmVeteranoCandidato | null;
}

const App: React.FC<AppProps> = ({ candidato }) => {
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

  const handleStartAnalysis = async (data: CandidateDataInput) => {
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
      const msg = err.message || '';
      const isRateLimit = msg.includes('Limite de requisições') || msg.includes('Limite da API') || msg.includes('Cota da API') || msg.includes('quota') || msg.includes('excedida');
      const isHighDemand = msg.includes('alta demanda') || msg.includes('tente novamente');
      const cooldown = isRateLimit || isHighDemand ? 60 : 0;

      setState({
        ...state,
        isAnalyzing: false,
        error: msg,
        step: 'idle',
        cooldownSeconds: cooldown
      });
    }
  };

  return (
    <MainLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda - Formulário */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          {!candidato && (
            <div className="mb-2">
              <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
                Root<span style={{ color: '#2563eb' }}>ID</span>
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Validador OSINT autônomo. Mapeia a pegada digital do candidato e gera relatório de consistência e risco para decisão de contratação.
              </p>
            </div>
          )}
          <AnalysisForm 
            onAnalyze={handleStartAnalysis} 
            isLoading={state.isAnalyzing}
            cooldownSeconds={state.cooldownSeconds}
            candidato={candidato}
          />

          {state.error && (
            <div className={`border rounded-lg p-4 flex gap-3 animate-in fade-in zoom-in ${state.cooldownSeconds > 0 ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' : 'bg-red-500/10 border-red-500/50 text-red-200'}`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs font-medium">
                <p className="font-bold mb-1 uppercase tracking-wider">
                  {state.cooldownSeconds > 0 ? 'Aguarde a cota' : 'Erro do sistema'}
                </p>
                <p>{state.error}</p>
                {state.cooldownSeconds > 0 && (
                   <p className="mt-2 font-bold text-lg">{state.cooldownSeconds}s restantes...</p>
                )}
                {state.cooldownSeconds === 0 && (
                  <button 
                      onClick={() => setState({...state, error: null})}
                      className="mt-2 text-red-300 bg-red-500/20 px-2 py-1 rounded hover:bg-red-500/30 transition-colors"
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
            <div className="h-full border-2 border-dashed border-slate-600 rounded-2xl flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-800/50">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 opacity-80" style={{ backgroundColor: 'rgba(37,99,235,0.2)' }}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Aguardando parâmetros</h3>
              <p className="max-w-xs text-sm">
                Informe nome e cargo (e opcionalmente links). O RootID mapeia fontes públicas e gera o relatório.
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default App;
