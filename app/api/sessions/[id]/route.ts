import { NextRequest, NextResponse } from "next/server";
import { getSessionWithAnswers, deleteSession } from "@/app/lib/vertex-ai";

// Environment variable to toggle between mock and real Vertex AI
const USE_VERTEX_AI = process.env.USE_VERTEX_AI === "true";

/**
 * GET /api/sessions/[id] - Get a specific session with full conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (USE_VERTEX_AI) {
      const session = await getSessionWithAnswers(sessionId);

      // Transform to a cleaner format with messages
      const messages = (session.turns || []).flatMap((turn, index) => {
        const result = [];

        if (turn.query?.text) {
          result.push({
            id: `${sessionId}-q-${index}`,
            role: "user" as const,
            content: turn.query.text,
          });
        }

        // Use answerText (fetched content) instead of answer (resource path)
        const answerContent = turn.answerText || turn.answer;
        if (answerContent && !answerContent.startsWith("projects/")) {
          result.push({
            id: `${sessionId}-a-${index}`,
            role: "assistant" as const,
            content: answerContent,
          });
        }

        return result;
      });

      return NextResponse.json({
        id: sessionId,
        name: session.name,
        displayName:
          session.displayName ||
          session.turns?.[0]?.query?.text ||
          "Untitled Chat",
        startTime: session.startTime,
        endTime: session.endTime,
        isPinned: session.isPinned,
        messages,
      });
    } else {
      // Mock response for development
      const mockMessages = [
        {
          id: `${sessionId}-q-0`,
          role: "user" as const,
          content: "What is aspirin?",
        },
        {
          id: `${sessionId}-a-0`,
          role: "assistant" as const,
          content:
            "Aspirin (acetylsalicylic acid) is a medication used to reduce pain, fever, or inflammation. It is a nonsteroidal anti-inflammatory drug (NSAID) that works by inhibiting cyclooxygenase enzymes.",
        },
        {
          id: `${sessionId}-q-1`,
          role: "user" as const,
          content: "What is its molecular structure?",
        },
        {
          id: `${sessionId}-a-1`,
          role: "assistant" as const,
          content:
            "Aspirin has the molecular formula C₉H₈O₄. It consists of a benzene ring with a carboxylic acid group and an acetyl ester group attached. The SMILES notation is: CC(=O)OC1=CC=CC=C1C(=O)O",
        },
      ];

      return NextResponse.json({
        id: sessionId,
        displayName: "What is aspirin?",
        startTime: new Date(Date.now() - 3600000).toISOString(),
        messages: mockMessages,
      });
    }
  } catch (error) {
    console.error("Error getting session:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get session";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/sessions/[id] - Delete a specific session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (USE_VERTEX_AI) {
      await deleteSession(sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete session";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
