import { NextRequest } from "next/server";
import { proxyGet } from "@/lib/edgeProxy";

// Edge-cached proxy for the heavy cutoffs query. The function only runs on a
// cache miss; hits are served from Vercel's CDN. See lib/edgeProxy.ts.
export async function GET(req: NextRequest) {
  return proxyGet(req, "/api/v1/cutoffs");
}
