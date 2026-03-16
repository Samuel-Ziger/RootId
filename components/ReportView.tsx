import React, { useState, useCallback } from 'react';
import { AnalysisResult, GroundingSource } from '../types';

interface ReportViewProps {
  result: AnalysisResult;
}

/** Remove números entre colchetes (ex.: [99]) que não forem índice de fonte */
function stripBracketNumbers(text: string, _sourcesLength: number): string {
  return text.replace(/\s*\[\d+\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/** Substitui [1], [2], ... por links para as fontes e renderiza o resto (negrito etc.). [n] vira link para sources[n-1].uri */
function renderLineWithSourceLinks(
  line: string,
  sources: GroundingSource[],
  renderLine: (text: string) => React.ReactNode
): React.ReactNode[] {
  if (sources.length === 0) return [renderLine(stripBracketNumbers(line, 0))];
  const parts = line.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= sources.length) {
        const src = sources[num - 1];
        return (
          <a
            key={`${i}-${num}`}
            href={src.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
            style={{ color: '#17752a' }}
            title={src.uri}
          >
            [{num}]
          </a>
        );
      }
    }
    return <React.Fragment key={i}>{renderLine(stripBracketNumbers(part, sources.length))}</React.Fragment>;
  });
}

/** Explicações das seções do relatório (tema do projeto) */
const SECTION_HELP: Record<string, string> = {
  scores: 'Indica o quanto os dados declarados pelo candidato batem com o que foi encontrado na web (Consistência) e se há sinais de risco reputacional para a empresa (Score de Risco). Quanto maior a consistência e menor o risco, melhor.',
  evidencias: 'Lista o que foi confirmado nas fontes consultadas, com nível de confiança: Alta (fonte primária), Média (agregador) ou Baixa (inferência). Ajuda a saber em que evidências o relatório se baseia.',
  aderencia: 'Avalia se o perfil digital encontrado condiz com a área ou cargo de interesse que o candidato declarou. Mostra se há alinhamento entre a atuação na web e a área desejada.',
  linkedin: 'Busca detalhada: tudo que foi coletado do LinkedIn — link do perfil, todas as experiências (cargo/título), formação, todos os projetos (com link quando houver), todos os destaques (e links neles), idiomas, habilidades, recomendações e todos os links do perfil (site, blog, etc.).',
  atentado: 'Seção dedicada a indícios de fraude, golpe, assédio, má conduta ou atentado à honra na internet. Se não houver achados, isso será explicitamente informado.',
  divergencias: 'Aponta contradições entre o declarado e o encontrado, ou lacunas esperadas (por exemplo, ausência de GitHub para quem se diz desenvolvedor).',
  senioridade: 'Classificação do nível profissional (Júnior, Pleno, Sênior ou Specialist) com base no histórico e na pegada digital encontrada.',
  veredito: 'Conclusão geral sobre a confiabilidade do perfil e o nível de risco para contratação, sintetizando os achados do relatório.',
  recomendacoes: 'Recomendações encontradas (ex.: no LinkedIn ou em outras fontes). Se houver, são listadas com autor e fonte; caso contrário, informa-se que nenhuma foi encontrada.',
  fontes: 'Links das páginas e fontes que foram consultadas na análise. Você pode abrir cada uma para conferir a origem das informações.',
};

/** Identifica a chave de ajuda a partir do título da seção */
function getSectionHelpKey(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes('score') || t.includes('pontuação')) return 'scores';
  if (t.includes('evidência') && t.includes('confirmada')) return 'evidencias';
  if (t.includes('aderência') || (t.includes('área') && t.includes('interesse'))) return 'aderencia';
  if (t.includes('dados coletados') && t.includes('linkedin')) return 'linkedin';
  if (t.includes('atentado') || t.includes('má conduta') || t.includes('ma conduta')) return 'atentado';
  if (t.includes('divergência') || t.includes('lacuna')) return 'divergencias';
  if (t.includes('senioridade')) return 'senioridade';
  if (t.includes('veredito')) return 'veredito';
  if (t.includes('recomendação') || t.includes('recomendacao')) return 'recomendacoes';
  if (t.includes('fonte') && t.includes('mapeada')) return 'fontes';
  return null;
}

