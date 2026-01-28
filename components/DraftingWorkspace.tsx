
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { DraftData } from '../types';

interface DraftingWorkspaceProps {
  initialDraft?: DraftData | null;
  onSave: (draft: DraftData) => void;
  onClose: () => void;
  preferredLanguage: string;
}

export const DraftingWorkspace: React.FC<DraftingWorkspaceProps> = ({ 
  initialDraft, 
  onSave, 
  onClose,
  preferredLanguage 
}) => {
  const [step, setStep] = useState<'details' | 'editing'>(initialDraft ? 'editing' : 'details');
  const [docType, setDocType] = useState<DraftData['type']>(initialDraft?.type || 'NDA');
  const [details, setDetails] = useState('');
  const [title, setTitle] = useState(initialDraft?.title || '');
  const [generatedContent, setGeneratedContent] = useState(initialDraft?.content || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const gemini = new GeminiService();

  // Progress simulation for drafting
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 40) return prev + 3;
          if (prev < 75) return prev + 1;
          if (prev < 98) return prev + 0.5;
          return prev;
        });
      }, 100);
    } else {
      setProgress(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!details.trim() || !title.trim()) return;
    setIsGenerating(true);
    try {
      const content = await gemini.generateLegalDraft(docType, details, preferredLanguage);
      setProgress(100);
      setTimeout(() => {
        setGeneratedContent(content);
        setStep('editing');
        setIsGenerating(false);
      }, 500);
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  const handleFinalSave = () => {
    const draft: DraftData = {
      id: initialDraft?.id || Math.random().toString(36).substr(2, 9),
      title,
      type: docType,
      content: generatedContent,
      lastModified: Date.now()
    };
    onSave(draft);
    onClose();
  };

  const exportAsTxt = () => {
    const content = `
LEGAL INSTRUMENT:    ${title.toUpperCase()}
CATEGORY:            ${docType}
LOCAL DIALECT:       ${preferredLanguage}
GENERATED DATE:      ${new Date().toLocaleString()}
-----------------------------------------------------------

${generatedContent}

-----------------------------------------------------------
OFFICIALLY GENERATED VIA LEGALEASE LEGAL SYNTHESIS HUB
    `;
    const blob = new Blob([content.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
  };

  const exportAsDoc = () => {
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Times New Roman', serif; line-height: 2.0; color: #111; padding: 1.5in; }
          h1 { font-size: 26pt; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 40px; text-transform: uppercase; }
          .subtitle { font-size: 12pt; text-align: center; font-weight: bold; margin-bottom: 50px; color: #333; text-transform: uppercase; letter-spacing: 2px; }
          .legal-body { font-size: 12pt; white-space: pre-wrap; text-align: justify; }
          .sig-line { margin-top: 60px; border-top: 1px solid #000; width: 250px; display: inline-block; margin-right: 50px; }
          .footer-note { margin-top: 80px; font-size: 10pt; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-style: italic; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="subtitle">${docType} Framework (Processed in ${preferredLanguage})</div>
        <hr/>
        <div class="legal-body">
${generatedContent}
        </div>
        
        <div style="margin-top: 100px;">
          <div class="sig-line">Parties Representative (A)</div>
          <div class="sig-line">Parties Representative (B)</div>
        </div>

        <div class="footer-note">
          This document was synthesized via LegalEase Legal Suite on ${new Date().toLocaleDateString()}.
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
      <div className="absolute inset-0 legal-gradient opacity-20 pointer-events-none"></div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 relative z-10 custom-scrollbar">
        <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
          <header className="mb-6 sm:mb-10 flex justify-between items-start no-print flex-shrink-0 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white serif tracking-tight">
                {initialDraft ? 'Edit Legal Framework' : 'Legal Drafting Suite'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Language: <span className="text-amber-500 font-bold">{preferredLanguage}</span>
              </p>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>

          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] sm:rounded-[3rem] border border-white/5 animate-in fade-in duration-500 min-h-[400px]">
              <div className="relative w-32 h-32 sm:w-48 sm:h-48 mb-8 sm:mb-10">
                <div className="absolute inset-0 border-[4px] sm:border-[6px] border-white/5 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-[4px] sm:border-[6px] border-amber-500 rounded-full border-t-transparent animate-spin" 
                  style={{ animationDuration: '2.5s' }}
                ></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-4xl font-black text-white">{Math.floor(progress)}%</span>
                  <span className="text-[7px] sm:text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">Synthesizing</span>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 serif italic text-center px-4">Drafting Professional Clauses...</h2>
              <p className="text-slate-500 text-[10px] sm:text-sm max-w-sm text-center leading-relaxed px-4">
                Applying legal precedents and local dialect nuances to your document structure.
              </p>
              <div className="w-48 sm:w-64 h-1.5 bg-white/5 rounded-full mt-8 sm:mt-10 overflow-hidden border border-white/5">
                <div className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          ) : step === 'details' ? (
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl space-y-6 sm:space-y-8 no-print flex-shrink-0 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Document Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Employment Agreement 2025"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Template Category</label>
                  <select 
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DraftData['type'])}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="NDA">Non-Disclosure Agreement</option>
                    <option value="Contract">General Service Contract</option>
                    <option value="Prenup">Prenuptial Agreement</option>
                    <option value="Lease">Residential Lease</option>
                    <option value="General">Custom Document</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Key Terms & Context</label>
                <textarea 
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={`Briefly explain parties, terms, and context...`}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-3 sm:py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all min-h-[150px] sm:min-h-[200px] shadow-inner custom-scrollbar"
                />
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !title || !details}
                className="w-full bg-amber-500 text-slate-900 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] hover:bg-amber-400 transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span>Synthesize Legal Framework</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-slate-900 border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden print:h-auto print:border-none print:shadow-none print:bg-white min-h-[500px] animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 sm:p-6 border-b border-white/5 bg-slate-950 flex flex-col sm:flex-row justify-between items-start sm:items-center no-print flex-shrink-0 gap-4">
                <h4 className="font-bold text-white text-[10px] sm:text-xs uppercase tracking-widest truncate max-w-full">
                  Editing: {title}
                </h4>
                <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                  
                  {/* Export Dropdown */}
                  <div className="relative flex-1 sm:flex-none">
                    <button 
                      onClick={() => setShowExportOptions(!showExportOptions)}
                      className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-white/5 text-slate-300 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2 border border-white/10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      <span className="hidden xs:inline">Export</span>
                    </button>
                    {showExportOptions && (
                      <div className="absolute right-0 mt-3 w-48 sm:w-52 bg-slate-900 border-2 border-white/10 rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-2">
                        <button onClick={exportAsDoc} className="w-full text-left px-5 py-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 hover:text-amber-500 transition-colors flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <span>Word Format</span>
                        </button>
                        <button onClick={exportAsTxt} className="w-full text-left px-5 py-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 hover:text-amber-500 transition-colors flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                          <span>Plain Text</span>
                        </button>
                        <button onClick={() => setShowExportOptions(false)} className="w-full text-center px-5 py-3 text-[10px] font-bold text-slate-600 hover:text-white transition-colors border-t border-white/5 mt-2">Dismiss</button>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleFinalSave}
                    className="flex-1 sm:flex-none px-6 sm:px-8 py-2.5 sm:py-3 bg-amber-500 text-slate-950 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl no-print active:scale-95"
                  >
                    Save Draft
                  </button>
                </div>
              </div>

              {/* Screen Editor */}
              <textarea 
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                className="flex-1 bg-slate-900 p-6 sm:p-10 text-slate-200 font-mono text-[11px] sm:text-sm leading-[1.8] focus:outline-none resize-none custom-scrollbar whitespace-pre-wrap no-print overflow-y-auto"
                placeholder="Refine your legal framework here..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};