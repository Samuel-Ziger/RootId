
import React, { useState, useEffect } from 'react';
import { CandidateDataInput, AcheUmVeteranoCandidato } from '../types';
import { mapCandidatoToRootID } from '../utils/candidateMapper';

interface AnalysisFormProps {
  onAnalyze: (data: CandidateDataInput) => void;
  isLoading: boolean;
  cooldownSeconds?: number;
  /** Candidato do Ache Um Veterano: quando informado, mostra só nome + botão e usa dados do JSON */
  candidato?: AcheUmVeteranoCandidato | null;
}

export const AnalysisForm: React.FC<AnalysisFormProps> = ({ onAnalyze, isLoading, cooldownSeconds = 0, candidato }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [referenceUrls, setReferenceUrls] = useState<string[]>(['']);

  useEffect(() => {
    if (candidato) {
      const mapped = mapCandidatoToRootID(candidato);
      setName(mapped.name);
      setRole(mapped.role);
      setReferenceUrls(mapped.referenceUrls.length > 0 ? mapped.referenceUrls : ['']);
    }
  }, [candidato]);

  const handleAddLink = () => {
    setReferenceUrls([...referenceUrls, '']);
  };

  const handleRemoveLink = (index: number) => {
    if (referenceUrls.length > 1) {
      setReferenceUrls(referenceUrls.filter((_, i) => i !== index));
    } else {
      setReferenceUrls(['']);
    }
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...referenceUrls];
    newLinks[index] = value;
    setReferenceUrls(newLinks);
  };

  const handleSubmitFromCandidato = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidato || isLoading || cooldownSeconds > 0) return;
    const mapped = mapCandidatoToRootID(candidato);
    onAnalyze({
      name: mapped.name,
      role: mapped.role,
      referenceUrls: mapped.referenceUrls.filter((u) => u && u.trim()),
      candidato,
    });
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || isLoading || cooldownSeconds > 0) return;
    onAnalyze({
      name,
      role,
      referenceUrls: referenceUrls.filter((u) => u && u.trim()),
    });
  };

  const isCandidatoMode = !!candidato;
  const isButtonDisabled = isLoading || cooldownSeconds > 0 || (isCandidatoMode ? false : !name || !role);

  // Modo candidato (dados do JSON): só nome + botão
  if (isCandidatoMode) {
    const displayName =
      candidato?.nome || (candidato?.firstname && candidato?.lastname
        ? `${candidato.firstname} ${candidato.lastname}`
        : "Candidato");

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
        <form onSubmit={handleSubmitFromCandidato} className="space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Validar perfil de</p>
            <p className="text-2xl font-bold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-400 mt-2">
              A busca usará nome, links, experiências e demais dados do cadastro.
            </p>
          </div>
          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg disabled:cursor-not-allowed ${
              cooldownSeconds > 0 ? "bg-gray-200 text-gray-500 border border-gray-300" : "text-white hover:opacity-90 active:opacity-95"
            }`}
            style={cooldownSeconds === 0 ? { backgroundColor: "#17752a" } : {}}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
      </div>
    );
  }

  // Modo manual: formulário completo
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(23,117,42,0.1)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#17752a">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Perfil para Análise</h2>
      </div>

      <form onSubmit={handleSubmitManual} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Nome Completo</label>
          <input
            type="text"
            required
            disabled={isLoading || cooldownSeconds > 0}
            placeholder="Ex: João da Silva"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#17752a]/30 focus:border-[#17752a] transition-all text-gray-900 disabled:opacity-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Cargo ou Área Técnica</label>
          <input
            type="text"
            required
            disabled={isLoading || cooldownSeconds > 0}
            placeholder="Ex: Senior Go Developer"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#17752a]/30 focus:border-[#17752a] transition-all text-gray-900 disabled:opacity-50"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5 ml-1">
            <label className="block text-xs font-bold text-gray-500 uppercase">Links de Referência</label>
            <button
              type="button"
              onClick={handleAddLink}
              disabled={isLoading || cooldownSeconds > 0}
              className="text-[10px] px-2 py-0.5 rounded transition-colors flex items-center gap-1 disabled:opacity-30 hover:opacity-80"
              style={{ backgroundColor: "rgba(23,117,42,0.15)", color: "#17752a" }}
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
                  className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#17752a]/30 focus:border-[#17752a] transition-all text-sm text-gray-900 disabled:opacity-50"
                  value={url}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLink(index)}
                  disabled={isLoading || cooldownSeconds > 0 || (referenceUrls.length === 1 && !url)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-20"
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
              ? 'bg-gray-200 text-gray-500 border border-gray-300' 
              : 'text-white hover:opacity-90 active:opacity-95'
          }`}
          style={cooldownSeconds === 0 ? { backgroundColor: '#17752a' } : {}}
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
      `}</style>
    </div>
  );
};
