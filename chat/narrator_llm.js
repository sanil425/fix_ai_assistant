/**
 * LLM phrasing for FIX chat responses
 * Generates human-readable text without exposing raw FIX
 */

import { llmSay } from '../server/llm/openai_client.js';
import { narrateFallback } from '../server/chat/narration_fallback.js';

const NARRATOR_PROMPT = `FIX Chat Narrator — Human-Friendly Responses

Mission:
You generate concise, helpful responses to FIX engine results. Never mention raw FIX strings.

Context includes:
- intent: what the user wanted to do
- toolResult: result from FIX engine (summarized, no raw FIX)
- validation: validation status and any errors
- fields: order fields (if applicable)

Rules:
- Keep responses under 120 words
- Be helpful and precise
- Never mention raw FIX strings
- Use simple, clear language
- If there are errors, explain them clearly
- For successful operations, confirm what was accomplished

Output only: {"text": "your response here"}`;

function makePrompt(payload) {
    // Keep your existing structure if you had one; minimal version:
    const { intent, result } = payload || {};
    return [
        "You are FIX assistant. Explain the result in clear, friendly English.",
        "If an order is incomplete, ask for the missing fields.",
        "If confirming, restate the order briefly and ask to reply 'yes' to build.",
        "Be concise. Include FIX tag numbers only when useful.",
        `INTENT: ${intent || "unknown"}`,
        `RESULT: ${JSON.stringify(result)}`,
    ].join("\n");
}

/**
 * Generate human-readable narration for FIX engine results
 * @param {Object} payload - Payload object with intent, result
 * @returns {Promise<Object>} { text: string }
 */
export async function narrate(payload) {
    const mode = (process.env.LLM_MODE || "fallback").toLowerCase();
    const prompt = makePrompt(payload);

    if (mode === "always") {
        try { 
            const response = await llmSay(prompt);
            return { text: response }; 
        } catch (error) { 
            console.error('LLM narration failed:', error.message);
            /* fall through to fallback */ 
        }
    } else if (mode === "fallback") {
        try { 
            const response = await llmSay(prompt);
            return { text: response }; 
        } catch (error) { 
            console.error('LLM narration failed:', error.message);
            /* fall through to fallback */ 
        }
    }
    
    return { text: narrateFallback(payload) };
}


