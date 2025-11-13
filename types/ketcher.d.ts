declare module 'ketcher-standalone' {
  export class StandaloneStructServiceProvider {
    constructor();
  }
}

declare module 'ketcher-react' {
  export interface EditorProps {
    staticResourcesUrl?: string;
    structServiceProvider: any;
    onInit?: (ketcher: any) => void;
    errorHandler?: (error: string) => void;
    buttons?: Record<string, { hidden?: boolean }>;
    disableMacromoleculesEditor?: boolean;
  }

  export const Editor: React.ComponentType<EditorProps>;
}
