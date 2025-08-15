/**
 * LLM intent & arg extractor for FIX chat
 * Routes user utterances through OpenAI with strict JSON output
 */

import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: parseInt(process.env.OPENAI_TIMEOUT_MS || '8000'),
});

const SYSTEM_PROMPT = `FIX Chat Router — Strict JSON Only

Mission:
You classify the user's message and return only strict JSON {intent, args, reply_style}.
You do not generate FIX. The FIX engine builds/validates; you only propose structured arguments.

Output Schema (the only valid output):
{
  "intent": "build|parse|validate|explain|lookup|chitchat",
  "args": {},
  "reply_style": "confirm|final|ask_clarify"
}

No extra keys. No prose. Temperature 0 behavior.

Intent Definitions & Arg Contracts:

build: user wants to create/replace/cancel an order.
args.fields MUST be an object of FIX tags as strings (e.g., "35":"D"). Allowed keys for MVP:
35 (MsgType: D=NewOrderSingle, F=Cancel, G=Replace) — default D if order build is implied
11 ClOrdID (optional; omit if not stated)
55 Symbol (uppercase)
54 Side (1=Buy, 2=Sell)
38 OrderQty
40 OrdType (1=Market, 2=Limit)
44 Price (required if 40=2)
60 TransactTime (omit; engine fills)

If price is needed and missing → do not guess; put "reply_style":"ask_clarify" and include "args.missing":["44"].
Never output 8/9/10.

parse: user pasted a FIX string. args must contain { "raw_fix": "<as provided>" }.
validate: same as parse but intent explicitly "validate/check/is this valid".
explain: same as parse but intent explicitly "explain/what does this mean".
lookup: when user asks about a tag (e.g., "what is tag 38"). args must contain { "tag": "38" } (string).
chitchat: small talk or off-topic; return { "intent":"chitchat","args":{},"reply_style":"final" }.

Normalization Rules (for build intent):
Side: "buy/long" → 54=1; "sell/sell short" → 54=2.
OrdType: "market" → 40=1; "limit/at x" → 40=2 and require 44.
Uppercase symbols (AAPL, TSLA, MSFT). Keep quantities/prices as simple strings ("187.5").
Do not fabricate 11 if user didn't provide one.
If user mentions cancel/replace, choose 35=F (Cancel) or 35=G (Replace) and include any obvious keys (11, 41 if referenced), else ask to clarify.

Delimiter/FIX Handling:
Never emit raw FIX.
If the user pasted FIX, treat it as input for parse/validate/explain and copy it untouched into args.raw_fix.

Reply Style Guidance:
confirm: when you think you have enough fields to propose an order (but engine will still confirm).
ask_clarify: when required fields are missing/ambiguous (e.g., missing price on limit).
final: when responding to parse/validate/explain/lookup/chitchat.

Examples (Model MUST learn these patterns):
"buy 100 aapl limit at 187.5 id t1" →
{"intent":"build","args":{"fields":{"35":"D","11":"t1","55":"AAPL","54":"1","38":"100","40":"2","44":"187.5"}},"reply_style":"confirm"}

"can you explain 8=FIX.4.4|…|35=8|…|10=…" →
{"intent":"explain","args":{"raw_fix":"8=FIX.4.4|…"},"reply_style":"final"}

"is this valid: 8=FIX.4.4|…|35=D|…|10=…" →
{"intent":"validate","args":{"raw_fix":"8=FIX.4.4|…"},"reply_style":"final"}

"what is tag 38" →
{"intent":"lookup","args":{"tag":"38"},"reply_style":"final"}

"build a limit buy 100 AAPL" (no price) →
{"intent":"build","args":{"fields":{"35":"D","55":"AAPL","54":"1","38":"100","40":"2"},"missing":["44"]},"reply_style":"ask_clarify"}

Safety & Determinism:
Temperature 0. No creative paraphrasing. Only schema JSON.
If uncertain → choose ask_clarify.
Do not invent tags or values. Never output FIX.
If you cannot comply:
Return: {"intent":"unknown","args":{},"reply_style":"ask_clarify"}.`;

/**
 * Route user utterance through LLM to extract intent and arguments
 * @param {string} utterance - User input text
 * @returns {Promise<Object>} Structured intent and args
 */
export async function route(utterance) {
    try {
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: utterance }
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
            timeout: parseInt(process.env.OPENAI_TIMEOUT_MS || '8000'),
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
            throw new Error('No response from OpenAI');
        }

        const parsed = JSON.parse(response);
        
        // Validate required fields
        if (!parsed.intent || !parsed.args || !parsed.reply_style) {
            throw new Error('Invalid response format from OpenAI');
        }

        return parsed;

    } catch (error) {
        console.error('LLM routing error:', error.message);
        return {
            intent: 'unknown',
            args: {},
            reply_style: 'ask_clarify'
        };
    }
}
