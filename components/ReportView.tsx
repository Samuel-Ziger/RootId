
import React from 'react';
import { AnalysisResult } from '../types';

interface ReportViewProps {
  result: AnalysisResult;
}

export const ReportView: React.FC<ReportViewProps> = ({ result }) => {
  // Função auxiliar para renderizar negrito simples no meio do texto
  const renderLine = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-slate-100 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-500/20 rounded">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="font-bold text-slate-100">Relatório de Inteligência</h2>
          </div>
          <span className="text-[10px] mono text-slate-500 uppercase tracking-widest">REF: {result.timestamp.slice(0, 10).replace(/-/g, '')}</span>
        </div>

        <div className="p-8 prose prose-invert prose-blue max-w-none">
          {result.report.split('\n').map((line, i) => {
            if (line.trim() === '') return <div key={i} className="h-2"></div>;
            
            if (line.startsWith('###') || line.startsWith('##')) {
               return <h3 key={i} className="text-blue-400 mt-6 mb-3 text-lg font-bold border-b border-slate-800 pb-2 uppercase tracking-wide">{line.replace(/^#+\s*/, '')}</h3>;
            }
            
            if (line.startsWith('- ') || line.startsWith('* ')) {
                return <li key={i} className="text-slate-300 ml-4 mb-1 list-none flex gap-2">
                  <span className="text-blue-500">•</span>
                  <span>{renderLine(line.replace(/^[*-]\s*/, ''))}</span>
                </li>;
            }
            
            return <p key={i} className="text-slate-300 leading-relaxed mb-4">{renderLine(line)}</p>;
          })}
        </div>
      </div>

      {result.sources.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
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
                className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-blue-500/50 hover:bg-slate-900 transition-all group"
              >
                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 group-hover:animate-ping"></div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-slate-200 truncate">{source.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">{source.uri}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
