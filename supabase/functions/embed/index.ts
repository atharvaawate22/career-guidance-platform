// gte-small (384-dim) embedding endpoint, called by the backend at RAG
// ingestion time (batched) and at chatbot request time (single query). Runs
// on Supabase's built-in Supabase.ai inference session so no external
// embedding vendor/API key is needed, and no load lands on the Render box.
// See CHATBOT_ARCHITECTURE.md §3.3/§3.5.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODEL = "gte-small";

/**
 * verify_jwt only guarantees the Authorization header carries a validly
 * signed project JWT — it does not distinguish the anon role from
 * service_role (both are legacy JWTs signed with the same project secret).
 * This endpoint is backend-only, so check the role claim explicitly rather
 * than relying on verify_jwt alone to keep it service_role-only.
 */
function isServiceRoleJwt(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length);
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const payload = JSON.parse(atob(padded + pad));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isServiceRoleJwt(req.headers.get("Authorization"))) {
    return new Response(JSON.stringify({ error: "service_role required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { text?: string; texts?: string[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const inputs = body.texts ?? (body.text != null ? [body.text] : null);
  if (
    !inputs ||
    inputs.length === 0 ||
    inputs.some((t) => typeof t !== "string" || t.trim() === "")
  ) {
    return new Response(
      JSON.stringify({
        error: "provide a non-empty `text` string or `texts` string array",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // @ts-ignore Supabase-provided global in the Edge Functions runtime.
  const session = new Supabase.ai.Session(MODEL);

  try {
    const embeddings = await Promise.all(
      inputs.map((text: string) =>
        session.run(text, { mean_pool: true, normalize: true }),
      ),
    );
    return new Response(
      JSON.stringify(
        body.texts ? { embeddings } : { embedding: embeddings[0] },
      ),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "embedding inference failed",
        detail: String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
