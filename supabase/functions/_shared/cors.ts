// Shared CORS configuration for all Edge Functions
// Restricts Access-Control-Allow-Origin to known domains

const ALLOWED_ORIGINS = [
  "https://www.virtue-compliance.ch",
  "https://virtue-compliance.ch",
  "https://app.virtue-compliance.ch",
  "http://localhost:5173", // local dev
  "http://localhost:3000", // local dev alt
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

export function corsResponse(req: Request): Response {
  return new Response("ok", { headers: getCorsHeaders(req) });
}
