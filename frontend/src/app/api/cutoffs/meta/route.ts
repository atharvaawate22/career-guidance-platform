import { NextRequest } from "next/server";
import { proxyGet } from "@/lib/edgeProxy";

// Edge-cached proxy for the cutoffs filter metadata (colleges/branches/cities).
export async function GET(req: NextRequest) {
  return proxyGet(req, "/api/v1/cutoffs/meta");
}
