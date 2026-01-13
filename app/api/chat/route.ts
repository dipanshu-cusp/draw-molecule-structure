import { NextRequest } from "next/server";
import { GoogleAuth } from "google-auth-library";

// Backend server URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// Environment variable to toggle between mock and real backend
const USE_MOCK = process.env.USE_MOCK === "true";

// Google Auth client for Cloud Run service-to-service authentication
// This is used to get ID tokens for calling internal Cloud Run services
const auth = new GoogleAuth();

// Debug logging helper
function debugLog(context: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [CHAT_API] [${context}] ${message}`);
  if (data !== undefined) {
    console.log(`[${timestamp}] [CHAT_API] [${context}] Data:`, JSON.stringify(data, null, 2));
  }
}

/**
 * Get an ID token for authenticating with the internal Cloud Run backend.
 * This is required when the backend is deployed with internal networking.
 * The frontend service account must have Cloud Run Invoker permission on the backend.
 *
 * @returns The ID token to use in the Authorization header, or null if not in Cloud Run
 */
async function getBackendAuthToken(): Promise<string | null> {
  debugLog("AUTH", "Getting backend auth token...");
  debugLog("AUTH", `K_SERVICE env: ${process.env.K_SERVICE || "not set"}`);
  debugLog("AUTH", `BACKEND_URL: ${BACKEND_URL}`);
  
  // Skip auth for local development
  if (!process.env.K_SERVICE) {
    debugLog("AUTH", "Skipping auth - not running in Cloud Run (K_SERVICE not set)");
    return null;
  }

  try {
    debugLog("AUTH", "Requesting ID token client for audience:", BACKEND_URL);
    
    // Get an ID token for the backend service URL
    // The audience must be the backend's Cloud Run URL (without path)
    const client = await auth.getIdTokenClient(BACKEND_URL);
    debugLog("AUTH", "ID token client obtained successfully");
    
    const headers = await client.getRequestHeaders();
    debugLog("AUTH", "Request headers obtained");
    
    // getRequestHeaders() returns { Authorization: "Bearer <token>" } as a plain object
    const authHeader = headers as { Authorization?: string };
    
    if (authHeader.Authorization) {
      // Log only first/last few chars of token for debugging
      const token = authHeader.Authorization;
      const tokenPreview = token.length > 30 
        ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}`
        : token;
      debugLog("AUTH", `Auth token obtained: ${tokenPreview}`);
    } else {
      debugLog("AUTH", "WARNING: No Authorization header in response");
    }
    
    return authHeader.Authorization || null;
  } catch (error) {
    debugLog("AUTH", "ERROR getting auth token:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      "Unable to authenticate with backend service. Please check service account permissions."
    );
  }
}

/**
 * Extract request origin information to determine if request came from browser or server
 */
function getRequestOriginInfo(request: NextRequest): Record<string, string | null> {
  return {
    // Client IP - will show Cloud Run internal IP if from another Cloud Run service
    "x-forwarded-for": request.headers.get("x-forwarded-for"),
    // Original host the request was made to
    "host": request.headers.get("host"),
    // User agent - browsers have specific patterns, Cloud Run/Node will be different
    "user-agent": request.headers.get("user-agent"),
    // Origin header - set by browsers for CORS requests
    "origin": request.headers.get("origin"),
    // Referer - set by browsers when navigating
    "referer": request.headers.get("referer"),
    // Cloud Run specific headers
    "x-cloud-trace-context": request.headers.get("x-cloud-trace-context"),
    "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    // Custom header that could be set to identify internal calls
    "x-request-source": request.headers.get("x-request-source"),
  };
}

/**
 * Determine if request is likely from a browser or server-side
 */
function identifyRequestSource(headers: Record<string, string | null>): string {
  const userAgent = headers["user-agent"] || "";
  
  // Check for common browser identifiers
  const browserPatterns = ["Mozilla", "Chrome", "Safari", "Firefox", "Edge", "Opera"];
  const isBrowserUA = browserPatterns.some(pattern => userAgent.includes(pattern));
  
  // Check for Node.js/server identifiers
  const serverPatterns = ["node-fetch", "undici", "axios", "got", "Node.js"];
  const isServerUA = serverPatterns.some(pattern => userAgent.includes(pattern));
  
  // If origin header is present, it's likely a browser CORS request
  const hasOrigin = !!headers["origin"];
  
  // If referer is present, likely from browser navigation
  const hasReferer = !!headers["referer"];
  
  if (isServerUA) {
    return "SERVER (Node.js/fetch library detected in User-Agent)";
  } else if (isBrowserUA && (hasOrigin || hasReferer)) {
    return "BROWSER (Browser UA + Origin/Referer headers present)";
  } else if (isBrowserUA) {
    return "LIKELY_BROWSER (Browser UA detected)";
  } else if (hasOrigin || hasReferer) {
    return "LIKELY_BROWSER (Origin/Referer headers present)";
  } else {
    return "UNKNOWN (Could be server-side or curl/API client)";
  }
}

