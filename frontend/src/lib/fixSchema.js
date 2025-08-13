const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function fetchNosSchema(version) {
  const r = await fetch(`${API_BASE}/schema/${version}/D`);
  if (!r.ok) throw new Error(`schema ${version}/D ${r.status}`);
  return r.json();
}

// Compute currently-required tags based on simple conditionals in schema
export function requiredNow(schema, tagValues) {
  const base = new Set(schema?.required || []);
  for (const c of schema?.conditionals || []) {
    const [k, v] = Object.entries(c.if)[0] || [];
    if (k && tagValues[k] === v) {
      for (const t of c.thenRequired || []) base.add(t);
    }
  }
  return [...base];
}
