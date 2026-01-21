"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, RotateCcw } from "lucide-react";
import SearchBar from "./components/chat/SearchBar";
import ChatContainer from "./components/chat/ChatContainer";
import KetcherModal from "./components/chat/KetcherModal";
import SourcesSidebar from "./components/chat/SourcesSidebar";
import { useChat } from "./hooks/useChat";
import { Message, MoleculeSearchType } from "./types/chat";

type Reference = NonNullable<Message["metadata"]>["references"];

export default function Home() {
  const [isKetcherOpen, setIsKetcherOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarReferences, setSidebarReferences] = useState<Reference>([]);
  const [moleculeData, setMoleculeData] = useState<
    { smiles?: string; searchType?: MoleculeSearchType } | undefined
  >();
  const [searchType, setSearchType] = useState<MoleculeSearchType>('exact');

  const { messages, isLoading, sendMessage, clearMessages } = useChat({
    apiEndpoint: "/api/chat",
    onError: (error) => console.error("Chat error:", error),
  });

  const hasConversation = messages.length > 0;

  const handleSubmit = useCallback(
    (query: string, molecule?: { smiles?: string; searchType?: MoleculeSearchType }) => {
      sendMessage({
        content: query,
        moleculeData: molecule ? { ...molecule, searchType: molecule.searchType || searchType } : undefined,
      });
    },
    [sendMessage, searchType]
  );

  const handleMoleculeConfirm = useCallback(
    (data: { smiles: string; molfile?: string }) => {
      setMoleculeData({ smiles: data.smiles, searchType });
    },
    [searchType]
  );

  const handleClearMolecule = useCallback(() => {
    setMoleculeData(undefined);
  }, []);

  const handleSearchTypeChange = useCallback((type: MoleculeSearchType) => {
    setSearchType(type);
    if (moleculeData) {
      setMoleculeData({ ...moleculeData, searchType: type });
    }
  }, [moleculeData]);

  const handleNewChat = useCallback(() => {
    clearMessages();
    setMoleculeData(undefined);
    setSearchType('exact');
  }, [clearMessages]);

  const handleRelatedQuestionClick = useCallback(
    (question: string) => {
      sendMessage({
        content: question,
      });
    },
    [sendMessage]
  );

  const handleShowSources = useCallback((references: Reference) => {
    setSidebarReferences(references || []);
    setIsSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <div
      className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 
    to-gray-100 dark:from-gray-950 dark:to-gray-900"
    >
      {/* Header - only shows in chat mode */}
      <AnimatePresence>
        {hasConversation && (
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 
            bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-4 md:px-6 py-3"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 
                to-purple-600 flex items-center justify-center"
                >
                  <FlaskConical className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Molecule Search
                </span>
              </div>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 
                hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 
                rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                New Chat
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {!hasConversation ? (
            /* Welcome/Search Screen */
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center px-4 py-8"
            >
              {/* Logo and Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 
                  via-purple-500 to-pink-500 flex items-center justify-center 
                  shadow-lg shadow-purple-500/30"
                >
                  <FlaskConical className="w-10 h-10 text-white" />
                </motion.div>
                <h1
                  className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 
                via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white 
                bg-clip-text text-transparent mb-3"
                >
                  Molecule Search
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Search for reactions, draw structures, or ask questions about synthesis!
                </p>
              </motion.div>

              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full flex justify-center"
              >
                <SearchBar
                  onSubmit={handleSubmit}
                  onDrawMolecule={() => setIsKetcherOpen(true)}
                  moleculeData={moleculeData}
                  onClearMolecule={handleClearMolecule}
                  disabled={isLoading}
                  searchType={searchType}
                  onSearchTypeChange={handleSearchTypeChange}
                />
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 flex flex-wrap justify-center gap-3"
              >
                {[
                  { text: "What is aspirin?", icon: "💊" },
                  {
                    text: "Draw a molecule",
                    icon: "🎨",
                    action: () => setIsKetcherOpen(true),
                  },
                  { text: "Find similar compounds", icon: "🔬" },
                ].map((item) => (
                  <motion.button
                    key={item.text}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else {
                        handleSubmit(item.text);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 
                    border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 
                    dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 
                    shadow-sm transition-all"
                  >
                    <span>{item.icon}</span>
                    <span className="text-sm">{item.text}</span>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            /* Chat Screen */
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Messages */}
              <ChatContainer 
                messages={messages} 
                isLoading={isLoading} 
                onRelatedQuestionClick={handleRelatedQuestionClick}
                onShowSources={handleShowSources}
              />

              {/* Input Area */}
              <div
                className="sticky bottom-0 border-t border-gray-200 dark:border-gray-800 
              bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4"
              >
                <div className="max-w-3xl mx-auto">
                  <SearchBar
                    onSubmit={handleSubmit}
                    onDrawMolecule={() => setIsKetcherOpen(true)}
                    isCompact
                    moleculeData={moleculeData}
                    onClearMolecule={handleClearMolecule}
                    disabled={isLoading}
                    searchType={searchType}
                    onSearchTypeChange={handleSearchTypeChange}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Ketcher Modal */}
      <KetcherModal
        isOpen={isKetcherOpen}
        onClose={() => setIsKetcherOpen(false)}
        onConfirm={handleMoleculeConfirm}
        initialSmiles={moleculeData?.smiles}
      />

      {/* Sources Sidebar */}
      <SourcesSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        references={sidebarReferences || []}
      />
    </div>
  );
}
