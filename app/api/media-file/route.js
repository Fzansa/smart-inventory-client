const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
const API_ORIGIN = new URL(API_BASE_URL).origin;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get("path");

  if (!rawPath) {
    return new Response("Missing media path", { status: 400 });
  }

  const cleanPath = rawPath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!cleanPath.startsWith("uploads/")) {
    return new Response("Invalid media path", { status: 400 });
  }

  const encodedPath = cleanPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const upstream = await fetch(`${API_ORIGIN}/${encodedPath}`, { cache: "no-store" });

  if (!upstream.ok) {
    return new Response("Media not found", { status: upstream.status });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=3600");

  return new Response(upstream.body, { status: 200, headers });
}
