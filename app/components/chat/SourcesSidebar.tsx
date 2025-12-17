"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, FileText } from "lucide-react";

interface Reference {
  title?: string;
  uri?: string;
  content?: string;
}

interface SourcesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  references: Reference[];
}

export default function SourcesSidebar({
  isOpen,
  onClose,
  references,
}: SourcesSidebarProps) {
  const getSourceUrl = (uri: string) => {
    if (uri.startsWith("gs://")) {
      return `https://storage.cloud.google.com/${uri.slice(5)}`;
    }
    return uri;
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 
              shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Sources & References
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                  transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sources List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {references.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No sources available
                </div>
              ) : (
                references.map((ref, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 
                      border border-gray-200 dark:border-gray-700 hover:border-blue-300 
                      dark:hover:border-blue-600 transition-colors"
                  >
                    {/* Annotation Number Badge */}
                    <div className="flex items-start gap-3">
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white 
                          text-sm font-bold flex items-center justify-center"
                      >
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1 truncate">
                          {ref.title || "Source Document"}
                        </h3>

                        {/* Content Preview */}
                        {ref.content && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-2">
                            {ref.content.substring(0, 300)}
                            {ref.content.length > 300 && "..."}
                          </p>
                        )}

                        {/* Link */}
                        {ref.uri && (
                          <a
                            href={getSourceUrl(ref.uri)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-blue-500 
                              hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 
                              font-medium transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open source
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Click on a source number in the message to find the corresponding reference
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
