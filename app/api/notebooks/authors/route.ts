import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Returns distinct author names for the filter dropdown.
 * Falls back to mock data in development.
 */
export async function GET() {
  try {
    const backendRes = await fetch(`${BACKEND_URL}/notebooks/authors`, {
      headers: { "Content-Type": "application/json" },
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }

    // Fallback mock
    return NextResponse.json({
      authors: [
        "Dr. Sarah Chen",
        "Prof. James Miller",
        "Dr. Ayumi Tanaka",
        "Dr. Rajesh Patel",
      ],
    });
  } catch {
    return NextResponse.json({
      authors: [
        "Dr. Sarah Chen",
        "Prof. James Miller",
        "Dr. Ayumi Tanaka",
        "Dr. Rajesh Patel",
      ],
    });
  }
}
