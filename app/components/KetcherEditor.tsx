'use client';

import { useEffect, useRef, useState } from 'react';
import 'ketcher-react/dist/index.css';

interface KetcherEditorProps {
  onInit?: (ketcher: any) => void;
}

export default function KetcherEditor({ onInit }: KetcherEditorProps) {
  const [Editor, setEditor] = useState<any>(null);
  const [structureServiceProvider, setStructureServiceProvider] = useState<any>(null);
  const ketcherRef = useRef<any>(null);
  const loggerRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      // Dynamically import Editor, standalone provider, and core
      Promise.all([
        import('ketcher-react'),
        import('ketcher-standalone'),
        import('ketcher-core')
      ]).then(([ketcherReact, standalone, ketcherCore]: [any, any, any]) => {
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
            const originalDescriptor = Object.getOwnPropertyDescriptor(Logger, 'get');
            Object.defineProperty(Logger, 'get', {
              get() {
                return ketcherInstance;
              },
              configurable: true
            });
            
            // Also patch the log, error, warn, info methods to not throw
            const patchMethod = (methodName: string) => {
              const original = Logger[methodName];
              if (typeof original === 'function') {
                Logger[methodName] = function(...args: any[]) {
                  try {
                    // Check if we have a valid ketcher instance before calling
                    if (ketcherInstance && ketcherInstance._id) {
                      return original.apply(this, args);
                    }
                    // Silently skip logging if no valid instance
                    return undefined;
                  } catch (e) {
                    // Silently ignore errors
                    return undefined;
                  }
                };
              }
            };
            
            ['log', 'error', 'warn', 'info', 'debug'].forEach(patchMethod);
            
            // Store the setter function for later updates
            (window as any).__updateKetcherInstance = (newInstance: any) => {
              ketcherInstance = newInstance;
            };
            
            console.log('KetcherLogger patched successfully');
          }
        } catch (e) {
          console.error('Could not patch KetcherLogger:', e);
        }
        
        setEditor(() => ketcherReact.Editor);
        const provider = new standalone.StandaloneStructServiceProvider();
        setStructureServiceProvider(provider);
      }).catch((error) => {
        console.error('Failed to load Ketcher:', error);
      });
    }
  }, []);

  const handleOnInit = (ketcher: any) => {
    ketcherRef.current = ketcher;
    
    // Update the KetcherLogger with the real ketcher instance
    if (ketcher && (window as any).__updateKetcherInstance) {
      try {
        (window as any).__updateKetcherInstance(ketcher);
        console.log('Ketcher logger updated with real instance');
      } catch (err) {
        console.warn('Could not update KetcherLogger:', err);
      }
    }
    
    if (onInit) {
      onInit(ketcher);
    }
    
    console.log('Ketcher initialized:', ketcher);
  };

  if (!Editor || !structureServiceProvider) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading Ketcher Editor...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
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
