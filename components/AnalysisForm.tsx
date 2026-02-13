
import React, { useState } from 'react';
import { CandidateData } from '../types';

interface AnalysisFormProps {
  onAnalyze: (data: CandidateData) => void;
  isLoading: boolean;
  cooldownSeconds?: number;
}

export const AnalysisForm: React.FC<AnalysisFormProps> = ({ onAnalyze, isLoading, cooldownSeconds = 0 }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [referenceUrls, setReferenceUrls] = useState<string[]>(['']);

  const handleAddLink = () => {
    setReferenceUrls([...referenceUrls, '']);
  };

  const handleRemoveLink = (index: number) => {
    if (referenceUrls.length > 1) {
      const newLinks = referenceUrls.filter((_, i) => i !== index);
      setReferenceUrls(newLinks);
    } else {
      setReferenceUrls(['']);
    }
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...referenceUrls];
    newLinks[index] = value;
    setReferenceUrls(newLinks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || isLoading || cooldownSeconds > 0) return;
    onAnalyze({ 
      name, 
      role, 
      referenceUrls: referenceUrls.filter(url => url.trim() !== "") 
    });
  };

  const isButtonDisabled = isLoading || !name || !role || cooldownSeconds > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Perfil para Análise</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Nome Completo</label>
          <input
            type="text"
            required
            disabled={isLoading || cooldownSeconds > 0}
            placeholder="Ex: João da Silva"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-slate-100 disabled:opacity-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Cargo ou Área Técnica</label>
          <input
            type="text"
            required
            disabled={isLoading || cooldownSeconds > 0}
            placeholder="Ex: Senior Go Developer"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-slate-100 disabled:opacity-50"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5 ml-1">
            <label className="block text-xs font-bold text-slate-400 uppercase">Links de Referência</label>
            <button 
              type="button" 
              onClick={handleAddLink}
              disabled={isLoading || cooldownSeconds > 0}
              className="text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-2 py-0.5 rounded transition-colors flex items-center gap-1 disabled:opacity-30"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar outro
            </button>
          </div>
          
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
            {referenceUrls.map((url, index) => (
              <div key={index} className="flex gap-2 group">
                <input
                  type="url"
                  disabled={isLoading || cooldownSeconds > 0}
                  placeholder="LinkedIn, GitHub, Portfolio..."
                  className="flex-grow bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm text-slate-100 disabled:opacity-50"
                  value={url}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLink(index)}
                  disabled={isLoading || cooldownSeconds > 0 || (referenceUrls.length === 1 && url === '')}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-20"
                  title="Remover link"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isButtonDisabled}
          className={`w-full mt-4 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg disabled:cursor-not-allowed ${
            cooldownSeconds > 0 
              ? 'bg-slate-800 text-slate-500 border border-slate-700' 
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-900/20'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processando...</span>
            </>
          ) : cooldownSeconds > 0 ? (
            <>
              <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Aguarde {cooldownSeconds}s</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Iniciar Validação Digital</span>
            </>
          )}
        </button>
      </form>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};
