
import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { User } from '../types';

interface AuthOverlayProps {
  onAuthenticated: (user: User, passwordUsed: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'recovery-verify';

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [recoveredUser, setRecoveredUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authService = new AuthService();

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        const user = await authService.signUp(email, displayName, password, question, answer);
        onAuthenticated(user, password);
      } else if (mode === 'login') {
        const user = await authService.login(email, password);
        onAuthenticated(user, password);
      } else if (mode === 'forgot') {
        const user = await authService.findUserByEmail(email);
        if (!user) throw new Error("No user found with this email.");
        setRecoveredUser(user);
        setMode('recovery-verify');
      } else if (mode === 'recovery-verify') {
        if (!recoveredUser) return;
        await authService.recover(email, answer, password);
        const user = await authService.login(email, password);
        onAuthenticated(user, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 backdrop-blur-3xl bg-slate-950/90 overflow-y-auto">
      <div className="max-w-md w-full bg-slate-900 rounded-[2rem] sm:rounded-[3rem] border border-white/10 p-6 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-500 my-auto">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0020 10.355V19a2 2 0 01-2 2h-1" />
          </svg>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white serif mb-2 text-center">
          {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Recover Identity'}
        </h2>
        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mb-8 sm:mb-10 text-center">
          Secure Legal Access
        </p>

        <form onSubmit={handleAction} className="space-y-4 sm:space-y-5">
          {mode !== 'recovery-verify' && (
            <input
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm sm:text-base"
            />
          )}

          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Full Name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm sm:text-base"
            />
          )}

          {(mode === 'login' || mode === 'signup' || mode === 'recovery-verify') && (
            <input
              type="password"
              placeholder={mode === 'recovery-verify' ? "Set New Password" : "Password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm sm:text-base"
            />
          )}

          {mode === 'signup' && (
            <input
              type="password"
              placeholder="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm sm:text-base"
            />
          )}

          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="Security Question"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm sm:text-base"
              />
              <input
                type="text"
                placeholder="Your Answer"
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm sm:text-base"
              />
            </>
          )}

          {mode === 'recovery-verify' && recoveredUser && (
            <div className="space-y-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Security Question</p>
                <p className="text-xs sm:text-sm text-white font-medium">{recoveredUser.securityQuestion}</p>
              </div>
              <input
                type="text"
                placeholder="Answer to recover"
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm sm:text-base"
              />
            </div>
          )}

          {error && (
            <div className="p-3 sm:p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-[10px] sm:text-xs font-bold text-red-200 text-center uppercase tracking-widest animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 text-slate-900 px-6 sm:px-8 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-sm shadow-xl hover:bg-amber-400 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-3 mt-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4 text-slate-900" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            <span>
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Identity' : mode === 'forgot' ? 'Find Account' : 'Reset & Login'}
            </span>
          </button>
        </form>

        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/5 flex flex-col space-y-3 sm:space-y-4 items-center">
          {mode === 'login' && (
            <>
              <button onClick={() => switchMode('signup')} className="text-[10px] sm:text-xs font-bold text-amber-500/70 hover:text-amber-500 transition-colors uppercase tracking-widest">
                Create new legal identity
              </button>
              <button onClick={() => switchMode('forgot')} className="text-[9px] sm:text-[10px] font-bold text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest">
                Forgot credentials?
              </button>
            </>
          )}
          {(mode === 'signup' || mode === 'forgot' || mode === 'recovery-verify') && (
            <button onClick={() => switchMode('login')} className="text-[10px] sm:text-xs font-bold text-amber-500/70 hover:text-amber-500 transition-colors uppercase tracking-widest">
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
