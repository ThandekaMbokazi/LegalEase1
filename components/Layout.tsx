
import React, { useState } from 'react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'workspace' | 'library' | 'drafts' | 'drafting';
  onViewChange: (view: 'workspace' | 'library' | 'drafts' | 'drafting') => void;
  user?: User | null;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onToggleAccessibility?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onViewChange, 
  user, 
  onLogout, 
  onProfileClick,
  onToggleAccessibility
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const navItems = [
    { id: 'workspace', label: 'Analyze' },
    { id: 'drafting', label: 'Drafting' },
    { id: 'library', label: 'Vault' },
    { id: 'drafts', label: 'My Drafts' },
  ] as const;

  const handleNavClick = (view: typeof navItems[number]['id']) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 overflow-x-hidden">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-[100] shadow-lg" role="banner">
        <div 
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group flex-shrink-0" 
          onClick={() => handleNavClick('workspace')}
          aria-label="LegalEase Home"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 rounded-lg flex items-center justify-center text-slate-900 font-bold text-lg sm:text-xl shadow-md group-hover:bg-amber-400 transition-colors" aria-hidden="true">
            L
          </div>
          <div className="hidden xs:block">
            <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">LegalEase</h1>
            <p className="text-[8px] sm:text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase">Navigator</p>
          </div>
        </div>
        
        {user && (
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8" aria-label="Main Navigation">
            {navItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-sm transition-all pb-1 whitespace-nowrap ${
                  currentView === item.id 
                    ? 'font-bold text-amber-500 border-b-2 border-amber-500' 
                    : 'font-medium text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center space-x-2 sm:space-x-4">
          {user && (
            <>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-right hidden lg:block">
                  <p className="text-[10px] text-white font-bold truncate max-w-[120px]">{user.displayName}</p>
                  <button onClick={onLogout} className="text-[9px] text-slate-500 hover:text-amber-500 font-black uppercase tracking-widest">Logout</button>
                </div>

                {/* Accessibility Toggle Button */}
                <button 
                  onClick={onToggleAccessibility}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-all active:scale-90"
                  aria-label="Accessibility Settings"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>

                <button 
                  onClick={onProfileClick}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-500 font-bold text-xs shadow-sm hover:bg-white/10 transition-all active:scale-90" 
                  aria-label="User Profile"
                >
                  {getInitials(user.displayName)}
                </button>
                
                {/* Mobile Menu Toggle */}
                <button 
                  className="md:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle Menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && user && (
          <div className="md:hidden fixed inset-0 top-[65px] bg-slate-950/95 backdrop-blur-xl z-[90] flex flex-col p-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`text-xl text-left py-4 px-6 rounded-2xl border ${
                    currentView === item.id 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500 font-bold' 
                      : 'border-white/5 text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-8 border-t border-white/5 mt-4">
                <p className="text-sm text-white font-bold mb-4 px-6">{user.displayName}</p>
                <button 
                  onClick={onLogout}
                  className="w-full text-left py-4 px-6 rounded-2xl border border-red-500/20 text-red-500 font-bold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
      <main id="main-content" className="flex-1 flex flex-col min-h-0 relative" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
};