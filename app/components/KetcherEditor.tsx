'use client';

import { useEffect, useRef, useState } from 'react';
import 'ketcher-react/dist/index.css';

interface KetcherInstance {
  getSmiles: () => Promise<string>;
  getMolfile: () => Promise<string>;
  getInchi: () => Promise<string>;
  setMolecule: (molecule: string) => Promise<void>;
  [key: string]: unknown;
}

interface KetcherEditorProps {
  onInit?: (ketcher: KetcherInstance) => void;
}

export default function KetcherEditor({ onInit }: KetcherEditorProps) {
  const [Editor, setEditor] = useState<React.ComponentType | null>(null);
  const [structureServiceProvider, setStructureServiceProvider] = useState<unknown>(null);
  const ketcherRef = useRef<KetcherInstance | null>(null);
  const loggerRef = useRef<unknown>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      // Dynamically import Editor, standalone provider, and core
      Promise.all([
        import('ketcher-react'),
        import('ketcher-standalone'),
        import('ketcher-core')
      ]).then(([ketcherReact, standalone, ketcherCore]) => {
        // Store the logger reference for synchronous access later
        loggerRef.current = ketcherCore.KetcherLogger;
        
        // Initialize a more complete mock ketcher instance for the logger
        const mockKetcher = {
          _id: 'temp',
          formState: { 
            logSettings: { 
              logLevel: 'error' 
            } 
          },
          editor: {
            undo: () => console.log('Mock undo called'),
            redo: () => console.log('Mock redo called')
          }
        };
        
        // Patch the KetcherLogger to prevent errors
        try {
          if (ketcherCore.KetcherLogger) {
            const Logger = ketcherCore.KetcherLogger;
            
            // Store the ketcher instance in a closure variable
            let ketcherInstance = mockKetcher;
            
            // Override the static getter
            Object.defineProperty(Logger, 'get', {
              get() {
                return ketcherInstance;
              },
              configurable: true
            });
            
            // Also patch the log, error, warn, info methods to not throw
            const patchMethod = (methodName: string) => {
              const original = Logger[methodName as keyof typeof Logger];
              if (typeof original === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (Logger as any)[methodName] = function(...args: unknown[]) {
                  try {
                    // Check if we have a valid ketcher instance before calling
                    if (ketcherInstance && ketcherInstance._id) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      return (original as any).apply(this, args);
                    }
                    // Silently skip logging if no valid instance
                    return undefined;
                  } catch {
                    // Silently ignore errors
                    return undefined;
                  }
                };
              }
            };
            
            ['log', 'error', 'warn', 'info', 'debug'].forEach(patchMethod);
            
            // Store the setter function for later updates
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__updateKetcherInstance = (newInstance: any) => {
              ketcherInstance = newInstance;
            };
          }
        } catch {
          // Silently handle logger patching errors in production
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setEditor(() => ketcherReact.Editor as any);
        const provider = new standalone.StandaloneStructServiceProvider();
        setStructureServiceProvider(provider);
      }).catch((error) => {
        console.error('Failed to load Ketcher:', error);
      });
    }
  }, []);

  const handleOnInit = (ketcher: KetcherInstance) => {
    ketcherRef.current = ketcher;
    
    // Update the KetcherLogger with the real ketcher instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (ketcher && win.__updateKetcherInstance) {
      try {
        win.__updateKetcherInstance(ketcher);
      } catch {
        // Silently handle logger update errors
      }
    }
    
    if (onInit) {
      onInit(ketcher);
    }
  };

  if (!Editor || !structureServiceProvider) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading Ketcher Editor...</div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EditorComponent = Editor as any;

  return (
    <div className="h-full w-full">
      <EditorComponent
        staticResourcesUrl=""
        structServiceProvider={structureServiceProvider}
        onInit={handleOnInit}
        errorHandler={(error: string) => {
          console.error('Ketcher error:', error);
        }}
        appContext={{
          logger: {
            log: (message: string) => console.log(message),
            error: (message: string) => console.error(message),
            warn: (message: string) => console.warn(message),
            info: (message: string) => console.info(message)
          }
        }}
      />
    </div>
  );
}
