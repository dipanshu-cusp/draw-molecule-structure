import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

/**
 * Proxies PDF documents from GCS into the in-app viewer.
 *
 * Why a proxy?
 *  - `storage.cloud.google.com` sets X-Frame-Options that block iframe embedding.
 *  - The JSON API (`storage.googleapis.com`) requires an access token.
 *  - This proxy uses Application Default Credentials (ADC) so it works both
 *    locally (with `gcloud auth application-default login`) and on Cloud Run
 *    (via the attached service account).
 *
 * Usage:
 *   /api/pdf-proxy?url=gs://bucket/path/to/file.pdf
 *   /api/pdf-proxy?url=https://storage.cloud.google.com/bucket/path/to/file.pdf
 */

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
});

/**
 * Convert any supported URL format to the GCS JSON API URL and extract
 * bucket + object path for authenticated download.
 *
 *  gs://bucket/object
 *  https://storage.cloud.google.com/bucket/object
 *  https://storage.googleapis.com/bucket/object
 */
function toGcsApiUrl(raw: string): { apiUrl: string; isGcs: boolean } {
  let bucket: string;
  let object: string;

  if (raw.startsWith("gs://")) {
    const withoutScheme = raw.slice(5); // bucket/object
    const slashIdx = withoutScheme.indexOf("/");
    bucket = withoutScheme.slice(0, slashIdx);
    object = withoutScheme.slice(slashIdx + 1);
  } else if (
    raw.includes("storage.cloud.google.com") ||
    raw.includes("storage.googleapis.com")
  ) {
    const parsed = new URL(raw);
    // pathname = /bucket/object/path
    const parts = parsed.pathname.replace(/^\//, "").split("/");
    bucket = parts[0];
    object = parts.slice(1).join("/");
  } else {
    // Not a GCS URL – return as-is (will be fetched without auth)
    return { apiUrl: raw, isGcs: false };
  }

  // JSON API download endpoint
  const apiUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
    bucket
  )}/o/${encodeURIComponent(object)}?alt=media`;

  return { apiUrl, isGcs: true };
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 }
    );
  }

  try {
    const { apiUrl, isGcs } = toGcsApiUrl(url);

    // Build headers – add bearer token for GCS URLs
    const headers: Record<string, string> = {};
    if (isGcs) {
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      if (tokenResponse.token) {
        headers["Authorization"] = `Bearer ${tokenResponse.token}`;
      }
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(
        `PDF proxy: upstream returned ${response.status}`,
        errText.slice(0, 300)
      );
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType =
      response.headers.get("content-type") || "application/pdf";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch the PDF document" },
      { status: 502 }
    );
  }
}
