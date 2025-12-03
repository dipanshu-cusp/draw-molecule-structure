declare module 'ketcher-standalone' {
  export class StandaloneStructServiceProvider {
    constructor();
  }
}

declare module 'ketcher-react' {
  export interface KetcherInstance {
    getSmiles: () => Promise<string>;
    getMolfile: () => Promise<string>;
    getInchi: () => Promise<string>;
    setMolecule: (molecule: string) => Promise<void>;
    [key: string]: unknown;
  }

  export interface EditorProps {
    staticResourcesUrl?: string;
    structServiceProvider: unknown;
    onInit?: (ketcher: KetcherInstance) => void;
    errorHandler?: (error: string) => void;
    buttons?: Record<string, { hidden?: boolean }>;
    disableMacromoleculesEditor?: boolean;
  }

  export const Editor: React.ComponentType<EditorProps>;
}
