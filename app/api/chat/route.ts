import { NextRequest } from "next/server";
import { GoogleAuth } from "google-auth-library";

// Backend server URL - defaults to localhost for development
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// Environment variable to toggle between mock and real backend
const USE_MOCK = process.env.USE_MOCK === "true";

// Google Auth client for Cloud Run service-to-service authentication
// This is used to get ID tokens for calling internal Cloud Run services
const auth = new GoogleAuth();

/**
 * Get an ID token for authenticating with the internal Cloud Run backend.
 * This is required when the backend is deployed with internal networking.
 * The frontend service account must have Cloud Run Invoker permission on the backend.
 *
 * @returns The ID token to use in the Authorization header, or null if not in Cloud Run
 */
async function getBackendAuthToken(): Promise<string | null> {
  // Skip auth for local development
  if (!process.env.K_SERVICE) {
    return null;
  }

  try {
    // Get an ID token for the backend service URL
    // The audience must be the backend's Cloud Run URL
    const client = await auth.getIdTokenClient(BACKEND_URL);
    const headers = await client.getRequestHeaders();
    // getRequestHeaders() returns { Authorization: "Bearer <token>" } as a plain object
    const authHeader = headers as { Authorization?: string };
    return authHeader.Authorization || null;
  } catch (error) {
    console.error("Failed to get backend auth token:", error);
    throw new Error(
      "Unable to authenticate with backend service. Please check service account permissions."
    );
  }
}

/**
 * Chat API endpoint that proxies requests to the FastAPI backend
 * The backend handles Vertex AI Discovery Engine integration
 * Supports SSE streaming responses
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, moleculeData, sessionId } = body;

  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  const userContent = lastMessage?.content || "";
  const smiles = moleculeData?.smiles || lastMessage?.moleculeData?.smiles;

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
          const authToken = await getBackendAuthToken();

          // Build headers with optional auth token
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (authToken) {
            headers["Authorization"] = authToken;
          }

          // Call the FastAPI backend which handles Vertex AI
          const backendResponse = await fetch(`${BACKEND_URL}/chat`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              prompt: userContent,
              smiles: smiles || null,
              session_id: sessionId || null,
            }),
          });

          if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            throw new Error(`Backend error: ${backendResponse.status} ${errorText}`);
          }

          if (!backendResponse.body) {
            throw new Error("No response body from backend");
          }

          // Stream the response from the backend to the client
          const reader = backendResponse.body.getReader();
          const decoder = new TextDecoder();

          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages from the buffer
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6); // Remove "data: " prefix
                
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                } else {
                  // Forward the data as-is (already JSON formatted)
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              }
            }
          }

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
