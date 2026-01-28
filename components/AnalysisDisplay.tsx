
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { GeminiService } from '../services/geminiService';

// Decoding logic for PCM audio
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const SA_LANGUAGES = [
  'English', 'isiZulu', 'isiXhosa', 'Afrikaans', 'Sepedi', 
  'Setswana', 'Sesotho', 'Xitsonga', 'siSwati', 'Tshivenda', 'isiNdebele'
];

interface AnalysisDisplayProps {
  analysis: AnalysisResult;
  docName?: string;
  onVerify: () => void;
  isVerifying: boolean;
  onTranscriptionChange?: (text: string) => void;
  onSave?: () => Promise<void>;
  onTranslate?: (newAnalysis: AnalysisResult, lang: string) => void;
  currentLanguage?: string;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  analysis, 
  docName = "Legal Document",
  onVerify, 
  isVerifying,
  onTranscriptionChange,
  onSave,
  onTranslate,
  currentLanguage = 'English'
}) => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [saveComplete, setSaveComplete] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  
  const gemini = useRef(new GeminiService());
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Translation Progress simulation
  useEffect(() => {
    let interval: any;
    if (isTranslating) {
      setTranslationProgress(0);
      interval = setInterval(() => {
        setTranslationProgress(prev => {
          if (prev < 95) return prev + 1.5;
          return prev;
        });
      }, 100);
    } else {
      setTranslationProgress(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTranslating]);

  const speakText = async (id: string, text: string) => {
    if (isPlaying) return;
    setIsPlaying(id);
    if (onTranscriptionChange) onTranscriptionChange(text);
    
    try {
      const base64 = await gemini.current.generateSpeech(text);
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      // CRITICAL: Resume AudioContext after user gesture
      await audioCtxRef.current.resume();

      const buffer = await decodeAudioData(decode(base64), audioCtxRef.current, 24000, 1);
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtxRef.current.destination);
      source.onended = () => {
        setIsPlaying(null);
        if (onTranscriptionChange) onTranscriptionChange('');
      };
      source.start();
    } catch (e) {
      console.error("Speech error", e);
      setIsPlaying(null);
      if (onTranscriptionChange) onTranscriptionChange('');
    }
  };

  const handleTranslate = async (lang: string) => {
    setShowLangModal(false);
    if (!onTranslate || isTranslating) return;
    if (lang === currentLanguage) return;

    setIsTranslating(true);
    try {
      const newAnalysis = await gemini.current.translateAnalysis(analysis, lang);
      setTranslationProgress(100);
      setTimeout(() => {
        onTranslate(newAnalysis, lang);
        setIsTranslating(false);
      }, 500);
    } catch (err) {
      console.error("Translation failed", err);
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    try {
      await onSave();
      setSaveComplete(true);
      setTimeout(() => setSaveComplete(false), 3000);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  const getReportText = () => {
    return `
LEGALEASE LEGAL ANALYSIS REPORT
==============================

DOCUMENT NAME:   ${docName}
SYNTHESIS DIALECT:   ${currentLanguage}
GENERATED DATE:   ${new Date().toLocaleString()}

1. EXECUTIVE SUMMARY (PLAIN LANGUAGE)
-----------------------------------------------------------
${analysis.simplifiedExplanation}


2. CRITICAL RISKS IDENTIFIED
-----------------------------------------------------------
${analysis.risks.map((r, i) => `${i + 1}.    ${r}`).join('\n\n')}


3. IMPORTANT DEADLINES
-----------------------------------------------------------
${analysis.deadlines.map(d => `•    [${d.date}]    ---    ${d.description}`).join('\n\n')}


4. PRIMARY OBLIGATIONS & RESPONSIBILITIES
-----------------------------------------------------------
${analysis.obligations.map((o, i) => `${i + 1}.    ${o}`).join('\n\n')}


-----------------------------------------------------------
DISCLAIMER: This analysis is an AI-generated synthesis by LegalEase. 
It does not constitute formal legal advice.
    `;
  };

  const exportAsTxt = () => {
    const content = getReportText().trim();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docName.replace(/\s+/g, '_')}_Analysis.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
  };

  const exportAsDoc = () => {
    const text = getReportText();
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.8; color: #0f172a; padding: 20px; }
          h1 { color: #1e293b; border-bottom: 3px solid #f59e0b; padding-bottom: 12px; font-size: 24pt; margin-bottom: 24pt; }
          h2 { color: #334155; margin-top: 32pt; margin-bottom: 12pt; border-bottom: 1px solid #e2e8f0; font-size: 16pt; text-transform: uppercase; letter-spacing: 1px; }
          .meta-row { font-size: 11pt; margin-bottom: 6pt; color: #64748b; font-weight: bold; }
          .report-content { white-space: pre-wrap; font-size: 11pt; color: #1e293b; }
          .footer { font-size: 9pt; color: #94a3b8; margin-top: 60pt; border-top: 1px solid #f1f5f9; padding-top: 20px; font-style: italic; text-align: center; }
        </style>
      </head>
      <body>
        <h1>LegalEase Analysis Report</h1>
        <div class="meta-row">DOCUMENT: ${docName}</div>
        <div class="meta-row">DIALECT: ${currentLanguage}</div>
        <div class="meta-row">GENERATED: ${new Date().toLocaleString()}</div>
        <hr/>
        <div class="report-content">
${text}
        </div>
        <div class="footer">
          LegalEase Legal Synthesis Platform &copy; ${new Date().getFullYear()}. This synthesis does not replace professional legal council.
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docName.replace(/\s+/g, '_')}_Analysis.doc`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 print-container relative">
      
      {/* Visual Literacy Section */}
      {analysis.visualAidUrl && (
        <section className="bg-slate-900/40 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/5 group backdrop-blur-md" aria-labelledby="visual-aid-title">
          <div className="p-3 sm:p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true"></span>
              <h3 id="visual-aid-title" className="text-[8px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest">AI Vision Synthesis</h3>
            </div>
            <span className="text-[7px] sm:text-[9px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded font-bold uppercase border border-amber-500/20">Accessibility</span>
          </div>
          <div className="aspect-video relative bg-slate-950 overflow-hidden">
             <img src={analysis.visualAidUrl} alt={`AI-generated visual concept`} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-80" />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4 sm:p-8">
                <p className="text-white text-[10px] sm:text-xs font-medium max-w-sm italic">Conceptualizing legal obligation metaphors.</p>
             </div>
          </div>
        </section>
      )}

      {/* Language Modal Overlay */}
      {showLangModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 no-print overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border-2 border-amber-500/30 rounded-[2rem] sm:rounded-[3rem] shadow-[0_0_80px_rgba(245,158,11,0.25)] p-6 sm:p-10 flex flex-col relative my-auto">
             <div className="flex items-center justify-between mb-6 sm:mb-10">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white serif tracking-tight">Language Hub</h3>
                  <p className="text-[9px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">Any official SA dialect</p>
                </div>
                <button onClick={() => setShowLangModal(false)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-all hover:rotate-90">
                  <svg className="w-5 h-5 sm:w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {SA_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleTranslate(lang)}
                    className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 transition-all flex flex-col items-start space-y-1 sm:space-y-2 group/btn ${
                      currentLanguage === lang 
                        ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg' 
                        : 'bg-white/5 border-white/5 text-slate-300 hover:border-amber-500/40 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-black tracking-tight">{lang}</span>
                    <span className={`text-[7px] sm:text-[8px] font-bold uppercase tracking-widest ${currentLanguage === lang ? 'text-slate-900/60' : 'text-slate-500'}`}>
                      {currentLanguage === lang ? 'ACTIVE' : 'SELECT'}
                    </span>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Translation Progress Overlay */}
      {isTranslating && (
        <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-2xl no-print animate-in fade-in duration-300 p-6">
          <div className="relative w-32 h-32 sm:w-48 sm:h-48 mb-8 sm:mb-10">
            <div className="absolute inset-0 border-[4px] sm:border-[6px] border-white/5 rounded-full"></div>
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray="295.3"
                strokeDashoffset={295.3 - (295.3 * translationProgress) / 100}
                className="text-amber-500 transition-all duration-300 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl sm:text-4xl font-black text-white tracking-tighter">{Math.floor(translationProgress)}%</span>
              <span className="text-[7px] sm:text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mt-2">Processing</span>
            </div>
          </div>
          <div className="text-center space-y-2 sm:space-y-3 px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white serif italic">Synthesizing Dialect</h2>
            <p className="text-slate-500 text-[10px] sm:text-sm font-medium tracking-wide uppercase">Applying linguistic nuances to legal synthesis</p>
          </div>
          <div className="w-48 sm:w-64 h-1 bg-white/5 rounded-full mt-8 sm:mt-10 overflow-hidden">
            <div 
              className="h-full bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] transition-all duration-300"
              style={{ width: `${translationProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <section className={`bg-slate-900/40 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-10 shadow-2xl border border-white/5 relative overflow-hidden transition-all duration-300 ${isTranslating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} aria-labelledby="summary-title">
        <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center mb-8 sm:mb-10 relative z-10 no-print">
          <div className="flex items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500 text-slate-950 rounded-[1rem] sm:rounded-[1.25rem] flex items-center justify-center mr-4 sm:mr-6 shadow-2xl transform hover:rotate-6 transition-transform flex-shrink-0">
              <svg className="w-6 h-6 sm:w-9 sm:h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="min-w-0">
              <h3 id="summary-title" className="text-xl sm:text-3xl font-bold text-white serif tracking-tight truncate">Document Insights</h3>
              <div className="flex items-center space-x-3 mt-2">
                <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] border border-amber-500/20">
                  {currentLanguage}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowLangModal(true)}
            className="w-full sm:w-auto flex items-center justify-center space-x-3 px-6 py-4 sm:px-10 sm:py-5 rounded-xl sm:rounded-[1.5rem] text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 border-2 bg-white text-slate-950 border-white hover:bg-amber-500 hover:border-amber-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
            <span>Change Language</span>
          </button>
        </div>

        <div className="relative z-10">
           <div className={`transition-all duration-700 p-6 sm:p-12 rounded-[1.25rem] sm:rounded-[2.5rem] bg-white/[0.03] border border-white/10 ${isPlaying === 'summary' ? 'ring-2 ring-amber-500/40 bg-amber-500/[0.05]' : ''}`}>
              <p className="text-slate-100 leading-relaxed text-base sm:text-xl font-medium tracking-tight">
                {analysis.simplifiedExplanation}
              </p>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mt-8 sm:mt-10 relative z-10 no-print">
          <button onClick={handleSave} disabled={isSaving} className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest transition-all shadow-xl border ${saveComplete ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}>
            <span>{isSaving ? 'Securing...' : saveComplete ? 'Secured' : 'Save To Vault'}</span>
          </button>
          
          <div className="relative flex-1">
            <button 
              onClick={() => setShowExportOptions(!showExportOptions)} 
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            >
              <span>Export Analysis</span>
            </button>
            {showExportOptions && (
              <div className="absolute left-0 bottom-full mb-3 w-full sm:w-48 bg-slate-900 border-2 border-white/10 rounded-2xl shadow-2xl py-2 z-50">
                <button onClick={exportAsDoc} className="w-full text-left px-5 py-3 text-[10px] font-bold text-slate-300 hover:bg-white/5 hover:text-amber-500 transition-colors flex items-center space-x-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span>Word Document</span>
                </button>
                <button onClick={exportAsTxt} className="w-full text-left px-5 py-3 text-[10px] font-bold text-slate-300 hover:bg-white/5 hover:text-amber-500 transition-colors flex items-center space-x-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                  <span>Text File</span>
                </button>
                <button onClick={() => setShowExportOptions(false)} className="w-full text-center px-5 py-3 text-[10px] font-bold text-slate-600 hover:text-white transition-colors border-t border-white/5 mt-2">Dismiss</button>
              </div>
            )}
          </div>

          <button onClick={() => speakText('summary', analysis.simplifiedExplanation)} className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] font-black uppercase tracking-widest border transition-all ${isPlaying === 'summary' ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 animate-pulse' : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            <span>{isPlaying === 'summary' ? 'Listening...' : 'Recap Audio'}</span>
          </button>
        </div>
      </section>

      {/* Grid Sections */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 transition-all duration-300 ${isTranslating ? 'opacity-0' : 'opacity-100'}`}>
        <section className="bg-slate-900/40 backdrop-blur-xl rounded-[1.25rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-white/5">
          <h3 className="text-[10px] sm:text-xs font-black text-white flex items-center uppercase tracking-widest mb-6 sm:mb-8">
            <span className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500/10 text-red-500 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 border border-red-500/20">!</span>
            Critical Risks
          </h3>
          <ul className="space-y-3 sm:space-y-4">
            {analysis.risks.map((risk, i) => (
              <li key={i} className="flex items-start text-xs sm:text-sm text-slate-300 bg-red-900/10 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-red-900/20">
                <span className="font-bold text-red-500 mr-3 sm:mr-4 mt-0.5">!</span>
                <span className="font-medium leading-relaxed">{risk}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-slate-900/40 backdrop-blur-xl rounded-[1.25rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-white/5">
          <h3 className="text-[10px] sm:text-xs font-black text-white flex items-center uppercase tracking-widest mb-6 sm:mb-8">
            <span className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/10 text-amber-500 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 border border-amber-500/20 text-lg">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
            </span>
            Deadlines
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {analysis.deadlines.map((dl, i) => (
              <div key={i} className="flex flex-col p-4 sm:p-5 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                <span className="text-xs sm:text-sm font-black text-amber-500 mb-1 sm:mb-2">{dl.date}</span>
                <p className="text-[10px] sm:text-xs font-medium text-slate-400 leading-relaxed">{dl.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={`bg-slate-900/40 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl border border-white/5 transition-all duration-300 ${isTranslating ? 'opacity-0' : 'opacity-100'}`}>
        <h3 className="text-[10px] sm:text-xs font-black text-white flex items-center uppercase tracking-widest mb-8 sm:mb-10">Primary Duties</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {analysis.obligations.map((ob, i) => (
            <div key={i} className="flex items-start text-xs sm:text-sm text-slate-300 bg-white/[0.03] p-6 sm:p-8 rounded-[1.25rem] sm:rounded-3xl border border-white/5 group hover:bg-white/[0.08] transition-all">
              <span className="mr-4 sm:mr-6 text-amber-500 font-black text-xl sm:text-2xl opacity-20 group-hover:opacity-100 flex-shrink-0">{i+1 < 10 ? `0${i+1}` : i+1}</span>
              <p className="font-semibold text-slate-200 leading-relaxed">{ob}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center no-print pb-6">
        <button onClick={() => setShowSource(true)} className="text-[8px] sm:text-[10px] font-black text-slate-600 hover:text-amber-500 uppercase tracking-[0.3em] transition-colors bg-white/5 px-6 sm:px-8 py-3 rounded-xl border border-white/5">
          View Extracted Text
        </button>
      </div>

      {showSource && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in no-print overflow-y-auto">
          <div className="max-w-4xl w-full max-h-[90vh] bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col my-auto">
            <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-white serif tracking-tight">Raw Data</h3>
              <button onClick={() => setShowSource(false)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-950 font-mono text-[10px] sm:text-xs leading-relaxed text-slate-400 whitespace-pre-wrap custom-scrollbar">
              {analysis.fullText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};