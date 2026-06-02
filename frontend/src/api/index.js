// Grab the Render URL from Vercel's environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Upload PDF files. Returns { collectionName, chunksProcessed }.
 * Calls onProgress(message: string) during processing steps.
 */
export async function uploadPDFs(files, onProgress) {
  onProgress("Uploading files to server...");
  const formData = new FormData();
  for (const file of files) formData.append("pdfs", file);

  // FIXED: Now uses API_BASE_URL so it goes to Render instead of Vercel
  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: formData
  });

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
export const streamChat = async (question, collectionName, onToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, collectionName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop();

      for (const part of parts) {
        if (part.trim() === "") continue;

        if (part.startsWith("data: ")) {
          const dataStr = part.replace("data: ", "").trim();

          if (dataStr === "[DONE]") return;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.delta) {
              onToken(parsed.delta);
            }
          } catch (e) {
            console.error("Failed to parse complete stream chunk:", dataStr);
          }
        }
      }
    }
  } catch (error) {
    console.error("Stream Chat Error:", error);
    throw error;
  }
};