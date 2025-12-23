"use client";

import { useState, useCallback, useEffect } from "react";
import { Message } from "../types/chat";

// Generate a unique user ID and persist it in localStorage
function getUserPseudoId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const STORAGE_KEY = "molecule-search-user-id";
  let userId = localStorage.getItem(STORAGE_KEY);

  if (!userId) {
    // Generate a UUID v4
    userId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, userId);
  }

  return userId;
}

export interface ChatHistorySession {
  id: string;
  displayName: string;
  startTime?: string;
  endTime?: string;
  turnCount?: number;
  preview?: string;
  isPinned?: boolean;
}

export interface SessionDetail {
  id: string;
  displayName: string;
  startTime?: string;
  messages: Message[];
}

interface UseChatHistoryOptions {
  apiEndpoint?: string;
  autoLoad?: boolean;
}

interface UseChatHistoryState {
  sessions: ChatHistorySession[];
  isLoading: boolean;
  error: string | null;
  nextPageToken?: string;
  hasMore: boolean;
}

export function useChatHistory(options: UseChatHistoryOptions = {}) {
  const { apiEndpoint = "/api/sessions", autoLoad = true } = options;

  const [state, setState] = useState<UseChatHistoryState>({
    sessions: [],
    isLoading: false,
    error: null,
    hasMore: false,
  });

  const [userPseudoId, setUserPseudoId] = useState<string>("");

  // Initialize userPseudoId on client side
  useEffect(() => {
    setUserPseudoId(getUserPseudoId());
  }, []);

  // Load sessions list
  const loadSessions = useCallback(
    async (pageToken?: string) => {
      if (!userPseudoId) return;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const params = new URLSearchParams();
        params.set("userPseudoId", userPseudoId);
        if (pageToken) {
          params.set("pageToken", pageToken);
        }

        const response = await fetch(`${apiEndpoint}?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Failed to load sessions: ${response.status}`);
        }

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          sessions: pageToken
            ? [...prev.sessions, ...data.sessions]
            : data.sessions,
          nextPageToken: data.nextPageToken,
          hasMore: !!data.nextPageToken,
          isLoading: false,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load sessions";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
      }
    },
    [apiEndpoint, userPseudoId]
  );

  // Load more sessions (pagination)
  const loadMore = useCallback(() => {
    if (state.nextPageToken && !state.isLoading) {
      loadSessions(state.nextPageToken);
    }
  }, [loadSessions, state.nextPageToken, state.isLoading]);

  // Get a specific session with full messages
  const getSession = useCallback(
    async (sessionId: string): Promise<SessionDetail | null> => {
      try {
        const response = await fetch(`${apiEndpoint}/${sessionId}`);

        if (!response.ok) {
          throw new Error(`Failed to load session: ${response.status}`);
        }

        const data = await response.json();

        // Transform messages to have proper Date objects
        const messages: Message[] = (data.messages || []).map(
          (msg: { id: string; role: "user" | "assistant"; content: string }) => ({
            ...msg,
            timestamp: new Date(),
          })
        );

        return {
          id: data.id,
          displayName: data.displayName,
          startTime: data.startTime,
          messages,
        };
      } catch (error) {
        console.error("Error loading session:", error);
        return null;
      }
    },
    [apiEndpoint]
  );

  // Delete a session
  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        const response = await fetch(`${apiEndpoint}/${sessionId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete session: ${response.status}`);
        }

        // Remove from local state
        setState((prev) => ({
          ...prev,
          sessions: prev.sessions.filter((s) => s.id !== sessionId),
        }));

        return true;
      } catch (error) {
        console.error("Error deleting session:", error);
        return false;
      }
    },
    [apiEndpoint]
  );

  // Refresh sessions list
  const refresh = useCallback(() => {
    loadSessions();
  }, [loadSessions]);

  // Auto-load sessions on mount
  useEffect(() => {
    if (autoLoad && userPseudoId) {
      loadSessions();
    }
  }, [autoLoad, userPseudoId, loadSessions]);

  return {
    sessions: state.sessions,
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    userPseudoId,
    loadSessions,
    loadMore,
    getSession,
    deleteSession,
    refresh,
  };
}
