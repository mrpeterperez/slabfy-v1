// Centralized dependency management for all Supabase Edge Functions
// This prevents individual functions from breaking when Deno versions change

// HTTP Server - locked to working version
export { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// CORS utilities
// Configurable CORS helper: reflects whitelisted Origin or blocks
const allowedOrigins = (Deno.env.get("CORS_ORIGINS")?.split(",").map(s => s.trim()).filter(Boolean) ?? [
  "https://slabfy.com",
  "https://www.slabfy.com",
  "https://slabfy.replit.app",
]);

export function getCorsHeaders(origin?: string) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

// Common response helper
export function jsonResponse(body: unknown, status = 200, origin?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
  ...getCorsHeaders(origin),
    },
  });
}