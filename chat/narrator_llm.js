/**
 * LLM phrasing for FIX chat responses
 * Generates human-readable text without exposing raw FIX
 */

import 'dotenv/config';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: parseInt(process.env.OPENAI_TIMEOUT_MS || '8000'),
});

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

/**
 * Generate human-readable narration for FIX engine results
 * @param {Object} context - Context object with intent, toolResult, validation, fields
 * @returns {Promise<Object>} { text: string }
 */
export async function narrate(context) {
    try {
        // Sanitize context to remove raw FIX
        const sanitizedContext = {
            intent: context.intent,
            toolResult: sanitizeToolResult(context.toolResult),
            validation: context.validation,
            fields: context.fields
        };

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: NARRATOR_PROMPT },
                { role: 'user', content: JSON.stringify(sanitizedContext) }
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
        return { text: parsed.text || 'Response generated successfully.' };

    } catch (error) {
        console.error('Narrator error:', error.message);
        return { text: generateFallbackText(context) };
    }
}

/**
 * Sanitize tool result to remove raw FIX strings
 * @param {Object} toolResult - Raw tool result
 * @returns {Object} Sanitized result
 */
function sanitizeToolResult(toolResult) {
    if (!toolResult) return {};
    
    const sanitized = { ...toolResult };
    
    // Remove raw FIX strings
    if (sanitized.raw_fix) {
        sanitized.raw_fix = '[FIX_MESSAGE]';
    }
    
    // Summarize validation results
    if (sanitized.valid !== undefined) {
        sanitized.validation_status = sanitized.valid ? 'valid' : 'invalid';
        delete sanitized.raw_fix; // Remove any remaining FIX content
    }
    
    return sanitized;
}

/**
 * Generate fallback text when LLM fails
 * @param {Object} context - Context object
 * @returns {string} Fallback text
 */
function generateFallbackText(context) {
    switch (context.intent) {
        case 'build':
            if (context.toolResult?.type === 'built') {
                return 'Order built and validated successfully.';
            } else if (context.toolResult?.type === 'need_info') {
                return `Please provide: ${context.toolResult.prompt}`;
            } else if (context.toolResult?.type === 'confirm') {
                return 'Please confirm the order details above.';
            }
            break;
            
        case 'parse':
            if (context.toolResult?.type === 'parsed') {
                return 'FIX message parsed successfully.';
            }
            break;
            
        case 'validate':
            if (context.toolResult?.type === 'validation') {
                return context.toolResult.valid ? 'Message is valid.' : 'Message has validation errors.';
            }
            break;
            
        case 'explain':
            if (context.toolResult?.type === 'explanation') {
                return 'Message explained successfully.';
            }
            break;
            
        case 'lookup':
            if (context.toolResult?.type === 'lookup') {
                return `Field ${context.toolResult.tag}: ${context.toolResult.name}`;
            }
            break;
    }
    
    return 'Operation completed.';
}
