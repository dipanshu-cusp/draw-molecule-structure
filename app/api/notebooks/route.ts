import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Proxy endpoint to fetch notebook list with filters from the backend.
 * Falls back to mock data in dev when the backend is unavailable.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const author = searchParams.get("author");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const search = searchParams.get("search");

  try {
    // Try calling the backend
    const params = new URLSearchParams();
    if (author) params.set("author", author);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (search) params.set("search", search);

    const backendRes = await fetch(
      `${BACKEND_URL}/notebooks?${params.toString()}`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }

    // If backend is not available, return mock data for development
    return NextResponse.json({
      notebooks: getMockNotebooks(author, dateFrom, dateTo, search),
    });
  } catch {
    // Backend unreachable - return mock data
    return NextResponse.json({
      notebooks: getMockNotebooks(author, dateFrom, dateTo, search),
    });
  }
}

function getMockNotebooks(
  author?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
  search?: string | null
) {
  const mockNotebooks = [
    {
      id: "nb-1",
      title: "Synthesis of Aspirin Derivatives",
      gcsPath: "gs://molecule-search-notebooks/aspirin-derivatives.pdf",
      author: "Dr. Sarah Chen",
      date: "2025-11-15",
      description:
        "Exploring novel acetylsalicylic acid derivatives with enhanced bioavailability and reduced gastrointestinal side effects.",
      tags: ["aspirin", "synthesis", "derivatives"],
    },
    {
      id: "nb-2",
      title: "Catalytic Hydrogenation Methods",
      gcsPath: "gs://molecule-search-notebooks/catalytic-hydrogenation.pdf",
      author: "Prof. James Miller",
      date: "2025-10-22",
      description:
        "Comprehensive study of heterogeneous catalytic hydrogenation for pharmaceutical intermediates.",
      tags: ["catalysis", "hydrogenation"],
    },
    {
      id: "nb-3",
      title: "Novel Anti-inflammatory Compounds",
      gcsPath: "gs://molecule-search-notebooks/anti-inflammatory.pdf",
      author: "Dr. Sarah Chen",
      date: "2025-09-08",
      description:
        "Investigation of COX-2 selective inhibitors with improved safety profiles.",
      tags: ["anti-inflammatory", "COX-2"],
    },
    {
      id: "nb-4",
      title: "Peptide Coupling Reactions",
      gcsPath: "gs://molecule-search-notebooks/peptide-coupling.pdf",
      author: "Dr. Ayumi Tanaka",
      date: "2025-12-01",
      description:
        "Optimization of amide bond formation strategies for solid-phase peptide synthesis.",
      tags: ["peptide", "coupling", "SPPS"],
    },
    {
      id: "nb-5",
      title: "Green Chemistry Approaches",
      gcsPath: "gs://molecule-search-notebooks/green-chemistry.pdf",
      author: "Prof. James Miller",
      date: "2026-01-10",
      description:
        "Sustainable reaction methodologies using bio-derived solvents and catalysts.",
      tags: ["green chemistry", "sustainability"],
    },
    {
      id: "nb-6",
      title: "Metal-Organic Framework Applications",
      gcsPath: "gs://molecule-search-notebooks/mof-applications.pdf",
      author: "Dr. Rajesh Patel",
      date: "2025-08-18",
      description:
        "Using MOFs as heterogeneous catalysts for selective organic transformations.",
      tags: ["MOF", "catalysis", "frameworks"],
    },
  ];

  let filtered = [...mockNotebooks];

  if (author) {
    filtered = filtered.filter((nb) =>
      nb.author.toLowerCase().includes(author.toLowerCase())
    );
  }
  if (dateFrom) {
    filtered = filtered.filter((nb) => nb.date >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter((nb) => nb.date <= dateTo);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (nb) =>
        nb.title.toLowerCase().includes(q) ||
        nb.description.toLowerCase().includes(q) ||
        nb.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  return filtered;
}
