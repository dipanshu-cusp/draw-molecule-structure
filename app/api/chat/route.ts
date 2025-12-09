import { NextRequest } from "next/server";

// Mock SSE streaming response
// Replace this with your Vertex AI implementation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, moleculeData } = body;

  // Get the last user message
  const lastMessage = messages[messages.length - 1];
  const userContent = lastMessage?.content || "";
  const smiles = moleculeData?.smiles || lastMessage?.moleculeData?.smiles;

  // Create a ReadableStream that simulates SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper function to send SSE data
      const sendChunk = (text: string) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
        );
      };

      // Simulate streaming response based on query
      let response = "";

      if (smiles) {
        response = `I can see you've provided a molecule with SMILES notation: **${smiles}**\n\nThis appears to be a chemical structure. Let me analyze it for you:\n\n`;
        response += `• **Molecular Formula**: Would be calculated based on the structure\n`;
        response += `• **Properties**: This molecule contains various functional groups\n`;
        response += `• **Applications**: Depends on the specific compound\n\n`;
        response += `Would you like me to provide more specific information about this molecule?`;
      } else if (userContent.toLowerCase().includes("aspirin")) {
        response = `**Aspirin (Acetylsalicylic Acid)**\n\n`;
        response += `• **Chemical Formula**: C₉H₈O₄\n`;
        response += `• **SMILES**: CC(=O)OC1=CC=CC=C1C(=O)O\n`;
        response += `• **Molecular Weight**: 180.16 g/mol\n\n`;
        response += `Aspirin is a widely used medication for:\n`;
        response += `- Pain relief (analgesic)\n`;
        response += `- Fever reduction (antipyretic)\n`;
        response += `- Anti-inflammatory effects\n`;
        response += `- Blood clot prevention (antiplatelet)\n\n`;
        response += `Would you like me to draw the structure or find similar compounds?`;
      } else if (userContent.toLowerCase().includes("similar")) {
        response = `To find similar compounds, I would typically:\n\n`;
        response += `1. **Analyze the core structure** of your molecule\n`;
        response += `2. **Search databases** like PubChem, ChEMBL, or ZINC\n`;
        response += `3. **Calculate similarity scores** using fingerprints like Morgan/ECFP\n\n`;
        response += `Please draw a molecule using the "Draw Molecule" option, and I'll help you find structurally similar compounds!`;
      } else {
        response = `I'm here to help you with molecular searches and chemistry questions!\n\n`;
        response += `You can:\n`;
        response += `• **Ask about specific molecules** (e.g., "What is aspirin?")\n`;
        response += `• **Draw a molecular structure** using the pencil icon\n`;
        response += `• **Search for compounds** by name, SMILES, or properties\n`;
        response += `• **Find similar molecules** to a given structure\n\n`;
        response += `What would you like to explore?`;
      }

      // Stream the response character by character with some grouping
      const words = response.split(" ");
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? " " : "");
        sendChunk(word);
        // Simulate typing delay
        await new Promise((resolve) =>
          setTimeout(resolve, 30 + Math.random() * 50)
        );
      }

      // Send completion signal
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
