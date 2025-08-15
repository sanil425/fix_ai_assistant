/**
 * Chat client for communicating with the Express chat service
 * Handles session management and API communication
 */

export async function sendChat({ message, next }) {
  const base = import.meta.env.VITE_CHAT_BASE || "http://localhost:8787";

  // Persist / reuse session
  let session_id = localStorage.getItem("session_id");
  if (!session_id) {
    session_id = crypto.randomUUID();
    localStorage.setItem("session_id", session_id);
  }

  const headers = { "Content-Type": "application/json" };
  const bearer = import.meta.env.VITE_FIX_API_TOKEN?.trim();
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;

  const body = { session_id, message };
  if (next) body.next = next;

  const res = await fetch(`${base}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || "chat error";
    throw new Error(msg);
  }
  return data;
}
