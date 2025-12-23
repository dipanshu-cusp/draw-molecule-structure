"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Trash2,
  Clock,
  Loader2,
  History,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "../../lib/utils";

export interface ChatHistorySession {
  id: string;
  displayName: string;
  startTime?: string;
  turnCount?: number;
  preview?: string;
  isPinned?: boolean;
}

interface ChatHistorySidebarProps {
  sessions: ChatHistorySession[];
  isLoading?: boolean;
  loadingSessionId?: string | null;
  currentSessionId?: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onNewChat?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function ChatHistorySidebar({
  sessions,
  isLoading,
  loadingSessionId,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onLoadMore,
  hasMore,
}: ChatHistorySidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Group sessions by date
  const groupSessionsByDate = (sessions: ChatHistorySession[]) => {
    const groups: { label: string; sessions: ChatHistorySession[] }[] = [];
    const today: ChatHistorySession[] = [];
    const yesterday: ChatHistorySession[] = [];
    const thisWeek: ChatHistorySession[] = [];
    const older: ChatHistorySession[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    sessions.forEach((session) => {
      const sessionDate = session.startTime
        ? new Date(session.startTime)
        : new Date(0);

      if (sessionDate >= todayStart) {
        today.push(session);
      } else if (sessionDate >= yesterdayStart) {
        yesterday.push(session);
      } else if (sessionDate >= weekStart) {
        thisWeek.push(session);
      } else {
        older.push(session);
      }
    });

    if (today.length > 0) groups.push({ label: "Today", sessions: today });
    if (yesterday.length > 0)
      groups.push({ label: "Yesterday", sessions: yesterday });
    if (thisWeek.length > 0)
      groups.push({ label: "This Week", sessions: thisWeek });
    if (older.length > 0) groups.push({ label: "Older", sessions: older });

    return groups;
  };

  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <motion.div
      initial={false}
      animate={{ width: isExpanded ? 280 : 64 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn(
        "hidden md:flex flex-col fixed top-0 left-0 h-screen z-50",
        "bg-gray-50 dark:bg-gray-900",
        "border-r border-gray-200 dark:border-gray-800",
        "overflow-hidden"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-gray-200 dark:border-gray-800 p-3",
        isExpanded ? "justify-between" : "justify-center"
      )}>
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2 overflow-hidden">
              <History className="w-5 h-5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm whitespace-nowrap">
                Chat History
              </h2>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 
                text-gray-500 dark:text-gray-400 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 
              text-gray-500 dark:text-gray-400 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      {onNewChat && (
        <div className={cn("p-2", !isExpanded && "flex justify-center")}>
          <button
            onClick={onNewChat}
            className={cn(
              "flex items-center gap-2 rounded-lg transition-colors",
              "bg-blue-500 hover:bg-blue-600 text-white",
              isExpanded 
                ? "w-full px-3 py-2 justify-center" 
                : "p-2"
            )}
            title="New Chat"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {isExpanded && <span className="text-sm font-medium whitespace-nowrap">New Chat</span>}
          </button>
        </div>
      )}

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className={cn(
            "flex flex-col items-center justify-center py-12 text-center",
            isExpanded ? "px-4" : "px-2"
          )}>
            <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            {isExpanded && (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No chat history
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Start a conversation
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="py-2">
            {groupedSessions.map((group) => (
              <div key={group.label} className="mb-2">
                {isExpanded && (
                  <div className="px-3 py-1.5 overflow-hidden">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {group.label}
                    </span>
                  </div>
                )}
                {group.sessions.map((session) => {
                  const isLoadingThis = loadingSessionId === session.id;
                  const isCurrentSession = currentSessionId === session.id;

                  return (
                    <button
                      key={session.id}
                      onClick={() => !isLoadingThis && onSelectSession(session.id)}
                      disabled={isLoadingThis}
                      title={!isExpanded ? session.displayName : undefined}
                      className={cn(
                        "w-full flex items-center gap-2 text-left transition-colors group relative",
                        isExpanded ? "px-3 py-2" : "px-2 py-2 justify-center",
                        "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                        isCurrentSession &&
                          "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500",
                        isLoadingThis && "bg-blue-50/50 dark:bg-blue-900/10 cursor-wait"
                      )}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {isLoadingThis ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                          <MessageSquare
                            className={cn(
                              "w-4 h-4",
                              isCurrentSession
                                ? "text-blue-500"
                                : "text-gray-400 dark:text-gray-500"
                            )}
                          />
                        )}
                      </div>

                      {/* Content - only show when expanded */}
                      {isExpanded && (
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p
                            className={cn(
                              "text-sm truncate whitespace-nowrap",
                              isCurrentSession || isLoadingThis
                                ? "text-blue-600 dark:text-blue-400 font-medium"
                                : "text-gray-700 dark:text-gray-300"
                            )}
                          >
                            {isLoadingThis ? "Loading..." : session.displayName}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(session.startTime)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Delete button - only show when expanded and hovering */}
                      {isExpanded && onDeleteSession && !isLoadingThis && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 
                            rounded hover:bg-red-100 dark:hover:bg-red-900/30
                            text-gray-400 hover:text-red-500 dark:hover:text-red-400
                            opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Load More */}
            {hasMore && onLoadMore && isExpanded && (
              <div className="px-3 py-2">
                <button
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="w-full py-1.5 text-xs text-blue-600 dark:text-blue-400 
                    hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg 
                    transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
