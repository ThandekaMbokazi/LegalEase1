
import React, { useState } from 'react';
import { User } from '../types';
import { AuthService } from '../services/authService';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdate }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [securityQuestion, setSecurityQuestion] = useState(user.securityQuestion);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const authService = new AuthService();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updated = await authService.updateUser(
        user.id,
        { displayName, email, securityQuestion },
        newPassword || undefined,
        securityAnswer || undefined
      );
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-950/80">
      <div className="max-w-xl w-full bg-slate-900 rounded-[3rem] border border-white/10 p-10 shadow-2xl animate-in zoom-in-95 duration-500 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="flex items-center space-x-6 mb-10">
          <div className="w-20 h-20 rounded-[2rem] bg-amber-500 flex items-center justify-center text-slate-950 font-black text-3xl shadow-xl">
            {displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white serif tracking-tight">Personal Identity</h2>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em]">LegalEase Legal Vault Holder</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Security Question</label>
            <input 
              type="text" 
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Change Security Answer</label>
                <input 
                  type="password" 
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Change Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                />
             </div>
          </div>

          {error && (
            <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-2xl text-[11px] font-bold text-red-200 text-center uppercase tracking-widest animate-pulse">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl text-[11px] font-bold text-emerald-200 text-center uppercase tracking-widest">
              Profile Secured Successfully
            </div>
          )}

          <div className="flex space-x-4 pt-4">
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-amber-500 text-slate-950 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Saving Changes..." : "Secure Identity"}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 border border-white/10 hover:bg-white/5 transition-all"
            >
              Dismiss
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};