import { NextRequest } from "next/server";
import { proxyGet } from "@/lib/edgeProxy";

// Edge-cached proxy for a public, read-only endpoint. The function runs only on
// a cache miss; the cache lifetime comes from the backend's own Cache-Control.
// See lib/edgeProxy.ts and the PROXIED_GET_ROUTES map in lib/api.ts.
export async function GET(req: NextRequest) {
  return proxyGet(req, "/api/v1/bookings/slots");
}
