const BASE = "/api";

/**
 * Upload PDF files. Returns { collectionName, chunksProcessed }.
 * Calls onProgress(message: string) during processing steps.
 */
export async function uploadPDFs(files, onProgress) {
  onProgress("Uploading files to server...");
  const formData = new FormData();
  for (const file of files) formData.append("pdfs", file);

  const res = await fetch(`${BASE}/upload`, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }
  onProgress("Embedding complete!");
  return res.json();
}

/**
 * Stream a chat response. Calls onChunk(delta: string) for each token,
 * resolves with the full answer string when done.
 */
export async function streamChat(question, collectionName, onChunk) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, collectionName }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Chat failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") break;
      try {
        const { delta } = JSON.parse(payload);
        full += delta;
        onChunk(delta);
      } catch {
        // ignore parse errors
      }
    }
  }

  return full;
}
