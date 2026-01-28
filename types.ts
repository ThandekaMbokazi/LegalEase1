
export interface AnalysisResult {
  summary: string;
  risks: string[];
  deadlines: Array<{ date: string; description: string }>;
  keyParties: string[];
  obligations: string[];
  simplifiedExplanation: string;
  fullText: string;
  visualAidUrl?: string;
  verificationSources?: Array<{ web: { uri: string; title: string } }>;
  suggestedTags?: string[];
  isValidDomain: boolean;
  domainError?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface DocumentData {
  id: string;
  name: string;
  type: string;
  base64?: string;
  text?: string;
  analysis?: AnalysisResult;
  timestamp: number;
  tags: string[];
}

export interface DraftData {
  id: string;
  title: string;
  type: 'NDA' | 'Contract' | 'Prenup' | 'Lease' | 'General';
  content: string;
  lastModified: number;
}

export enum AnalysisStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  ANALYZING = 'analyzing',
  GENERATING_VISUAL = 'generating_visual',
  VERIFYING = 'verifying',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  subtitlesEnabled: boolean;
  preferredLanguage: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  securityQuestion: string;
  securityAnswerHash: string;
}
