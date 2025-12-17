"use client";

import { SourceAndReferences, Suggestions } from "@/app/components/chat";
import { motion } from "framer-motion";
import { Bot, Check, Copy, User } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "../../lib/utils";
import { Message } from "../../types/chat";
interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
  onRelatedQuestionClick?: (question: string) => void;
}

export default function ChatMessage({
  message,
  onRelatedQuestionClick,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const hasMetadata =
    message.metadata &&
    ((message.metadata.relatedQuestions &&
      message.metadata.relatedQuestions.length > 0) ||
      (message.metadata.references && message.metadata.references.length > 0));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "flex gap-3 py-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-blue-600"
            : "bg-gradient-to-br from-purple-500 to-blue-500"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col max-w-[80%] md:max-w-[70%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-3",
            isUser
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md"
          )}
        >
          {/* Molecule Badge */}
          {message.moleculeData?.smiles && (
            <div
              className={cn(
                "text-xs font-mono mb-2 px-2 py-1 rounded-md",
                isUser
                  ? "bg-blue-700/50 text-blue-100"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              )}
            >
              🧪{" "}
              {message.moleculeData.smiles.length > 40
                ? message.moleculeData.smiles.substring(0, 40) + "..."
                : message.moleculeData.smiles}
            </div>
          )}

          {/* Message Text */}
          <div
            className="text-sm md:text-base prose prose-sm dark:prose-invert 
          max-w-none [&>*:first-child]:mt-0"
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-3 space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-3 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="ml-2">{children}</li>,
                code: ({ children }) => (
                  <code
                    className={cn(
                      "px-1.5 py-0.5 rounded text-sm font-mono",
                      isUser ? "bg-blue-700/50" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    {children}
                  </code>
                ),
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">
                    {children}
                  </h3>
                ),
                br: () => <br />,
              }}
            >
              {message.content.replace(/\n/g, "  \n")}
            </ReactMarkdown>
            {message.isStreaming && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block ml-1 w-2 h-4 bg-current"
              />
            )}
          </div>

          {/* Copy Button (for assistant messages) */}
          {!isUser && !message.isStreaming && message.content && (
            <button
              onClick={handleCopy}
              className="absolute -bottom-6 right-0 p-1 text-gray-400 
              hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={cn(
            "text-xs text-gray-400 dark:text-gray-500 mt-1 px-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatTime(message.timestamp)}
        </span>

        {/* Related Questions */}
        {!isUser && !message.isStreaming && hasMetadata && (
          <Suggestions
            message={message}
            onRelatedQuestionClick={onRelatedQuestionClick}
          />
        )}

        {/* References */}
        {!isUser && !message.isStreaming && hasMetadata && (
          <SourceAndReferences message={message} />
        )}
      </div>
    </motion.div>
  );
}
