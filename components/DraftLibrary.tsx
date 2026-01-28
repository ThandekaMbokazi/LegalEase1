
import React from 'react';
import { DraftData } from '../types';

interface DraftLibraryProps {
  drafts: DraftData[];
  onOpen: (draft: DraftData) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export const DraftLibrary: React.FC<DraftLibraryProps> = ({ drafts, onOpen, onDelete, onNew }) => {
  return (
    <div className="flex-1 p-8 bg-slate-950 legal-gradient min-h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-white serif tracking-tight">Drafts & Creations</h2>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed font-medium">Your custom legal frameworks, created and refined within your local vault.</p>
          </div>
          <button 
            onClick={onNew}
            className="bg-amber-500 text-slate-950 px-8 py-3 rounded-xl font-bold text-xs hover:bg-amber-400 transition-all shadow-xl active:scale-95 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            Create New Draft
          </button>
        </header>

        {drafts.length === 0 ? (
          <div className="bg-slate-900/40 border-2 border-dashed border-white/10 rounded-[3rem] p-20 text-center shadow-sm backdrop-blur-md">
            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-500">
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 serif italic">No Drafts Found</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Use the Drafting Suite to generate your first professional agreement.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
            {drafts.map((draft) => (
              <div 
                key={draft.id}
                onClick={() => onOpen(draft)}
                className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] hover:shadow-2xl hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden backdrop-blur-md"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center">
                    <div className="w-14 h-14 bg-white/5 text-slate-500 rounded-2xl flex items-center justify-center mr-5 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-white line-clamp-1 text-sm">{draft.title}</h4>
                      <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest mt-1.5">{draft.type}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(draft.id); }}
                    className="text-slate-600 hover:text-red-400 p-2.5 transition-colors rounded-xl hover:bg-red-900/20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <div className="flex-grow">
                  <p className="text-xs text-slate-400 line-clamp-4 font-medium italic border-l-2 border-amber-500/20 pl-4">
                    {draft.content.substring(0, 150)}...
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                  Last Modified: {new Date(draft.lastModified).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
