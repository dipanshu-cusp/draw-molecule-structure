export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  moleculeData?: MoleculeData;
  isStreaming?: boolean;
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
}

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullMessage: string) => void;
  onError?: (error: Error) => void;
}
