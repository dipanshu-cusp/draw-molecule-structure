/**
 * Vertex AI Discovery Engine integration for chat functionality
 *
 * This module handles communication with Google's Vertex AI Discovery Engine
 * for search and answer generation with session support for follow-up questions.
 */

// Configuration from environment variables
const PROJECT_ID = process.env.VERTEX_AI_PROJECT_ID;
const ENGINE_ID = process.env.VERTEX_AI_ENGINE_ID;
const LOCATION = process.env.VERTEX_AI_LOCATION;
const COLLECTION = process.env.VERTEX_AI_COLLECTION;

const BASE_URL = `https://discoveryengine.googleapis.com/v1alpha/projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION}/engines/${ENGINE_ID}/servingConfigs/default_search`;

/**
 * Clean the answer text by removing any embedded JSON metadata
 * Sometimes the Vertex AI response includes metadata as part of the text
 */
function cleanAnswerText(text: string): string {
  // Find any JSON object that looks like metadata at the end of the text
  // Pattern: text followed by JSON starting with { and containing metadata-like keys

  // Look for the start of a JSON object with known metadata fields
  const patterns = [
    /\{"type"\s*:\s*"metadata".*$/,
    /\{"sessionId"\s*:\s*"[^"]*".*"relatedQuestions".*$/,
    /\{"sessionId"\s*:\s*"[0-9]+".*$/,
  ];

  let cleanedText = text;

  for (const pattern of patterns) {
    const match = cleanedText.match(pattern);
    if (match && match.index !== undefined) {
      cleanedText = cleanedText.slice(0, match.index).trim();
      break;
    }
  }

  // Fallback: look for the literal pattern '{"type":"metadata"' anywhere
  const metadataIndex = cleanedText.indexOf('{"type":"metadata"');
  if (metadataIndex !== -1) {
    cleanedText = cleanedText.slice(0, metadataIndex).trim();
  }

  // Also check for '{"sessionId":' followed by numbers (session IDs are numeric)
  const sessionIdMatch = cleanedText.match(/\{"sessionId"\s*:\s*"[0-9]+"/);
  if (sessionIdMatch && sessionIdMatch.index !== undefined) {
    cleanedText = cleanedText.slice(0, sessionIdMatch.index).trim();
  }

  return cleanedText;
}

export interface VertexSearchResult {
  id: string;
  document?: {
    name?: string;
    structData?: Record<string, unknown>;
    derivedStructData?: {
      link?: string;
      title?: string;
      snippets?: Array<{ snippet: string }>;
    };
  };
}

export interface VertexSearchResponse {
  results?: VertexSearchResult[];
  totalSize?: number;
  queryId?: string;
  session?: {
    name?: string;
    state?: string;
  };
  summary?: {
    summaryText?: string;
    summaryWithMetadata?: {
      summary?: string;
      citationMetadata?: {
        citations?: Array<{
          startIndex?: number;
          endIndex?: number;
          sources?: Array<{ referenceIndex?: number }>;
        }>;
      };
      references?: Array<{
        title?: string;
        uri?: string;
        chunkContents?: Array<{ content?: string }>;
      }>;
    };
  };
}

export interface VertexAnswerResponse {
  answer?: {
    state?: string;
    answerText?: string;
    steps?: Array<{
      state?: string;
      description?: string;
      thought?: string;
      actions?: Array<{
        searchAction?: {
          query?: string;
        };
        observation?: {
          searchResults?: Array<{
            document?: string;
            uri?: string;
            title?: string;
            snippetInfo?: Array<{ snippet?: string }>;
          }>;
        };
      }>;
    }>;
    citations?: Array<{
      startIndex?: number;
      endIndex?: number;
      sources?: Array<{ referenceId?: string }>;
    }>;
    references?: Array<{
      unstructuredDocumentInfo?: {
        document?: string;
        uri?: string;
        title?: string;
        chunkContents?: Array<{
          content?: string;
          pageIdentifier?: string;
        }>;
      };
      chunkInfo?: {
        content?: string;
        documentMetadata?: {
          document?: string;
          uri?: string;
          title?: string;
        };
      };
    }>;
    relatedQuestions?: string[];
  };
  session?: {
    name?: string;
    state?: string;
    userPseudoId?: string;
    turns?: Array<{
      query?: { text?: string; queryId?: string };
      answer?: string;
    }>;
  };
  answerQueryToken?: string;
}

export interface SearchOptions {
  query: string;
  pageSize?: number;
  sessionId?: string;
  languageCode?: string;
}

export interface AnswerOptions {
  query: string;
  queryId?: string;
  sessionId?: string;
}

/**
 * Get access token for Google Cloud API authentication
 * In production, use a service account or appropriate authentication method
 */
async function getAccessToken(): Promise<string> {
  // Option 1: Use environment variable (for deployed environments)
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN;
  }

  // Option 2: Use gcloud CLI (for local development)
  // This requires gcloud to be installed and authenticated
  try {
    const { execSync } = await import("child_process");

    // Use execSync for more reliable execution
    const token = execSync("gcloud auth print-access-token", {
      encoding: "utf-8",
      timeout: 10000, // 10 second timeout
      stdio: ["pipe", "pipe", "pipe"], // Capture stderr
    }).trim();

    if (!token || token.includes("ERROR")) {
      throw new Error("Invalid token received from gcloud");
    }

    return token;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to get access token from gcloud:", errorMessage);

    // Provide helpful error message
    throw new Error(
      `Unable to authenticate with Google Cloud. Please run 'gcloud auth login' to refresh your credentials, or set the GOOGLE_ACCESS_TOKEN environment variable.`
    );
  }
}

/**
 * Perform a search query using Vertex AI Discovery Engine
 * This starts a new session or continues an existing one
 */
export async function searchWithVertex(
  options: SearchOptions
): Promise<VertexSearchResponse> {
  const { query, pageSize = 10, sessionId, languageCode = "en-GB" } = options;

  const accessToken = await getAccessToken();

  // Use "-" to start a new session, or use existing session ID
  const session = sessionId
    ? `projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION}/engines/${ENGINE_ID}/sessions/${sessionId}`
    : `projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION}/engines/${ENGINE_ID}/sessions/-`;

  // Note: When using sessions, we cannot include summarySpec
  // The answer generation is handled by the separate answer method
  const requestBody: Record<string, unknown> = {
    query,
    pageSize,
    queryExpansionSpec: { condition: "AUTO" },
    spellCorrectionSpec: { mode: "AUTO" },
    languageCode,
    contentSearchSpec: {
      snippetSpec: { returnSnippet: true },
    },
    session,
  };

  const response = await fetch(`${BASE_URL}:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vertex AI search error:", errorText);
    throw new Error(`Vertex AI search failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get an answer for a query using Vertex AI Discovery Engine's answer method
 * This provides AI-generated answers with citations
 */
export async function getAnswerFromVertex(
  options: AnswerOptions
): Promise<VertexAnswerResponse> {
  const { query, queryId, sessionId } = options;

  const accessToken = await getAccessToken();

  // Build session path
  const session = sessionId
    ? `projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION}/engines/${ENGINE_ID}/sessions/${sessionId}`
    : `projects/${PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION}/engines/${ENGINE_ID}/sessions/-`;

  const requestBody: Record<string, unknown> = {
    query: {
      text: query,
      ...(queryId && { queryId }),
    },
    session,
    relatedQuestionsSpec: { enable: true },
    answerGenerationSpec: {
      ignoreAdversarialQuery: true,
      ignoreNonAnswerSeekingQuery: false,
      ignoreLowRelevantContent: true,
      includeCitations: true,
    },
  };

  const response = await fetch(`${BASE_URL}:answer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vertex AI answer error:", errorText);
    throw new Error(`Vertex AI answer failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Combined search and answer flow
 * First performs a search to get queryId and session, then gets an answer
 */
export async function searchAndAnswer(options: {
  query: string;
  sessionId?: string;
}): Promise<{
  answer: string;
  sessionId: string | null;
  queryId: string | null;
  relatedQuestions: string[];
  references: Array<{ title?: string; uri?: string; content?: string }>;
}> {
  const { query, sessionId } = options;

  // Step 1: Perform search to get session and query ID
  const searchResponse = await searchWithVertex({
    query,
    sessionId,
    pageSize: 10,
  });

  // Extract session ID from response
  const sessionName = searchResponse.session?.name;
  const extractedSessionId = sessionName?.split("/sessions/")[1] || null;
  const queryId = searchResponse.queryId || null;

  // Step 2: Get answer using the query ID and session
  const answerResponse = await getAnswerFromVertex({
    query,
    queryId: queryId || undefined,
    sessionId: extractedSessionId || undefined,
  });

  // Extract the answer text
  let answerText =
    answerResponse.answer?.answerText ||
    searchResponse.summary?.summaryText ||
    "I couldn't find a relevant answer to your question.";

  // Clean the answer text - remove any embedded JSON metadata that might be in the response
  // Sometimes the API returns metadata as part of the text
  answerText = cleanAnswerText(answerText);

  // Extract related questions
  const relatedQuestions = answerResponse.answer?.relatedQuestions || [];

  // Extract references for citations
  const references: Array<{ title?: string; uri?: string; content?: string }> =
    [];

  if (answerResponse.answer?.references) {
    for (const ref of answerResponse.answer.references) {
      if (ref.unstructuredDocumentInfo) {
        references.push({
          title: ref.unstructuredDocumentInfo.title,
          uri: ref.unstructuredDocumentInfo.uri,
          content: ref.unstructuredDocumentInfo.chunkContents?.[0]?.content,
        });
      } else if (ref.chunkInfo) {
        references.push({
          title: ref.chunkInfo.documentMetadata?.title,
          uri: ref.chunkInfo.documentMetadata?.uri,
          content: ref.chunkInfo.content,
        });
      }
    }
  }

  // Update session ID from answer response if available
  const finalSessionId =
    answerResponse.session?.name?.split("/sessions/")[1] ||
    extractedSessionId ||
    null;

  return {
    answer: answerText,
    sessionId: finalSessionId,
    queryId,
    relatedQuestions,
    references,
  };
}

/**
 * Stream-like response generator for SSE compatibility
 * This simulates streaming by chunking the answer text
 */
export async function* streamAnswer(options: {
  query: string;
  sessionId?: string;
}): AsyncGenerator<{
  type: "chunk" | "metadata" | "done";
  content?: string;
  sessionId?: string | null;
  relatedQuestions?: string[];
  references?: Array<{ title?: string; uri?: string; content?: string }>;
}> {
  try {
    const result = await searchAndAnswer(options);

    // Yield the answer in chunks to simulate streaming
    const words = result.answer.split(" ");
    const chunkSize = 3; // Send 3 words at a time

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      yield {
        type: "chunk",
        content: chunk + (i + chunkSize < words.length ? " " : ""),
      };
      // Small delay to simulate streaming
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Yield metadata at the end
    yield {
      type: "metadata",
      sessionId: result.sessionId,
      relatedQuestions: result.relatedQuestions,
      references: result.references,
    };

    yield { type: "done" };
  } catch (error) {
    console.error("Error in streamAnswer:", error);
    throw error;
  }
}
