"use client";

import { useState, useCallback, useRef } from "react";
import { Message, MoleculeData, ChatState } from "../types/chat";

interface UseChatOptions {
  apiEndpoint?: string;
  onError?: (error: Error) => void;
}

interface SendMessageParams {
  content: string;
  moleculeData?: MoleculeData;
}

export function useChat(options: UseChatOptions = {}) {
  const { apiEndpoint = "/api/chat", onError } = options;

  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const generateId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

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

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);

              if (data === "[DONE]") {
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content =
                  parsed.content || parsed.text || parsed.delta?.content || "";

                if (content) {
                  accumulatedContent += content;

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
                // If it's not JSON, treat as plain text
                if (data.trim()) {
                  accumulatedContent += data;
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
    [apiEndpoint, state.messages, onError]
  );

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      messages: [],
      isLoading: false,
      error: null,
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
    sendMessage,
    clearMessages,
    cancelRequest,
  };
}
