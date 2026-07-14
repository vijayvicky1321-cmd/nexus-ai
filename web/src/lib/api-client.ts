import { API_URL } from "@/lib/config";

export async function apiFetch(
  path: string,
  token: string | null,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

export async function readSSEStream(
  response: Response,
  onDelta: (text: string) => void
): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r\n\r\n|\n\n/);
    buffer = events.pop() ?? "";
    for (const evt of events) {
      const line = evt.split(/\r\n|\n/).find((l) => l.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed.delta === "string") onDelta(parsed.delta);
      } catch {
        // ignore malformed keep-alive frames
      }
    }
  }
}

// For endpoints whose SSE payloads carry a `type` discriminator (plan_ready,
// step_started, etc.) instead of the plain `{delta}` shape assumed above.
export async function readSSEStreamEvents(
  response: Response,
  onEvent: (payload: Record<string, unknown>) => void
): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r\n\r\n|\n\n/);
    buffer = events.pop() ?? "";
    for (const evt of events) {
      const line = evt.split(/\r\n|\n/).find((l) => l.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        onEvent(JSON.parse(data));
      } catch {
        // ignore malformed keep-alive frames
      }
    }
  }
}
