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

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      // Dynamically import both Editor and standalone provider
      Promise.all([
        import('ketcher-react'),
        import('ketcher-standalone')
      ]).then(([ketcherReact, standalone]: [any, any]) => {
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
    if (onInit) {
      onInit(ketcher);
    }
    
    // Example: Log when ketcher is initialized
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
      />
    </div>
  );
}
