
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

/** Retorna só dígitos do CPF (até 11) */
function cpfDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

/** Formata CPF como 000.000.000-00 */
function formatCpf(value: string): string {
  const d = cpfDigits(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const BR_UF_SELECT: { value: string; label: string }[] = [
  { value: '', label: 'Estado (opcional)' },
  { value: 'AC', label: 'AC — Acre' },
  { value: 'AL', label: 'AL — Alagoas' },
  { value: 'AP', label: 'AP — Amapá' },
  { value: 'AM', label: 'AM — Amazonas' },
  { value: 'BA', label: 'BA — Bahia' },
  { value: 'CE', label: 'CE — Ceará' },
  { value: 'DF', label: 'DF — Distrito Federal' },
  { value: 'ES', label: 'ES — Espírito Santo' },
  { value: 'GO', label: 'GO — Goiás' },
  { value: 'MA', label: 'MA — Maranhão' },
  { value: 'MT', label: 'MT — Mato Grosso' },
  { value: 'MS', label: 'MS — Mato Grosso do Sul' },
  { value: 'MG', label: 'MG — Minas Gerais' },
  { value: 'PA', label: 'PA — Pará' },
  { value: 'PB', label: 'PB — Paraíba' },
  { value: 'PR', label: 'PR — Paraná' },
  { value: 'PE', label: 'PE — Pernambuco' },
  { value: 'PI', label: 'PI — Piauí' },
  { value: 'RJ', label: 'RJ — Rio de Janeiro' },
  { value: 'RN', label: 'RN — Rio Grande do Norte' },
  { value: 'RS', label: 'RS — Rio Grande do Sul' },
  { value: 'RO', label: 'RO — Rondônia' },
  { value: 'RR', label: 'RR — Roraima' },
  { value: 'SC', label: 'SC — Santa Catarina' },
  { value: 'SP', label: 'SP — São Paulo' },
  { value: 'SE', label: 'SE — Sergipe' },
  { value: 'TO', label: 'TO — Tocantins' },
];

export const AnalysisForm: React.FC<AnalysisFormProps> = ({ onAnalyze, isLoading, cooldownSeconds = 0, candidato }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [referenceUrls, setReferenceUrls] = useState<string[]>(['']);
  const [cpf, setCpf] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [stateUf, setStateUf] = useState('');
  const [searchProcessoTrabalhista, setSearchProcessoTrabalhista] = useState(true);
  const [searchOutrosTiposProcesso, setSearchOutrosTiposProcesso] = useState(true);

  useEffect(() => {
    if (candidato) {
      const mapped = mapCandidatoToRootID(candidato);
      setName(mapped.name);
      setRole(mapped.role);
      setReferenceUrls(mapped.referenceUrls.length > 0 ? mapped.referenceUrls : ['']);
      setCpf(mapped.cpf ? formatCpf(mapped.cpf) : '');
      setCity(mapped.city ?? '');
      setEmail(mapped.email ?? '');
      setStateUf(mapped.state ?? '');
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

  const cpfOnlyDigits = cpfDigits(cpf);

  const handleSubmitFromCandidato = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidato || isLoading || cooldownSeconds > 0) return;
    const mapped = mapCandidatoToRootID(candidato);
    onAnalyze({
      name: mapped.name,
      role: mapped.role,
      referenceUrls: mapped.referenceUrls.filter((u) => u && u.trim()),
      ...(city.trim() && { city: city.trim() }),
      ...(email.trim() && { email: email.trim() }),
      ...(cpfOnlyDigits.length === 11 && { cpf: cpfOnlyDigits }),
      ...(stateUf.length === 2 && { state: stateUf }),
      searchProcessoTrabalhista,
      searchOutrosTiposProcesso,
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
      ...(city.trim() && { city: city.trim() }),
      ...(email.trim() && { email: email.trim() }),
      ...(cpfOnlyDigits.length === 11 && { cpf: cpfOnlyDigits }),
      ...(stateUf.length === 2 && { state: stateUf }),
      searchProcessoTrabalhista,
      searchOutrosTiposProcesso,
    });
  };

  const isCandidatoMode = !!candidato;
  const isButtonDisabled = isLoading || cooldownSeconds > 0 || (isCandidatoMode ? false : !name || !role);

  // Modo candidato (dados do JSON): nome + CPF opcional + botão
  if (isCandidatoMode) {
    const displayName =
      candidato?.nome || (candidato?.firstname && candidato?.lastname
        ? `${candidato.firstname} ${candidato.lastname}`
        : "Candidato");

    const ROOTID = '#2563eb';
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 shadow-xl">
        <form onSubmit={handleSubmitFromCandidato} className="space-y-6">
          <div>
            <p className="text-sm text-slate-400 mb-1">Validar perfil de</p>
            <p className="text-2xl font-bold text-white">{displayName}</p>
            <p className="text-xs text-slate-500 mt-2">
              A busca usará nome, links, experiências e demais dados do cadastro.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">CPF (opcional)</label>
            <input
              type="text"
              inputMode="numeric"
              disabled={isLoading || cooldownSeconds > 0}
              placeholder="000.000.000-00"
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-white placeholder-slate-500 disabled:opacity-50"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
            />
            <p className="text-[10px] text-slate-500 mt-1 ml-1">Opcional. Com nome + UF reduz ruído regional no Datajud; use só quando autorizado.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Cidade — opcional</label>
            <input
              type="text"
              disabled={isLoading || cooldownSeconds > 0}
              placeholder="Ex: São Paulo"
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 disabled:opacity-50"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <p className="text-[10px] text-slate-500 mt-1 ml-1">Refina buscas (nome + cidade + UF). Mesmo campo do cadastro da plataforma.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail — opcional</label>
            <input
              type="email"
              disabled={isLoading || cooldownSeconds > 0}
              placeholder="Preferencial corporativo"
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 disabled:opacity-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-[10px] text-slate-500 mt-1 ml-1">Domínio corporativo gera buscas extras (homônimos). Gmail etc. não disparam busca por domínio.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Estado (UF) — opcional</label>
            <select
              disabled={isLoading || cooldownSeconds > 0}
              value={stateUf}
              onChange={(e) => setStateUf(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white disabled:opacity-50"
            >
              {BR_UF_SELECT.map((opt) => (
                <option key={opt.value || '_'} value={opt.value} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1 ml-1">Refina buscas web por região (nome + estado).</p>
          </div>
          <div>
            <p className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Busca por processo (Datajud)</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchProcessoTrabalhista}
                  onChange={(e) => setSearchProcessoTrabalhista(e.target.checked)}
                  disabled={isLoading || cooldownSeconds > 0}
                  className="rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
                />
                <span className="text-sm text-slate-300">Trabalhistas (TRT/TST)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchOutrosTiposProcesso}
                  onChange={(e) => setSearchOutrosTiposProcesso(e.target.checked)}
                  disabled={isLoading || cooldownSeconds > 0}
                  className="rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
                />
                <span className="text-sm text-slate-300">Outros (TJ, TRF, STJ)</span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg disabled:cursor-not-allowed ${
              cooldownSeconds > 0 ? "bg-slate-600 text-slate-400 border border-slate-500" : "text-white hover:opacity-90 active:opacity-95"
            }`}
            style={cooldownSeconds === 0 ? { backgroundColor: ROOTID } : {}}
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

  // Modo manual: dados principais (nome, cargo, links, CPF opcional)
  const ROOTID = '#2563eb';
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(37,99,235,0.2)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={ROOTID}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">Perfil para análise</h2>
      </div>

      <form onSubmit={handleSubmitManual} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Nome completo</label>
          <input
            type="text"
            required
            disabled={isLoading || cooldownSeconds > 0}
            placeholder="Ex: João da Silva"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-white placeholder-slate-500 disabled:opacity-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Cargo ou área técnica</label>
          <input
            type="text"
            required
            disabled={isLoading || cooldownSeconds > 0}
            placeholder="Ex: Senior Go Developer"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-white placeholder-slate-500 disabled:opacity-50"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Estado (UF) — opcional</label>
          <select
            disabled={isLoading || cooldownSeconds > 0}
            value={stateUf}
            onChange={(e) => setStateUf(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white disabled:opacity-50"
          >
            {BR_UF_SELECT.map((opt) => (
              <option key={opt.value || '_'} value={opt.value} className="bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 mt-1 ml-1">Refina buscas (Serper, SerpApi, InfoSimples) com nome + estado.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Cidade — opcional</label>
          <input
            type="text"
            disabled={isLoading || cooldownSeconds > 0}
            placeholder="Ex: Curitiba"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 disabled:opacity-50"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <p className="text-[10px] text-slate-500 mt-1 ml-1">Nome + cidade + UF reduz homônimos na web.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail — opcional</label>
          <input
            type="email"
            disabled={isLoading || cooldownSeconds > 0}
            placeholder="ex.: nome@empresa.com.br"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 disabled:opacity-50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-[10px] text-slate-500 mt-1 ml-1">Com domínio corporativo, o sistema busca também por nome + domínio (Gmail/Hotmail etc. não usam essa pista).</p>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5 ml-1">
            <label className="block text-xs font-bold text-slate-400 uppercase">Links de referência</label>
            <button
              type="button"
              onClick={handleAddLink}
              disabled={isLoading || cooldownSeconds > 0}
              className="text-[10px] px-2 py-0.5 rounded transition-colors flex items-center gap-1 disabled:opacity-30 hover:opacity-80 text-blue-400"
              style={{ backgroundColor: 'rgba(37,99,235,0.15)' }}
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
                  className="flex-grow bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm text-white placeholder-slate-500 disabled:opacity-50"
                  value={url}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLink(index)}
                  disabled={isLoading || cooldownSeconds > 0 || (referenceUrls.length === 1 && !url)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-20"
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
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">CPF (opcional)</label>
          <input
            type="text"
            inputMode="numeric"
            disabled={isLoading || cooldownSeconds > 0}
            placeholder="000.000.000-00"
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-white placeholder-slate-500 disabled:opacity-50"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
          />
          <p className="text-[10px] text-slate-500 mt-1 ml-1">Opcional. Com UF, ajuda a filtrar ruído no Datajud; informe só quando permitido.</p>
        </div>
        <div>
          <p className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Busca por processo (Datajud)</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={searchProcessoTrabalhista}
                onChange={(e) => setSearchProcessoTrabalhista(e.target.checked)}
                disabled={isLoading || cooldownSeconds > 0}
                className="rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
              />
              <span className="text-sm text-slate-300">Processos trabalhistas (TRT/TST)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={searchOutrosTiposProcesso}
                onChange={(e) => setSearchOutrosTiposProcesso(e.target.checked)}
                disabled={isLoading || cooldownSeconds > 0}
                className="rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-500/50"
              />
              <span className="text-sm text-slate-300">Outros tipos (TJ, TRF, STJ)</span>
            </label>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 ml-1">Marque os tipos de processo a incluir na busca no Datajud. Pelo menos um deve estar marcado.</p>
        </div>
        <button
          type="submit"
          disabled={isButtonDisabled}
          className={`w-full mt-4 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg disabled:cursor-not-allowed ${
            cooldownSeconds > 0 
              ? 'bg-slate-600 text-slate-400 border border-slate-500' 
              : 'text-white hover:opacity-90 active:opacity-95'
          }`}
          style={cooldownSeconds === 0 ? { backgroundColor: ROOTID } : {}}
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }
      `}</style>
    </div>
  );
};
