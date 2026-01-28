
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, AnalysisResult } from '../types';
import { GeminiService } from '../services/geminiService';

interface ChatInterfaceProps {
  documentContext: string;
  targetLanguage: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ documentContext, targetLanguage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hi! I've analyzed your document. Ask me anything about its clauses, risks, or specific details.", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gemini = useRef(new GeminiService());

  const contextData = useMemo(() => {
    try {
      return JSON.parse(documentContext) as AnalysisResult;
    } catch (e) {
      return null;
    }
  }, [documentContext]);

  const suggestedQuestions = useMemo(() => {
    if (!contextData) return [
      "What are the main risks?",
      "List all deadlines",
      "What are my obligations?",
      "Who are the key parties?"
    ];

    const questions = [
      "What are the most critical risks?",
      `Explain summary detail`,
      "What are my obligations?",
      "List deadlines",
      "Key parties & roles",
    ];
    return questions;
  }, [contextData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    if (!textOverride) setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await gemini.current.askQuestion(textToSend, documentContext, history, targetLanguage);
      setMessages(prev => [...prev, { role: 'model', content: response, timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "I encountered an error processing that request. Please try again.", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
        <h3 className="font-bold text-white text-xs sm:text-sm tracking-tight">LegalEase Assistant ({targetLanguage})</h3>
        <span className="text-[8px] sm:text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-emerald-500/20">Active</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar bg-slate-900">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl sm:rounded-[1.25rem] px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm leading-relaxed shadow-lg ${
              msg.role === 'user' 
                ? 'bg-amber-500 text-slate-950 font-semibold' 
                : 'bg-white/5 text-slate-200 border border-white/10'
            }`}>
              {msg.content}
              <div className={`text-[8px] sm:text-[9px] mt-2 opacity-60 font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-slate-900/60 text-right' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-amber-500/50 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-amber-500/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-amber-500/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 border-t border-white/5 space-y-4 bg-slate-950/80 backdrop-blur-md flex-shrink-0">
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isTyping}
              className="whitespace-nowrap text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 px-4 py-2 rounded-xl hover:border-amber-500/50 hover:text-amber-500 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        
        <div className="relative group flex items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Ask in ${targetLanguage}...`}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 pr-14 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none min-h-[50px] sm:min-h-[80px] shadow-inner placeholder:text-slate-600 custom-scrollbar"
            rows={1}
          />
          <button 
            onClick={() => handleSend()}
            disabled={isTyping || !input.trim()}
            className="absolute right-3 bottom-3 bg-amber-500 text-slate-950 p-2 sm:p-2.5 rounded-xl hover:bg-amber-400 transition-all shadow-xl disabled:opacity-50 active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};