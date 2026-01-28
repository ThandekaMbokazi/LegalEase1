
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AnalysisResult } from '../types';

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

interface TranscriptionLine {
  role: 'user' | 'model';
  text: string;
}

interface LiveAssistantProps {
  documentContext: string;
  onTranscriptionChange?: (text: string) => void;
  targetLanguage: string;
}

export const LiveAssistant: React.FC<LiveAssistantProps> = ({ 
  documentContext,
  onTranscriptionChange,
  targetLanguage
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptions, setTranscriptions] = useState<TranscriptionLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptions, currentInput, currentOutput]);

  const startSession = async () => {
    if (!process.env.API_KEY) return;

    setIsConnecting(true);
    setTranscriptions([]);
    setCurrentInput('');
    setCurrentOutput('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }

      await outputAudioContextRef.current.resume();
      await audioContextRef.current.resume();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let legalPrompt = `You are LegalEase Voice Assistant. 
      CRITICAL: You must answer ONLY based on the provided document. 
      If a question is outside the scope of this document, politely explain you are restricted to this specific legal context.
      Answer in ${targetLanguage}.
      
      DOCUMENT CONTEXT:
      ${documentContext.substring(0, 10000)}`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1);
              const source = outputAudioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current!.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setCurrentInput(prev => {
                const updated = prev + text;
                if (onTranscriptionChange) onTranscriptionChange(updated);
                return updated;
              });
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setCurrentOutput(prev => {
                const updated = prev + text;
                if (onTranscriptionChange) onTranscriptionChange(updated);
                return updated;
              });
            }

            if (message.serverContent?.turnComplete) {
              setTranscriptions(prev => [...prev, { role: 'user', text: currentInput }, { role: 'model', text: currentOutput }]);
              setCurrentInput('');
              setCurrentOutput('');
              if (onTranscriptionChange) onTranscriptionChange('');
            }

            if (message.serverContent?.interrupted) {
              for (const s of sourcesRef.current.values()) {
                try { s.stop(); } catch(e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error(e);
            setIsActive(false);
            setIsConnecting(false);
          },
          onclose: () => stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: legalPrompt
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsActive(false);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (sessionRef.current) try { sessionRef.current.close(); } catch(e) {}
    setIsActive(false);
    setIsConnecting(false);
    if (onTranscriptionChange) onTranscriptionChange('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-white overflow-hidden relative">
      <div className="p-4 border-b border-white/5 flex items-center justify-between z-10 bg-slate-900/80 backdrop-blur-md">
        <h3 className="font-bold text-xs uppercase tracking-widest text-slate-300">Contextual Legal Voice</h3>
        {isActive && <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black animate-pulse">LIVE</span>}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {!isActive && !isConnecting && transcriptions.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
            <svg className="w-16 h-16 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v10a3 3 0 01-6 0V7a3 3 0 013-3z" />
            </svg>
            <p className="text-sm font-black uppercase tracking-widest">Consulting Voice Hub Ready</p>
          </div>
        )}
        
        {transcriptions.map((t, i) => (
          <div key={i} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
            <span className="text-[9px] uppercase text-slate-500 mb-1 font-bold">{t.role === 'user' ? 'You' : 'LegalEase Specialist'}</span>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-lg ${t.role === 'user' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-white/5 text-slate-200 border border-white/5'}`}>
              {t.text}
            </div>
          </div>
        ))}
        {currentInput && (
           <div className="flex flex-col items-end opacity-50 italic text-xs text-amber-500">
             Listening...
             <div className="bg-amber-500/5 px-3 py-2 rounded-xl border border-amber-500/10 mt-1">{currentInput}</div>
           </div>
        )}
        {currentOutput && (
           <div className="flex flex-col items-start opacity-50 italic text-xs text-slate-400">
             Synthesizing...
             <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/10 mt-1">{currentOutput}</div>
           </div>
        )}
        <div ref={transcriptionsEndRef} />
      </div>

      <div className="p-8 sm:p-12 bg-slate-950 border-t border-white/5 flex flex-col items-center space-y-8 z-10">
        <div className="relative">
          <button 
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative border-4 ${isActive ? 'bg-amber-500 border-amber-300 scale-110' : 'bg-slate-800 border-white/10 hover:border-amber-500/50 hover:bg-slate-700'}`}
          >
            {isConnecting ? (
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            ) : isActive ? (
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`w-1.5 bg-slate-950 rounded-full transition-all duration-150 ${isSpeaking ? 'h-10' : 'h-4'}`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                ))}
              </div>
            ) : (
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v10a3 3 0 01-6 0V7a3 3 0 013-3z" /></svg>
            )}
          </button>
          {isActive && <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping -z-10"></div>}
        </div>
        
        <div className="text-center w-full max-w-xs space-y-6">
          <div>
            <p className="text-base font-bold text-white serif tracking-tight">{isActive ? "Locked to Document Scope" : "Consult Legal Assistant"}</p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">Any official SA dialect supported</p>
          </div>

          {isActive && (
            <button 
              onClick={stopSession}
              className="w-full bg-red-500 hover:bg-red-400 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(239,68,68,0.3)] transition-all active:scale-95"
            >
              End Conversation
            </button>
          )}

          {!isActive && !isConnecting && (
            <button 
              onClick={startSession}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(245,158,11,0.3)] transition-all active:scale-95"
            >
              Start Consultation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
