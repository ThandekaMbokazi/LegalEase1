
import React, { useState, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { ChatInterface } from './components/ChatInterface';
import { LiveAssistant } from './components/LiveAssistant';
import { DraftingWorkspace } from './components/DraftingWorkspace';
import { DraftLibrary } from './components/DraftLibrary';
import { AccessibilityTool } from './components/AccessibilityTool';
import { AuthOverlay } from './components/AuthOverlay';
import { ProfileModal } from './components/ProfileModal';
import { SecurityOverlay } from './components/SecurityOverlay';
import { AnalysisStatus, DocumentData, AccessibilitySettings, User, DraftData, AnalysisResult } from './types';
import { GeminiService } from './services/geminiService';
import { SecureStorage } from './services/storageService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [activeDoc, setActiveDoc] = useState<DocumentData | null>(null);
  const [activeDraft, setActiveDraft] = useState<DraftData | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'chat' | 'voice'>('insights');
  const [view, setView] = useState<'workspace' | 'library' | 'drafts' | 'drafting'>('workspace');
  const [history, setHistory] = useState<DocumentData[]>([]);
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  
  const [accSettings, setAccSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    subtitlesEnabled: true,
    preferredLanguage: 'English'
  });
  const [globalTranscription, setGlobalTranscription] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gemini = useRef(new GeminiService());
  const vault = useRef(new SecureStorage());

  useEffect(() => {
    document.body.classList.toggle('high-contrast-mode', accSettings.highContrast);
    document.body.classList.toggle('large-text-mode', accSettings.largeText);
  }, [accSettings]);

  const handleAuthenticated = async (user: User, passwordUsed: string) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    const success = await vault.current.initializeVault(user.id, passwordUsed);
    if (success) {
      const storedHistory = await vault.current.loadHistory();
      const storedDrafts = await vault.current.loadDrafts();
      setHistory(storedHistory);
      setDrafts(storedDrafts);
      setIsVaultUnlocked(true);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsVaultUnlocked(false);
    setHistory([]);
    setDrafts([]);
    setActiveDoc(null);
    setActiveDraft(null);
    vault.current.clearVault();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setStatus(AnalysisStatus.ANALYZING);
    setProgress(10);
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        setProgress(30);
        const analysis = await gemini.current.analyzeDocument(base64, file.type, accSettings.preferredLanguage);
        
        if (!analysis.isValidDomain) {
          setError(analysis.domainError || "Document rejected.");
          setStatus(AnalysisStatus.ERROR);
          return;
        }

        setProgress(60);
        setStatus(AnalysisStatus.GENERATING_VISUAL);
        const visualAid = await gemini.current.generateVisualAid(analysis.simplifiedExplanation);
        analysis.visualAidUrl = visualAid;

        const newDoc: DocumentData = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          base64: base64,
          analysis: analysis,
          timestamp: Date.now(),
          tags: analysis.suggestedTags || []
        };

        const updatedHistory = [newDoc, ...history].slice(0, 50);
        setHistory(updatedHistory);
        await vault.current.saveHistory(updatedHistory);

        setProgress(100);
        setTimeout(() => {
          setActiveDoc(newDoc);
          setStatus(AnalysisStatus.COMPLETED);
          setActiveTab('insights');
          setView('workspace');
        }, 500);
      } catch (error: any) {
        setError(error.message || "An unexpected error occurred.");
        setStatus(AnalysisStatus.ERROR);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveDraft = async (draft: DraftData) => {
    const exists = drafts.find(d => d.id === draft.id);
    let updatedDrafts: DraftData[];
    if (exists) {
      updatedDrafts = drafts.map(d => d.id === draft.id ? draft : d);
    } else {
      updatedDrafts = [draft, ...drafts];
    }
    setDrafts(updatedDrafts);
    await vault.current.saveDrafts(updatedDrafts);
    setView('drafts');
  };

  const handleDeleteDraft = async (id: string) => {
    const updated = drafts.filter(d => d.id !== id);
    setDrafts(updated);
    await vault.current.saveDrafts(updated);
  };

  const handleManualTranslate = async (newAnalysis: AnalysisResult, lang: string) => {
    if (!activeDoc) return;
    const updatedDoc = { ...activeDoc, analysis: newAnalysis };
    setActiveDoc(updatedDoc);
    setAccSettings(prev => ({ ...prev, preferredLanguage: lang }));
    const updatedHistory = history.map(h => h.id === activeDoc.id ? updatedDoc : h);
    setHistory(updatedHistory);
    await vault.current.saveHistory(updatedHistory);
  };

  const renderContent = () => {
    if (!isAuthenticated) return <AuthOverlay onAuthenticated={handleAuthenticated} />;
    if (!isVaultUnlocked) return <SecurityOverlay onUnlock={async (key) => {
      if (currentUser) {
        const success = await vault.current.initializeVault(currentUser.id, key);
        if (success) {
          setHistory(await vault.current.loadHistory());
          setDrafts(await vault.current.loadDrafts());
          setIsVaultUnlocked(true);
        } else {
          throw new Error("Invalid decryption key.");
        }
      }
    }} />;

    if (view === 'drafting') {
      return (
        <DraftingWorkspace 
          initialDraft={activeDraft}
          onSave={handleSaveDraft} 
          onClose={() => { setActiveDraft(null); setView('workspace'); }} 
          preferredLanguage={accSettings.preferredLanguage}
        />
      );
    }

    if (view === 'drafts') {
      return (
        <DraftLibrary 
          drafts={drafts} 
          onOpen={(d) => { setActiveDraft(d); setView('drafting'); }} 
          onDelete={handleDeleteDraft} 
          onNew={() => { setActiveDraft(null); setView('drafting'); }} 
        />
      );
    }

    if (view === 'library') {
      return (
        <div className="flex-1 p-8 bg-slate-950 legal-gradient min-h-full overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-white serif tracking-tight mb-12">Analysis Vault</h2>
            {history.length === 0 ? (
              <div className="bg-slate-900/40 border-2 border-dashed border-white/10 rounded-[3rem] p-20 text-center backdrop-blur-md">
                <h3 className="text-2xl font-bold text-white mb-3 serif italic">No Analyzed Documents</h3>
                <button onClick={() => setView('workspace')} className="bg-amber-500 text-slate-950 px-12 py-5 rounded-xl font-bold mt-4">Analyze New Scan</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {history.map((doc) => (
                  <div key={doc.id} onClick={() => { setActiveDoc(doc); setView('workspace'); setStatus(AnalysisStatus.COMPLETED); }} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] cursor-pointer group hover:border-amber-500/30 transition-all backdrop-blur-md">
                    <h4 className="font-bold text-white text-sm mb-4 truncate">{doc.name}</h4>
                    <p className="text-xs text-slate-400 line-clamp-3 italic">"{doc.analysis?.summary}"</p>
                    <div className="mt-6 pt-6 border-t border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                      {new Date(doc.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (status === AnalysisStatus.IDLE || status === AnalysisStatus.ERROR) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center legal-gradient min-h-[calc(100vh-65px)]">
          <h2 className="text-4xl sm:text-6xl font-extrabold text-white mb-6 serif tracking-tight max-w-4xl">Legal Clarity, Reclaimed.</h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-12 leading-relaxed">Decode complex documents or draft professional agreements with AI precision.</p>
          {error && <div className="mb-8 p-6 bg-red-900/60 border-2 border-red-500 rounded-3xl max-w-lg"><p className="text-white font-bold text-sm">{error}</p></div>}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
            <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 text-slate-950 px-12 py-5 rounded-xl font-bold text-lg shadow-2xl transition-all hover:scale-105 active:scale-95">Scan Document</button>
            <button onClick={() => setView('drafting')} className="px-12 py-5 rounded-xl font-bold text-lg text-white border border-white/20 transition-all hover:scale-105 active:scale-95 hover:bg-white/5">Draft Agreement</button>
          </div>
        </div>
      );
    }

    if (status === AnalysisStatus.ANALYZING || status === AnalysisStatus.GENERATING_VISUAL) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 min-h-[calc(100vh-65px)]">
          <div className="relative w-32 h-32 mb-10">
            <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold">{progress}%</div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 serif italic">
            {status === AnalysisStatus.ANALYZING ? "Deconstructing Document..." : "Synthesizing Visual Concepts..."}
          </h2>
          <p className="text-slate-500">LegalEase is securing and processing your request.</p>
        </div>
      );
    }

    if (activeDoc && activeDoc.analysis) {
      return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto pb-24">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white serif truncate pr-4">{activeDoc.name}</h2>
                <button onClick={() => setStatus(AnalysisStatus.IDLE)} className="text-[10px] font-black text-amber-500 border border-amber-500/20 px-4 py-2 rounded-lg hover:bg-amber-500/10 uppercase tracking-widest">New Scan</button>
              </div>

              <div className="flex space-x-2 mb-10 bg-slate-900/50 p-1 rounded-2xl w-fit">
                {(['insights', 'chat', 'voice'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 sm:px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{tab}</button>
                ))}
              </div>
              
              <div className="min-h-[500px]">
                {activeTab === 'insights' && (
                  <AnalysisDisplay 
                    analysis={activeDoc.analysis} 
                    docName={activeDoc.name}
                    onTranslate={handleManualTranslate}
                    currentLanguage={accSettings.preferredLanguage}
                    onVerify={() => {}}
                    isVerifying={false}
                    onTranscriptionChange={setGlobalTranscription}
                  />
                )}
                {activeTab === 'chat' && (
                  <div className="h-[600px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                    <ChatInterface documentContext={JSON.stringify(activeDoc.analysis)} targetLanguage={accSettings.preferredLanguage} />
                  </div>
                )}
                {activeTab === 'voice' && (
                  <div className="h-[600px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                    <LiveAssistant 
                      documentContext={JSON.stringify(activeDoc.analysis)} 
                      targetLanguage={accSettings.preferredLanguage} 
                      onTranscriptionChange={setGlobalTranscription}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout 
      currentView={view} 
      onViewChange={setView}
      user={currentUser}
      onLogout={handleLogout}
      onProfileClick={() => setIsProfileOpen(true)}
      onToggleAccessibility={() => setIsAccessibilityOpen(true)}
    >
      {renderContent()}
      <AccessibilityTool 
        settings={accSettings} 
        onUpdateSettings={setAccSettings} 
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
        activeTranscription={globalTranscription}
      />
      {isProfileOpen && currentUser && (
        <ProfileModal 
          user={currentUser} 
          onClose={() => setIsProfileOpen(false)} 
          onUpdate={(u) => setCurrentUser(u)} 
        />
      )}
    </Layout>
  );
};

export default App;
