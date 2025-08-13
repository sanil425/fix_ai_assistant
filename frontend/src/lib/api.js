
// src/lib/api.js
export async function askAI({ userPrompt, fixVersion = "4.4", draftFix = null }) {
  const base = import.meta.env?.VITE_API_BASE || "http://localhost:8000";
  const url = `${base.replace(/\/$/, "")}/api/ask`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_prompt: userPrompt,
      fix_version: fixVersion,
      draft_fix: draftFix,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Ask failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

// Legacy function - now calls FastAPI instead of old Express backend
export async function askBackend({ query, version }) {
  try {
    return await askAI({ userPrompt: query, fixVersion: version });
  } catch (e) {
    console.warn("[askBackend] FastAPI call failed:", e?.message || e);
    return null; // triggers UI fallback
  }
}

// Dev helper callable from console
if (typeof window !== "undefined") {
  window.FIX_TEST_ASK = async (q = "ping", v = "4.4") => {
    const res = await askBackend({ query: q, version: v });
    console.log("[FIX_TEST_ASK]", res);
    return res;
  };
}
