'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Pencil, Send, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchBarProps {
  onSubmit: (query: string, moleculeData?: { smiles?: string }) => void;
  onDrawMolecule: () => void;
  isCompact?: boolean;
  moleculeData?: { smiles?: string };
  onClearMolecule?: () => void;
  disabled?: boolean;
}

export default function SearchBar({
  onSubmit,
  onDrawMolecule,
  isCompact = false,
  moleculeData,
  onClearMolecule,
  disabled = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isCompact && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCompact]);

  const handleSubmit = () => {
    if (query.trim() || moleculeData?.smiles) {
      onSubmit(query.trim(), moleculeData);
      setQuery('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasContent = query.trim().length > 0 || moleculeData?.smiles;

  return (
    <motion.div
      layout
      className={cn(
        'w-full transition-all duration-300',
        isCompact ? 'max-w-3xl' : 'max-w-2xl'
      )}
    >
      <motion.div
        layout
        className={cn(
          'relative flex flex-col rounded-2xl border bg-white dark:bg-gray-900 shadow-lg transition-all duration-200',
          isFocused
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-200 dark:border-gray-700',
          isCompact ? 'shadow-md' : 'shadow-xl'
        )}
      >
        {/* Molecule Preview Badge */}
        <AnimatePresence>
          {moleculeData?.smiles && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pt-3"
            >
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-blue-700 dark:text-blue-300 font-medium truncate flex-1">
                  Molecule: {moleculeData.smiles.length > 30 
                    ? moleculeData.smiles.substring(0, 30) + '...' 
                    : moleculeData.smiles}
                </span>
                <button
                  onClick={onClearMolecule}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="flex items-end gap-2 p-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={disabled}
              placeholder={
                moleculeData?.smiles
                  ? 'Ask about this molecule...'
                  : 'Search for molecules or ask a question...'
              }
              rows={isCompact ? 1 : 2}
              className={cn(
                'w-full resize-none bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'text-gray-900 dark:text-white',
                isCompact ? 'text-base py-1' : 'text-lg py-2',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pb-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDrawMolecule}
              disabled={disabled}
              className={cn(
                'p-2.5 rounded-xl transition-colors',
                'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
                'text-gray-600 dark:text-gray-400',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title="Draw Molecule"
            >
              <Pencil className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!hasContent || disabled}
              className={cn(
                'p-2.5 rounded-xl transition-all',
                hasContent && !disabled
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              )}
            >
              {hasContent ? (
                <Send className="w-5 h-5" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Helper Text */}
      {!isCompact && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4"
        >
          Enter a query or{' '}
          <button
            onClick={onDrawMolecule}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            draw a molecule
          </button>{' '}
          to search
        </motion.p>
      )}
    </motion.div>
  );
}
