
import React from 'react';
import { AccessibilitySettings } from '../types';

interface AccessibilityToolProps {
  settings: AccessibilitySettings;
  onUpdateSettings: (s: AccessibilitySettings) => void;
  isOpen: boolean;
  onClose: () => void;
  activeTranscription?: string;
  isRecording?: boolean;
}

const SA_LANGUAGES = [
  'English',
  'isiZulu',
  'isiXhosa',
  'Afrikaans',
  'Sepedi',
  'Setswana',
  'Sesotho',
  'Xitsonga',
  'siSwati',
  'Tshivenda',
  'isiNdebele'
];

export const AccessibilityTool: React.FC<AccessibilityToolProps> = ({ 
  settings, 
  onUpdateSettings, 
  isOpen,
  onClose,
  activeTranscription,
  isRecording 
}) => {
  return (
    <>
      {/* Transcription Overlay - Always stays at bottom */}
      {settings.subtitlesEnabled && (activeTranscription || isRecording) && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pointer-events-none"
          aria-live="polite"
        >
          <div className="max-w-4xl mx-auto bg-black/95 text-white p-4 sm:p-6 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/20 backdrop-blur-2xl">
            <div className="flex items-center space-x-3 mb-2">
              <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-amber-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Synthesis Captions</span>
            </div>
            <p className={`text-base sm:text-xl font-bold leading-relaxed ${!activeTranscription ? 'italic text-slate-500' : ''}`}>
              {activeTranscription || (isRecording ? "Analyzing audio stream..." : "")}
            </p>
          </div>
        </div>
      )}

      {/* Accessibility Settings Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-3xl animate-in fade-in duration-300">
          <div 
            className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-[2rem] sm:rounded-[3rem] shadow-[0_0_80px_rgba(245,158,11,0.15)] p-6 sm:p-10 space-y-8 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] custom-scrollbar relative"
            role="dialog"
            aria-label="Accessibility Controls"
          >
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center space-x-5">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white serif tracking-tight">Accessibility Toolkit</h4>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mt-1">Inclusive Legal Experience</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-200">High Contrast Mode</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5">Optimized for visual clarity</div>
                </div>
                <button 
                  onClick={() => onUpdateSettings({ ...settings, highContrast: !settings.highContrast })}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.highContrast ? 'bg-amber-500' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${settings.highContrast ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-200">Magnified Typography</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5">25% increased font scale</div>
                </div>
                <button 
                  onClick={() => onUpdateSettings({ ...settings, largeText: !settings.largeText })}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.largeText ? 'bg-amber-500' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${settings.largeText ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-200">Synthesized Subtitles</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5">Global real-time transcription</div>
                </div>
                <button 
                  onClick={() => onUpdateSettings({ ...settings, subtitlesEnabled: !settings.subtitlesEnabled })}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.subtitlesEnabled ? 'bg-amber-500' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${settings.subtitlesEnabled ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              {/* Language Selection */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col">
                  <div className="text-xs sm:text-sm font-bold text-slate-200">System Dialect</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-widest">Sets the baseline for AI synthesis</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SA_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => onUpdateSettings({ ...settings, preferredLanguage: lang })}
                      className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                        settings.preferredLanguage === lang 
                          ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-lg' 
                          : 'bg-white/5 text-slate-400 border-white/10 hover:border-amber-500/50 hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 text-center">
              <button 
                onClick={onClose}
                className="w-full sm:w-auto px-12 py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-500 transition-all shadow-xl active:scale-95"
              >
                Close Toolkit
              </button>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-6 leading-relaxed">
                LegalEase supports multilingual accessibility to ensure equitable legal access across South Africa.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};