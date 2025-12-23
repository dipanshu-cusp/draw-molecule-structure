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
  }>;
}

export interface MoleculeData {
  smiles?: string;
  molfile?: string;
  inchi?: string;
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

// Session types for chat history
export interface SessionTurn {
  query?: {
    text?: string;
    queryId?: string;
  };
  answer?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  displayName?: string;
  userPseudoId?: string;
  startTime?: string;
  endTime?: string;
  isPinned?: boolean;
  turns?: SessionTurn[];
}

export interface ListSessionsResponse {
  sessions: ChatSession[];
  nextPageToken?: string;
}
