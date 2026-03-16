
import React from 'react';

const ROOTID_PRIMARY = '#2563eb';

export const Header: React.FC = () => (
  <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50 shadow-lg">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: ROOTID_PRIMARY }}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white">Root<span style={{ color: ROOTID_PRIMARY }}>ID</span></h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Validador OSINT autônomo</p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: ROOTID_PRIMARY }}></span>
          Pronto para análise
        </span>
      </div>
    </div>
  </header>
);

export const Footer: React.FC = () => (
  <footer className="mt-12 py-8 border-t border-slate-800 text-center text-slate-500 text-sm">
    <div className="max-w-6xl mx-auto px-4">
      <p>© {new Date().getFullYear()} RootID. Validação de identidade profissional com IA.</p>
    </div>
  </footer>
);

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};
