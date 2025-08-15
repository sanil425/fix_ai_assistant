// server/boot/env.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const cwd = process.cwd();
const files = [
  path.join(cwd, "server/.env"),          // non-secret, safe defaults
  path.join(cwd, "server/.env.local"),    // optional local overrides
  path.join(cwd, "server/.env.secrets"),  // secrets, override previous
  path.join(cwd, ".env"),                 // fallback from repo root
  path.join(cwd, ".env.local"),
  path.join(cwd, ".env.secrets"),
];

export const loadedEnvFiles = [];
for (const f of files) {
  if (fs.existsSync(f)) {
    dotenv.config({ path: f, override: true });
    loadedEnvFiles.push(f);
  }
}

export function readEnv(name) {
  let v = process.env[name];
  if (typeof v !== "string") return "";
  // trim and strip accidental surrounding quotes
  v = v.trim().replace(/^"(.*)"$/, "$1");
  return v;
}

export function mask(v) {
  if (!v) return "";
  const s = String(v);
  return s.length <= 10 ? "********" : `${s.slice(0,4)}…${s.slice(-4)}`;
}

export function isSingleLine(v) {
  return !!v && !/[\r\n]/.test(v);
}
