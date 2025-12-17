import { NextRequest } from "next/server";
import { streamAnswer } from "@/app/lib/vertex-ai";

// Environment variable to toggle between mock and real Vertex AI
const USE_VERTEX_AI = process.env.USE_VERTEX_AI === "true";

/**
 * Chat API endpoint that integrates with Vertex AI Discovery Engine
 * Supports SSE streaming responses
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, moleculeData, sessionId } = body;

  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  const userContent = lastMessage?.content || "";
  const smiles = moleculeData?.smiles || lastMessage?.moleculeData?.smiles;

  // Build the query with molecule context if available
  let query = userContent;
  if (smiles) {
    query = `${userContent}\n\nContext: The user has provided a molecule with SMILES notation: ${smiles}`;
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper function to send SSE data
      const sendChunk = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        if (USE_VERTEX_AI) {
          // Use Vertex AI Discovery Engine
          const generator = streamAnswer({ query, sessionId });

          for await (const chunk of generator) {
            if (chunk.type === "chunk" && chunk.content) {
              // Check if this is a "replace" chunk (complete answer that differs from streamed content)
              const chunkData: Record<string, unknown> = { content: chunk.content };
              if ((chunk as any).replace) {
                chunkData.replace = true;
              }
              sendChunk(chunkData);
            } else if (chunk.type === "metadata") {
              // Send session and metadata info
              sendChunk({
                type: "metadata",
                sessionId: chunk.sessionId,
                relatedQuestions: chunk.relatedQuestions,
                references: chunk.references,
              });
            } else if (chunk.type === "done") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
          error instanceof Error ? error.message : "An unexpected error occurred";
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
