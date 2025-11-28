'use client';

import { useRef, useState } from 'react';
import KetcherEditor from './KetcherEditor';

export default function MoleculeEditor() {
  const ketcherRef = useRef<any>(null);
  const [moleculeData, setMoleculeData] = useState<string>('');
  const [format, setFormat] = useState<'smiles' | 'molfile' | 'inchi'>('smiles');

  const handleKetcherInit = (ketcher: any) => {
    ketcherRef.current = ketcher;
    console.log('Ketcher instance:', ketcher);
  };

  const handleGetStructure = async () => {
    if (!ketcherRef.current) return;

    try {
      let structure = '';
      switch (format) {
        case 'smiles':
          structure = await ketcherRef.current.getSmiles();
          break;
        case 'molfile':
          structure = await ketcherRef.current.getMolfile();
          break;
        case 'inchi':
          structure = await ketcherRef.current.getInchi();
          break;
      }
      setMoleculeData(structure);
      console.log(`Structure (${format}):`, structure);
    } catch (error) {
      console.error('Error getting structure:', error);
      setMoleculeData(`Error: ${error}`);
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row gap-4">
      {/* Ketcher Editor */}
      <div className="flex-1 flex flex-col">
        <div className="h-full rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <KetcherEditor onInit={handleKetcherInit} />
        </div>
      </div>

      {/* Controls Panel */}
      <div className="lg:w-80 flex flex-col gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Export Structure
          </h3>
          
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="smiles">SMILES</option>
                <option value="molfile">MOL File</option>
                <option value="inchi">InChI</option>
              </select>
            </div>
            
            <button
              onClick={handleGetStructure}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Get Structure
            </button>
            
            {moleculeData && (
              <div className="mt-2">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Result
                </label>
                <textarea
                  value={moleculeData}
                  readOnly
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(moleculeData);
                  }}
                  className="mt-2 w-full px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
