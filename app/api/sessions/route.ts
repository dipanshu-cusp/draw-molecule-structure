import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/app/lib/vertex-ai";

// Environment variable to toggle between mock and real Vertex AI
const USE_VERTEX_AI = process.env.USE_VERTEX_AI === "true";

/**
 * GET /api/sessions - List chat sessions for a user
 * Query params:
 *   - userPseudoId: Filter sessions by user ID
 *   - pageSize: Number of sessions to return (default 20)
 *   - pageToken: Token for pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userPseudoId = searchParams.get("userPseudoId") || undefined;
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const pageToken = searchParams.get("pageToken") || undefined;

    if (USE_VERTEX_AI) {
      const result = await listSessions({
        userPseudoId,
        pageSize,
        pageToken,
        orderBy: "update_time desc",
      });

      // Transform sessions to a cleaner format for the frontend
      const sessions = result.sessions.map((session) => ({
        id: session.name?.split("/sessions/")[1] || "",
        name: session.name,
        displayName:
          session.displayName ||
          session.turns?.[0]?.query?.text ||
          "Untitled Chat",
        startTime: session.startTime,
        endTime: session.endTime,
        isPinned: session.isPinned,
        turnCount: session.turns?.length || 0,
        // Include first query as preview
        preview: session.turns?.[0]?.query?.text?.slice(0, 100),
      }));

      return NextResponse.json({
        sessions,
        nextPageToken: result.nextPageToken,
      });
    } else {
      // Mock response for development
      const mockSessions = [
        {
          id: "mock-session-1",
          name: "projects/.../sessions/mock-session-1",
          displayName: "What is aspirin?",
          startTime: new Date(Date.now() - 3600000).toISOString(),
          turnCount: 3,
          preview: "What is aspirin?",
        },
        {
          id: "mock-session-2",
          name: "projects/.../sessions/mock-session-2",
          displayName: "Molecule synthesis",
          startTime: new Date(Date.now() - 86400000).toISOString(),
          turnCount: 5,
          preview: "How do I synthesize benzene?",
        },
        {
          id: "mock-session-3",
          name: "projects/.../sessions/mock-session-3",
          displayName: "Drug interactions",
          startTime: new Date(Date.now() - 172800000).toISOString(),
          turnCount: 2,
          preview: "What are the side effects of ibuprofen?",
        },
      ];

      return NextResponse.json({
        sessions: mockSessions,
        nextPageToken: undefined,
      });
    }
  } catch (error) {
    console.error("Error listing sessions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to list sessions";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