/**
 * Chat API endpoint that proxies requests to the FastAPI backend
 * The backend handles Vertex AI Discovery Engine integration
 * Supports SSE streaming responses
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  debugLog("REQUEST", `=== New request started [${requestId}] ===`);
  
  // Log request origin information
  const originInfo = getRequestOriginInfo(request);
  const requestSource = identifyRequestSource(originInfo);
  debugLog("REQUEST", `[${requestId}] Request source: ${requestSource}`);
  debugLog("REQUEST", `[${requestId}] Request headers:`, originInfo);
  debugLog("REQUEST", `[${requestId}] Request URL: ${request.url}`);
  debugLog("REQUEST", `[${requestId}] Request method: ${request.method}`);
  
  const body = await request.json();
  const { messages, moleculeData, sessionId } = body;

  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  const userContent = lastMessage?.content || "";
  const smiles = moleculeData?.smiles || lastMessage?.moleculeData?.smiles;

  debugLog("REQUEST", `[${requestId}] Request body:`, {
    userContent: userContent.substring(0, 100),
    smiles,
    sessionId,
    USE_MOCK,
  });

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper function to send SSE data
      const sendChunk = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!USE_MOCK) {
          // Get authentication token for Cloud Run service-to-service calls
          debugLog("BACKEND", `[${requestId}] Getting auth token...`);
          const authToken = await getBackendAuthToken();

          // Build headers with optional auth token
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (authToken) {
            headers["Authorization"] = authToken;
            debugLog("BACKEND", `[${requestId}] Auth token added to headers`);
          } else {
            debugLog("BACKEND", `[${requestId}] No auth token (local dev mode)`);
          }

          // Construct the full URL
          const fullUrl = `${BACKEND_URL}/chat`;
          debugLog("BACKEND", `[${requestId}] Calling backend:`, {
            url: fullUrl,
            method: "POST",
            hasAuthHeader: !!authToken,
          });

          // Call the FastAPI backend which handles Vertex AI
          const backendResponse = await fetch(fullUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              prompt: userContent,
              smiles: smiles || null,
              session_id: sessionId || null,
            }),
          });

          debugLog("BACKEND", `[${requestId}] Backend response:`, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: Object.fromEntries(backendResponse.headers.entries()),
          });

          if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            debugLog("BACKEND", `[${requestId}] Backend error response body:`, errorText);
            throw new Error(`Backend error: ${backendResponse.status} ${errorText}`);
          }

          if (!backendResponse.body) {
            debugLog("BACKEND", `[${requestId}] No response body from backend`);
            throw new Error("No response body from backend");
          }

          debugLog("BACKEND", `[${requestId}] Starting to stream response...`);

          // Stream the response from the backend to the client
          const reader = backendResponse.body.getReader();
          const decoder = new TextDecoder();

          let buffer = "";
          let chunkCount = 0;

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              debugLog("BACKEND", `[${requestId}] Stream completed. Total chunks: ${chunkCount}`);
              break;
            }

            chunkCount++;
            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages from the buffer
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6); // Remove "data: " prefix
                
                if (data === "[DONE]") {
                  debugLog("BACKEND", `[${requestId}] Received [DONE] signal`);
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                } else {
                  // Forward the data as-is (already JSON formatted)
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              }
            }
          }

          debugLog("BACKEND", `[${requestId}] Finished streaming response`);

          // Process any remaining data in the buffer
          if (buffer.startsWith("data: ")) {
            const data = buffer.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } else if (data.trim()) {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
        } else {
          debugLog("MOCK", `[${requestId}] Using mock response`);
          // Mock response for development/testing
          const response = generateMockResponse(userContent, smiles);

          // Stream the response word by word
          const words = response.split(" ");
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? " " : "");
            sendChunk({ content: word });
            // Simulate typing delay
            await new Promise((resolve) =>
              setTimeout(resolve, 30 + Math.random() * 50)
            );
          }

          // Send completion signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      } catch (error) {
        debugLog("ERROR", `[${requestId}] Request failed:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        console.error("Chat API error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
        sendChunk({
          error: true,
          content: `I encountered an error while processing your request: ${errorMessage}. Please try again.`,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Generate mock response for development/testing
 * Used when USE_VERTEX_AI is false
 */
function generateMockResponse(userContent: string, smiles?: string): string {
  if (smiles) {
    return `I can see you've provided a molecule with SMILES notation: **${smiles}**\n\nThis appears to be a chemical structure. Let me analyze it for you:\n\n• **Molecular Formula**: Would be calculated based on the structure\n• **Properties**: This molecule contains various functional groups\n• **Applications**: Depends on the specific compound\n\nWould you like me to provide more specific information about this molecule?`;
  } else if (userContent.toLowerCase().includes("aspirin")) {
    return `**Aspirin (Acetylsalicylic Acid)**\n\n• **Chemical Formula**: C₉H₈O₄\n• **SMILES**: CC(=O)OC1=CC=CC=C1C(=O)O\n• **Molecular Weight**: 180.16 g/mol\n\nAspirin is a widely used medication for:\n- Pain relief (analgesic)\n- Fever reduction (antipyretic)\n- Anti-inflammatory effects\n- Blood clot prevention (antiplatelet)\n\nWould you like me to draw the structure or find similar compounds?`;
  } else if (userContent.toLowerCase().includes("similar")) {
    return `To find similar compounds, I would typically:\n\n1. **Analyze the core structure** of your molecule\n2. **Search databases** like PubChem, ChEMBL, or ZINC\n3. **Calculate similarity scores** using fingerprints like Morgan/ECFP\n\nPlease draw a molecule using the "Draw Molecule" option, and I'll help you find structurally similar compounds!`;
  } else {
    return `I'm here to help you with molecular searches and chemistry questions!\n\nYou can:\n• **Ask about specific molecules** (e.g., "What is aspirin?")\n• **Draw a molecular structure** using the pencil icon\n• **Search for compounds** by name, SMILES, or properties\n• **Find similar molecules** to a given structure\n\nWhat would you like to explore?`;
  }
}
