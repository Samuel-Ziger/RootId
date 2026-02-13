
export interface CandidateData {
  name: string;
  role: string;
  referenceUrls: string[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AnalysisResult {
  report: string;
  sources: GroundingSource[];
  timestamp: string;
}

export interface AppState {
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
  step: 'idle' | 'searching' | 'analyzing' | 'done';
  cooldownSeconds: number; // Novo campo para o cronômetro
}
