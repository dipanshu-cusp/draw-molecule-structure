"use client";

import { useState, useCallback, useRef } from "react";
import { Message, MoleculeData, ChatState, MessageMetadata } from "../types/chat";

interface UseChatOptions {
  apiEndpoint?: string;
  onError?: (error: Error) => void;
  onSessionCreated?: (sessionId: string) => void;
  userPseudoId?: string;
}

interface SendMessageParams {
  content: string;
  moleculeData?: MoleculeData;
}

export function useChat(options: UseChatOptions = {}) {
  const { apiEndpoint = "/api/chat", onError, onSessionCreated, userPseudoId } = options;

  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    sessionId: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const generateId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Load messages from an existing session
  const loadSession = useCallback((sessionId: string, messages: Message[]) => {
    setState({
      messages,
      isLoading: false,
      error: null,
      sessionId,
    });
  }, []);

  const sendMessage = useCallback(
    async ({ content, moleculeData }: SendMessageParams) => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new abort controller
      abortControllerRef.current = new AbortController();

      // Create user message
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
        moleculeData,
      };

      // Create placeholder for assistant message
      const assistantMessageId = generateId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
        isLoading: true,
        error: null,
      }));

      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: state.messages.concat(userMessage).map((m) => ({
              role: m.role,
              content: m.content,
              moleculeData: m.moleculeData,
            })),
            moleculeData,
            sessionId: state.sessionId,
            userPseudoId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Read the SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";
        let metadata: MessageMetadata = {};
        let buffer = ""; // Buffer for incomplete SSE messages

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Append new data to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines from buffer
          const lines = buffer.split("\n");
          
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);

              if (data === "[DONE]") {
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                // Handle metadata updates (session, references, etc.)
                // Check for metadata type FIRST before checking for content
                if (parsed.type === "metadata" || (parsed.sessionId && parsed.relatedQuestions)) {
                  metadata = {
                    sessionId: parsed.sessionId,
                    relatedQuestions: parsed.relatedQuestions,
                    references: parsed.references,
                  };

                  // Update session ID in state and notify if new session created
                  if (parsed.sessionId) {
                    setState((prev) => {
                      // Check if this is a new session (no previous sessionId)
                      const isNewSession = !prev.sessionId && parsed.sessionId;
                      
                      // Call the callback after state update if it's a new session
                      if (isNewSession && onSessionCreated) {
                        // Use setTimeout to ensure state is updated first
                        setTimeout(() => onSessionCreated(parsed.sessionId), 100);
                      }
                      
                      return {
                        ...prev,
                        sessionId: parsed.sessionId,
                      };
                    });
                  }

                  // Update the assistant message with metadata
                  setState((prev) => ({
                    ...prev,
                    messages: prev.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, metadata }
                        : m
                    ),
                  }));
                  continue;
                }

                // Handle error from Vertex AI
                if (parsed.error) {
                  accumulatedContent = parsed.content || "An error occurred";
                  setState((prev) => ({
                    ...prev,
                    messages: prev.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulatedContent }
                        : m
                    ),
                    error: accumulatedContent,
                  }));
                  continue;
                }

                // Only process content if this is a content chunk (not metadata)
                // Skip if the parsed object looks like metadata
                if (parsed.relatedQuestions || parsed.references) {
                  continue;
                }

                const content =
                  parsed.content || parsed.text || parsed.delta?.content || "";

                if (content) {
                  // Check if this is a "replace" chunk - means the complete answer
                  // is different from what we've been streaming
                  if (parsed.replace) {
                    accumulatedContent = content;
                  } else {
                    accumulatedContent += content;
                  }

                  // Update the assistant message with accumulated content
                  setState((prev) => ({
                    ...prev,
                    messages: prev.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulatedContent }
                        : m
                    ),
                  }));
                }
              } catch {
                // If it's not valid JSON, check if it looks like metadata JSON (partial)
                // and skip it to avoid appending raw JSON to the message
                const trimmedData = data.trim();
                if (
                  trimmedData.startsWith('{"type":"metadata"') ||
                  trimmedData.startsWith('{"sessionId"') ||
                  trimmedData.includes('"relatedQuestions"')
                ) {
                  // This looks like metadata JSON, skip it
                  continue;
                }
                
                // Otherwise treat as plain text content
                if (trimmedData) {
                  accumulatedContent += trimmedData;
                  setState((prev) => ({
                    ...prev,
                    messages: prev.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulatedContent }
                        : m
                    ),
                  }));
                }
              }
            }
          }
        }

        // Process any remaining data in buffer
        if (buffer.trim() && buffer.startsWith("data: ")) {
          const data = buffer.slice(6).trim();
          if (data && data !== "[DONE]") {
            try {
              const parsed = JSON.parse(data);
              if (parsed.content && !parsed.relatedQuestions && !parsed.references) {
                accumulatedContent += parsed.content;
                setState((prev) => ({
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: accumulatedContent }
                      : m
                  ),
                }));
              }
            } catch {
              // Ignore incomplete JSON in buffer
            }
          }
        }

        // Mark streaming as complete
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === assistantMessageId
              ? { ...m, isStreaming: false, timestamp: new Date() }
              : m
          ),
          isLoading: false,
        }));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was cancelled, don't treat as error
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";

        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
                  isStreaming: false,
                }
              : m
          ),
          isLoading: false,
          error: errorMessage,
        }));

        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    },
    [apiEndpoint, state.messages, state.sessionId, onError]
  );

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Reset messages and session ID to start fresh
    setState({
      messages: [],
      isLoading: false,
      error: null,
      sessionId: null,
    });
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        messages: prev.messages.map((m) =>
          m.isStreaming ? { ...m, isStreaming: false } : m
        ),
      }));
    }
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sessionId: state.sessionId,
    sendMessage,
    clearMessages,
    cancelRequest,
    loadSession,
  };
}
