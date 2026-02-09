export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  moleculeData?: MoleculeData;
  isStreaming?: boolean;
  metadata?: MessageMetadata;
}

export interface Reference {
  title?: string;
  uri?: string;
  content?: string;
  pageNumber?: number;
}

export interface MessageMetadata {
  sessionId?: string;
  relatedQuestions?: string[];
  references?: Reference[];
}

export type MoleculeSearchType = 'exact' | 'substructure';

export interface MoleculeData {
  smiles?: string;
  molfile?: string;
  inchi?: string;
  searchType?: MoleculeSearchType;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
}

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullMessage: string) => void;
  onError?: (error: Error) => void;
}

// ── App Mode ──────────────────────────────────────────────────────────
export type AppMode = "search" | "documents";

// ── Document Browser types ────────────────────────────────────────────
export interface NotebookMetadata {
  id: string;
  title: string;
  gcsPath: string;
  author?: string;
  date?: string;
  description?: string;
  tags?: string[];
}

export interface NotebookFilters {
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ── PDF Viewer types ──────────────────────────────────────────────────
export interface PDFViewerState {
  isOpen: boolean;
  url: string;
  title: string;
  pageNumber?: number;
  notebook?: NotebookMetadata;
}

// ── Recent Documents ──────────────────────────────────────────────────
export interface RecentDocument {
  id: string;
  title: string;
  gcsPath: string;
  author?: string;
  date?: string;
  openedAt: string; // ISO timestamp of when user last opened it
}