export const ReportView: React.FC<ReportViewProps> = ({ result }) => {
  const [helpOpen, setHelpOpen] = useState<string | null>(null);

  const renderLine = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-gray-900 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderSectionTitle = (rawTitle: string, lineIndex: number) => {
    let title = rawTitle.replace(/^#+\s*/, '').trim();
    title = title.replace(/^\d+\.\s*/, ''); // remove "1. " quando for seção numerada
    title = stripBracketNumbers(title, result.sources.length);
    title = title.replace(/\*\*(.*?)\*\*/g, '$1'); // remove markdown ** para exibição
    const helpKey = getSectionHelpKey(title);
    const hasHelp = helpKey && SECTION_HELP[helpKey];

    return (
      <h3
        key={lineIndex}
        className="mt-6 mb-3 text-lg font-bold border-b border-gray-200 pb-2 uppercase tracking-wide flex items-center gap-2 flex-wrap"
        style={{ color: '#252e16' }}
      >
        {hasHelp && (
          <button
            type="button"
            onClick={() => setHelpOpen(helpKey)}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 hover:opacity-90"
            style={{
              borderColor: '#17752a',
              color: '#17752a',
              backgroundColor: 'rgba(23,117,42,0.08)',
            }}
            title="O que é esta seção?"
            aria-label="Explicação da seção"
          >
            ?
          </button>
        )}
        <span>{title}</span>
      </h3>
    );
  };

  const closeHelp = useCallback(() => setHelpOpen(null), []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Pop-up de ajuda */}
      {helpOpen && SECTION_HELP[helpOpen] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
        >
          <div
            className="absolute inset-0 bg-gray-900/50"
            onClick={closeHelp}
            aria-hidden="true"
          />
          <div
            className="relative bg-white border-2 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
            style={{ borderColor: '#17752a' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: '#17752a' }}
              >
                ?
              </div>
              <div className="flex-1 min-w-0">
                <h4 id="help-title" className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Sobre esta seção
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {SECTION_HELP[helpOpen]}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeHelp}
              className="mt-6 w-full py-2.5 rounded-lg font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 hover:opacity-90"
              style={{ backgroundColor: '#17752a' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: 'rgba(37,46,22,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded" style={{ backgroundColor: 'rgba(23,117,42,0.15)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#17752a">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900">Relatório de Inteligência</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] mono text-gray-500 uppercase tracking-widest">REF: {result.timestamp.slice(0, 10).replace(/-/g, '')}</span>
          </div>
        </div>

        <div className="p-8 prose max-w-none text-gray-700">
          {result.report.split('\n').map((line, i) => {
            if (line.trim() === '') return <div key={i} className="h-2"></div>;

            const isMarkdownHeading = line.startsWith('###') || line.startsWith('##');
            const isNumberedSection = /^\d+\.\s+\*\*/.test(line.trim());
            if (isMarkdownHeading || isNumberedSection) {
              return renderSectionTitle(line, i);
            }

            if (line.startsWith('- ') || line.startsWith('* ')) {
              const listContent = line.replace(/^[*-]\s*/, '');
              return (
                <li key={i} className="text-gray-700 ml-4 mb-1 list-none flex gap-2">
                  <span style={{ color: '#17752a' }}>•</span>
                  <span>{renderLineWithSourceLinks(listContent, result.sources, renderLine)}</span>
                </li>
              );
            }

            return (
              <p key={i} className="text-gray-700 leading-relaxed mb-4">
                {renderLineWithSourceLinks(line, result.sources, renderLine)}
              </p>
            );
          })}
        </div>
      </div>

      {result.sources.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen('fontes')}
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{
                borderColor: '#17752a',
                color: '#17752a',
                backgroundColor: 'rgba(23,117,42,0.08)',
              }}
              title="O que é esta seção?"
              aria-label="Explicação da seção"
            >
              ?
            </button>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Fontes Mapeadas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.sources.map((source, idx) => (
              <a
                key={idx}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-[#17752a]/50 hover:bg-gray-100 transition-all group"
              >
                <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0 group-hover:animate-ping" style={{ backgroundColor: '#17752a' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{source.title}</p>
                  <p className="text-xs text-gray-500 mt-1 break-all" style={{ color: '#17752a' }}>
                    <span className="text-gray-500 font-medium">Link: </span>
                    {source.uri}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
