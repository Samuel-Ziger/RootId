/**
 * Formato mínimo (RootID standalone - formulário manual)
 */
export interface CandidateData {
  name: string;
  role: string;
  referenceUrls: string[];
  /** CPF (opcional). Se informado, será usado na análise e em buscas no Datajud. */
  cpf?: string;
}

/**
 * Formato enriquecido recebido do Ache Um Veterano.
 * Todos os campos são opcionais exceto name e role (podem vir do mínimo ou do candidato).
 * Quanto mais dados disponíveis, mais precisa a análise OSINT.
 */
export interface AcheUmVeteranoCandidato {
  id?: string;
  userId?: string;
  nome?: string;
  firstname?: string;
  lastname?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  city?: string;
  state?: string;
  bio?: string;
  about?: string;
  score?: number;
  area_interesse?: string | object | object[];
  nivel_senioridade?: string;
  curriculum?: object;
  educacao?: Array<{
    degree?: string;
    field?: string;
    institution?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    field?: string;
    institution?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
  experiencia?: Array<{
    role?: string;
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
  experiences?: Array<{
    role?: string;
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
  habilidades?: string[] | Array<{ nome?: string }>;
  hardSkills?: string[] | Array<{ nome?: string }>;
  soft_skills?: string[] | Array<{ nome?: string }>;
  softSkills?: string[] | Array<{ nome?: string }>;
  experiencia_militar?: Array<{
    postoGraduacao?: string;
    unidade?: string;
    especialidade?: string;
    [key: string]: unknown;
  }>;
  targetArea?: Array<{
    area?: string;
    cargo?: string;
    interesse?: string;
    [key: string]: unknown;
  }>;
  redes_sociais?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    email?: string;
    whats?: string;
    [key: string]: unknown;
  };
  socials?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    email?: string;
    whats?: string;
    [key: string]: unknown;
  };
  linkedin?: string;
  portfolio?: string;
  /** Projetos (ex.: do LinkedIn) */
  projects?: Array<{ title?: string; description?: string; url?: string; [key: string]: unknown }>;
  /** Destaques do perfil (LinkedIn highlights) */
  destaques?: string[] | Array<{ title?: string; description?: string; [key: string]: unknown }>;
  /** Idiomas (ex.: do LinkedIn) */
  idiomas?: Array<{ name?: string; level?: string; [key: string]: unknown }> | string[];
  /** Recomendações recebidas (ex.: LinkedIn) — se disponível, incluir no relatório */
  recomendacoes?: Array<{ author?: string; text?: string; role?: string; [key: string]: unknown }>;
  /** Outros links do perfil (website, blog, etc.) */
  links_perfil?: string[] | Record<string, string>;
  /** Dados de testes (uso interno/discreto) */
  bigFiveResults?: unknown[];
  logicResults?: object;
  interpretationResults?: object;
}

/** Provedor de IA para análise OSINT */
export type AIProvider = "gemini" | "chatgpt";

/**
 * CandidateData aceita tanto o formato mínimo quanto enriquecido.
 * Se `candidato` estiver presente, os campos name/role/referenceUrls
 * podem ser derivados dele (via candidateMapper).
 */
export type CandidateDataInput = CandidateData & {
  candidato?: AcheUmVeteranoCandidato;
  /** Modelo de IA: Gemini ou ChatGPT. Padrão: gemini (ou env NEXT_PUBLIC_ROOTID_AI_PROVIDER) */
  aiProvider?: AIProvider;
};

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AnalysisResult {
  report: string;
  sources: GroundingSource[];
  timestamp: string;
  /** Qual IA gerou o relatório (Gemini ou ChatGPT) */
  aiProviderUsed?: AIProvider;
}

export interface AppState {
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
  step: 'idle' | 'searching' | 'analyzing' | 'done';
  cooldownSeconds: number; // Novo campo para o cronômetro
}
