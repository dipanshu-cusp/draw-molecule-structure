"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Message, MessageMetadata } from "../../types/chat";
import ChatMessage from "./ChatMessage";
import { cn } from "../../lib/utils";

interface ChatContainerProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
  onRelatedQuestionClick?: (question: string) => void;
  onShowSources?: (references: MessageMetadata["references"]) => void;
  onViewPDF?: (url: string, title: string, pageNumber?: number) => void;
}

export default function ChatContainer({
  messages,
  isLoading,
  className,
  onRelatedQuestionClick,
  onShowSources,
  onViewPDF,
}: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={containerRef}
      className={cn("flex-1 overflow-y-auto px-4 md:px-6 lg:px-8", className)}
    >
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLatest={index === messages.length - 1}
            onRelatedQuestionClick={onRelatedQuestionClick}
            onShowSources={onShowSources}
            onViewPDF={onViewPDF}
          />
        ))}

        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && !messages.some((m) => m.isStreaming) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex gap-3 py-4"
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br 
              from-purple-500 to-blue-500 flex items-center justify-center"
              >
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="flex items-center">
                <motion.div
                  className="flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
                      animate={{
                        y: [0, -6, 0],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
