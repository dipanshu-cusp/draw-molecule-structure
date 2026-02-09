export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  moleculeData?: MoleculeData;
  isStreaming?: boolean;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  sessionId?: string;
  relatedQuestions?: string[];
  references?: Array<{
    title?: string;
    uri?: string;
    content?: string;
    pageNumber?: number;
  }>;
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
