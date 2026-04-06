export interface ApiResponseError {
  code?: string;
  message?: string;
  requestId?: string;
}

export interface ApiErrorPayload {
  success?: boolean;
  message?: string;
  error?: ApiResponseError;
}

export function formatApiError(
  data: ApiErrorPayload | null | undefined,
  fallbackMessage: string,
  status: number
): string {
  const code = data?.error?.code || `HTTP_${status}`;
  const message =
    data?.error?.message || data?.message || `${fallbackMessage} (HTTP ${status})`;
  const requestId = data?.error?.requestId;

  return requestId
    ? `${code}: ${message} (Ref: ${requestId})`
    : `${code}: ${message}`;
}

export async function readApiError(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const data = (await response.json()) as ApiErrorPayload;
    return formatApiError(data, fallbackMessage, response.status);
  } catch {
    return `${fallbackMessage} (HTTP ${response.status})`;
  }
}
