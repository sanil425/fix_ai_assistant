
const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:4000";

export async function askBackend({ query, version }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, version }),
      signal: controller.signal
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`status ${r.status}`);
    return await r.json(); // { answer, citations, used_version }
  } catch (e) {
    clearTimeout(t);
    console.warn("[askBackend] falling back:", e?.message || e);
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
