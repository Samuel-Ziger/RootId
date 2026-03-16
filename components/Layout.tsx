
import React from 'react';

export const Header: React.FC = () => (
  <header className="border-b border-gray-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#17752a' }}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-gray-900">Ache um Veterano <span style={{ color: '#17752a' }}>IA</span></h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Validação de Perfil Profissional</p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#17752a' }}></span>
          Pronto para análise
        </span>
      </div>
    </div>
  </header>
);

export const Footer: React.FC = () => (
  <footer className="mt-12 py-8 border-t border-gray-200 text-center text-gray-500 text-sm">
    <div className="max-w-6xl mx-auto px-4">
      <p>© {new Date().getFullYear()} Ache um Veterano. Validação profissional com IA.</p>
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
