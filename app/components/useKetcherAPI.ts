/**
 * Advanced Ketcher Usage Examples
 * 
 * This file contains examples of how to use various Ketcher API features
 * in your Next.js application.
 */

import { useRef } from 'react';

export function useKetcherAPI() {
  const ketcherRef = useRef<any>(null);

  // Initialize Ketcher reference
  const initKetcher = (ketcher: any) => {
    ketcherRef.current = ketcher;
  };

  // Get structure in various formats
  const exportStructure = async (format: string) => {
    if (!ketcherRef.current) return null;

    try {
      switch (format) {
        case 'smiles':
          return await ketcherRef.current.getSmiles();
        case 'smiles-extended':
          return await ketcherRef.current.getSmiles(true);
        case 'molfile':
          return await ketcherRef.current.getMolfile();
        case 'molfile-v3000':
          return await ketcherRef.current.getMolfile('v3000');
        case 'rxn':
          return await ketcherRef.current.getRxn();
        case 'ket':
          return await ketcherRef.current.getKet();
        case 'smarts':
          return await ketcherRef.current.getSmarts();
        case 'cml':
          return await ketcherRef.current.getCml();
        case 'sdf':
          return await ketcherRef.current.getSdf();
        case 'inchi':
          return await ketcherRef.current.getInchi();
        case 'inchi-key':
          return await ketcherRef.current.getInchiKey();
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
      return null;
    }
  };

  // Load structure from string
  const loadStructure = async (structure: string, position?: { x: number; y: number }) => {
    if (!ketcherRef.current) return;

    try {
      await ketcherRef.current.setMolecule(structure, position ? { position } : undefined);
    } catch (error) {
      console.error('Error loading structure:', error);
    }
  };

  // Add fragment to existing structure
  const addFragment = async (structure: string, position?: { x: number; y: number }) => {
    if (!ketcherRef.current) return;

    try {
      await ketcherRef.current.addFragment(structure, position ? { position } : undefined);
    } catch (error) {
      console.error('Error adding fragment:', error);
    }
  };

  // Apply layout algorithm
  const applyLayout = async () => {
    if (!ketcherRef.current) return;

    try {
      await ketcherRef.current.layout();
    } catch (error) {
      console.error('Error applying layout:', error);
    }
  };

  // Check if structure contains reaction
  const hasReaction = (): boolean => {
    if (!ketcherRef.current) return false;
    return ketcherRef.current.containsReaction();
  };

  // Check if selected structure has query
  const hasQuery = (): boolean => {
    if (!ketcherRef.current) return false;
    return ketcherRef.current.isQueryStructureSelected();
  };

  // Generate image from structure
  const generateImage = async (
    structure: string,
    options: {
      outputFormat: 'png' | 'svg';
      backgroundColor?: string;
      bondThickness?: number;
    }
  ) => {
    if (!ketcherRef.current) return null;

    try {
      const blob = await ketcherRef.current.generateImage(structure, {
        outputFormat: options.outputFormat,
        backgroundColor: options.backgroundColor || '#FFFFFF',
        bondThickness: options.bondThickness || 2,
      });
      return blob;
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  };

  // Subscribe to change events
  const subscribeToChanges = (callback: (eventData: any) => void) => {
    if (!ketcherRef.current) return null;

    try {
      const subscription = ketcherRef.current.editor.subscribe('change', callback);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to changes:', error);
      return null;
    }
  };

  // Unsubscribe from change events
  const unsubscribeFromChanges = (subscription: any) => {
    if (!ketcherRef.current || !subscription) return;

    try {
      ketcherRef.current.editor.unsubscribe('change', subscription);
    } catch (error) {
      console.error('Error unsubscribing from changes:', error);
    }
  };

  // Update settings
  const updateSettings = (settings: Record<string, any>) => {
    if (!ketcherRef.current) return;

    try {
      ketcherRef.current.setSettings(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  return {
    initKetcher,
    exportStructure,
    loadStructure,
    addFragment,
    applyLayout,
    hasReaction,
    hasQuery,
    generateImage,
    subscribeToChanges,
    unsubscribeFromChanges,
    updateSettings,
  };
}

// Example usage in a component:
/*
function MyComponent() {
  const {
    initKetcher,
    exportStructure,
    loadStructure,
    subscribeToChanges,
    unsubscribeFromChanges,
  } = useKetcherAPI();

  useEffect(() => {
    // Subscribe to changes
    const subscription = subscribeToChanges((eventData) => {
      console.log('Structure changed:', eventData);
    });

    // Cleanup
    return () => {
      if (subscription) {
        unsubscribeFromChanges(subscription);
      }
    };
  }, []);

  const handleExport = async () => {
    const smiles = await exportStructure('smiles');
    console.log('SMILES:', smiles);
  };

  const handleLoad = async () => {
    await loadStructure('CCO'); // Load ethanol
  };

  return (
    <div>
      <KetcherEditor onInit={initKetcher} />
      <button onClick={handleExport}>Export</button>
      <button onClick={handleLoad}>Load Ethanol</button>
    </div>
  );
}
*/

// Common molecule examples
export const EXAMPLE_MOLECULES = {
  benzene: 'c1ccccc1',
  ethanol: 'CCO',
  aspirin: 'CC(=O)Oc1ccccc1C(=O)O',
  caffeine: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
  glucose: 'C([C@@H]1[C@H]([C@@H]([C@H](C(O1)O)O)O)O)O',
  water: 'O',
  methane: 'C',
  acetone: 'CC(=O)C',
  toluene: 'Cc1ccccc1',
  pyridine: 'c1ccncc1',
};
