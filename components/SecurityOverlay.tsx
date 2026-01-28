
import React, { useState } from 'react';

interface SecurityOverlayProps {
  onUnlock: (key: string) => Promise<void>;
}

export const SecurityOverlay: React.FC<SecurityOverlayProps> = ({ onUnlock }) => {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase || passphrase.length < 6) {
      setError("Passphrase must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onUnlock(passphrase);
    } catch (err: any) {
      setError(err.message || "Failed to unlock vault. Ensure your key is correct.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/80">
      <div className="max-w-md w-full bg-slate-900 rounded-[2.5rem] border border-white/10 p-10 shadow-[0_0_100px_rgba(245,158,11,0.1)] text-center animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <svg className="w-10 h-10 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h2 className="text-3xl font-bold text-white serif mb-3">LegalEase E2EE</h2>
        <p className="text-sm text-slate-400 font-medium mb-10 leading-relaxed">
          Unlock your private legal vault. Your master key is used locally for encryption and is never transmitted.
        </p>

        <form handleSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <input 
              type="password" 
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter Private Master Key"
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-center placeholder:text-slate-600 font-mono tracking-widest"
              autoFocus
            />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-amber-500/10 pointer-events-none group-hover:ring-amber-500/20 transition-all"></div>
          </div>

          {error && (
            <div className="p-4 bg-red-950/50 border border-red-500/50 rounded-xl text-[11px] font-bold text-red-200 uppercase tracking-widest animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 text-slate-950 px-8 py-4 rounded-xl font-bold text-sm hover:bg-amber-400 transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <span>Unlock Personal Vault</span>
            )}
          </button>
        </form>

        <p className="mt-8 text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-relaxed">
          Encryption standard: AES-256-GCM + PBKDF2<br/>
          Key is memory-resident only.
        </p>
      </div>
    </div>
  );
};