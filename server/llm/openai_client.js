// server/llm/openai_client.js
import OpenAI from "openai";
import { readEnv, isSingleLine } from "../boot/env.js";






export const MODEL = readEnv("OPENAI_MODEL") || "gpt-4o-mini";
export const API_KEY = readEnv("OPENAI_API_KEY");
export const keyStatus = (!API_KEY)
  ? { ok:false, reason:"missing" }
  : (!isSingleLine(API_KEY))
    ? { ok:false, reason:"multiline" }
    : (!API_KEY.startsWith("sk-"))
      ? { ok:false, reason:"bad_prefix" }
      : { ok:true };

export const openai = keyStatus.ok ? new OpenAI({ apiKey: API_KEY }) : null;

export async function llmSay(input) {
  if (!openai) throw new Error(`LLM not configured: ${keyStatus.reason || "unknown"}`);
  const r = await openai.responses.create({ model: MODEL, input });
  return r.output_text ?? JSON.stringify(r);
}


