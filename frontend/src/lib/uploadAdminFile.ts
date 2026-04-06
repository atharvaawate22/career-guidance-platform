import { API_BASE_URL } from "@/lib/apiBaseUrl";

export async function uploadFile(
  file: File,
  bucket: string,
  adminWriteFetch: (url: string, init?: RequestInit) => Promise<Response>
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      "Only PDF and Word documents (.pdf, .doc, .docx) are allowed"
    );
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("File size must be under 20 MB");
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const response = await adminWriteFetch(
    `${API_BASE_URL}/api/admin/upload?bucket=${encodeURIComponent(bucket)}&filename=${encodeURIComponent(filename)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-file-content-type": file.type || "application/octet-stream",
      },
      body: file,
    }
  );

  // Gracefully handle non-JSON responses (e.g. HTML 404/502 from server)
  const text = await response.text();
  let data: {
    success: boolean;
    data?: { url: string };
    error?: { message?: string };
  };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error(
      `Upload failed (${response.status}): server returned an unexpected response. ` +
        `Check that the backend is deployed and SUPABASE_SERVICE_ROLE_KEY is set correctly on Render.`
    );
  }

  if (!data.success) throw new Error(data.error?.message || "Upload failed");
  return data.data!.url;
}
