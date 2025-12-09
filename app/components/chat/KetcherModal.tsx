"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "../../lib/utils";

const KetcherEditor = dynamic(() => import("../KetcherEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  ),
});

interface KetcherInstance {
  getSmiles: () => Promise<string>;
  getMolfile: () => Promise<string>;
  getInchi: () => Promise<string>;
  setMolecule: (molecule: string) => Promise<void>;
}

interface KetcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (moleculeData: { smiles: string; molfile?: string }) => void;
  initialSmiles?: string;
}

export default function KetcherModal({
  isOpen,
  onClose,
  onConfirm,
  initialSmiles,
}: KetcherModalProps) {
  const ketcherRef = useRef<KetcherInstance | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleKetcherInit = async (ketcher: KetcherInstance) => {
    ketcherRef.current = ketcher;
    setIsLoaded(true);

    // Load initial molecule if provided
    if (initialSmiles) {
      try {
        await ketcher.setMolecule(initialSmiles);
      } catch (error) {
        console.error("Failed to load initial molecule:", error);
      }
    }
  };

  const handleConfirm = async () => {
    if (!ketcherRef.current) return;

    setIsExporting(true);
    try {
      const smiles = await ketcherRef.current.getSmiles();
      if (!smiles || smiles.trim() === "") {
        // No molecule drawn
        setIsExporting(false);
        return;
      }

      const molfile = await ketcherRef.current.getMolfile();
      onConfirm({ smiles, molfile });
      onClose();
    } catch (error) {
      console.error("Failed to export molecule:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex flex-col 
            bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b 
            border-gray-200 dark:border-gray-700"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Draw Molecule
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Use the editor to draw or import a molecular structure
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 
                dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Ketcher Editor */}
            <div className="flex-1 overflow-hidden">
              <KetcherEditor onInit={handleKetcherInit} />
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-3 px-6 py-4 border-t 
            border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isLoaded || isExporting}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium",
                  isLoaded && !isExporting
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                )}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Use Molecule
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
