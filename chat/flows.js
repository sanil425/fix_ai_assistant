/**
 * Flow orchestration for FIX chat commands
 * Coordinates API calls based on user intent
 */

import { fixBuild, fixParse, fixValidate, fixExplain, fixLookup } from './tools.js';
import { extractNOS } from './slots.js';
import { getSession, setSession, clearSession } from './session.js';
import { makeConfirm, applyUserEdits, isAffirmative, isCancel } from './confirm.js';

/**
 * Run build flow for NewOrderSingle
 * @param {string} utterance - Natural language input
 * @returns {Promise<Object>} Result object
 */
async function runBuildFlow(utterance) {
    try {
        const { fields, missing } = extractNOS(utterance);
        
        if (missing.length > 0) {
            const prompts = {
                '54': 'side (buy/sell)',
                '38': 'quantity',
                '55': 'symbol (e.g., AAPL)',
                '40': 'order type (limit/market)',
                '44': 'price (required for limit orders)'
            };
            
            const missingInfo = missing.map(tag => prompts[tag] || `tag ${tag}`).join(', ');
            return {
                type: 'need_info',
                missing,
                prompt: `Please provide: ${missingInfo}`
            };
        }
        
        // Build the FIX message
        const buildResult = await fixBuild(fields);
        const rawFix = buildResult.raw_fix;
        
        // Validate the built message
        const validateResult = await fixValidate(rawFix);
        
        return {
            type: 'built',
            raw_fix: rawFix,
            valid: validateResult.ok,
            errors: validateResult.errors || []
        };
        
    } catch (error) {
        return {
            type: 'error',
            error: error.message
        };
    }
}

/**
 * Run parse flow for FIX messages
 * @param {string} raw - Raw FIX message
 * @returns {Promise<Object>} Result object
 */
async function runParseFlow(raw) {
    try {
        const parseResult = await fixParse(raw);
        
        // If it's an execution report, also explain it
        let explanation = null;
        if (parseResult.meta?.msgType === '8') {
            try {
                const explainResult = await fixExplain(raw);
                explanation = explainResult.explanation;
            } catch (e) {
                // Ignore explain errors, just parse
            }
        }
        
        return {
            type: 'parsed',
            fields: parseResult.fields,
            meta: parseResult.meta,
            explanation
        };
        
    } catch (error) {
        return {
            type: 'error',
            error: error.message
        };
    }
}

/**
 * Run explain flow for FIX messages
 * @param {string} raw - Raw FIX message
 * @returns {Promise<Object>} Result object
 */
async function runExplainFlow(raw) {
    try {
        const explainResult = await fixExplain(raw);
        
        return {
            type: 'explanation',
            explanation: explainResult.explanation
        };
        
    } catch (error) {
        return {
            type: 'error',
            error: error.message
        };
    }
}

/**
 * Run validate flow for FIX messages
 * @param {string} raw - Raw FIX message
 * @returns {Promise<Object>} Result object
 */
async function runValidateFlow(raw) {
    try {
        const validateResult = await fixValidate(raw);
        
        return {
            type: 'validation',
            valid: validateResult.ok,
            errors: validateResult.errors || []
        };
        
    } catch (error) {
        return {
            type: 'error',
            error: error.message
        };
    }
}

/**
 * Run lookup flow for FIX fields
 * @param {string} tag - FIX tag number
 * @returns {Promise<Object>} Result object
 */
async function runLookupFlow(tag) {
    try {
        const lookupResult = await fixLookup(tag);
        
        return {
            type: 'lookup',
            ...lookupResult
        };
        
    } catch (error) {
        return {
            type: 'error',
            error: error.message
        };
    }
}

/**
 * Run build flow with confirmation loop
 * @param {string} sessionId - Session identifier
 * @param {string} utterance - Natural language input
 * @returns {Promise<Object>} Result object
 */
async function runBuildFlowWithConfirm(sessionId, utterance) {
    try {
        const session = getSession(sessionId);
        
        // If no pending order in session, start new order
        if (!session || session.stage !== 'confirm') {
            // Only extract NOS if this looks like a build command
            if (!utterance.toLowerCase().match(/^(yes|y|ok|okay|confirm|proceed|go|build|submit|cancel|stop|no|n|abort|quit|exit)$/)) {
            const { fields, missing } = extractNOS(utterance);
            
            if (missing.length > 0) {
                const prompts = {
                    '54': 'side (buy/sell)',
                    '38': 'quantity',
                    '55': 'symbol (e.g., AAPL)',
                    '40': 'order type (limit/market)',
                    '44': 'price (required for limit orders)'
                };
                
                const missingInfo = missing.map(tag => prompts[tag] || `tag ${tag}`).join(', ');
                return {
                    type: 'need_info',
                    missing,
                    prompt: `Please provide: ${missingInfo}`
                };
            }
            
                // Save confirmation stage in session
                setSession(sessionId, { stage: 'confirm', fields });
                return makeConfirm(fields);
            }
            
            // If it's a confirmation word but no session, return error
            return {
                type: 'error',
                error: 'No pending order to confirm. Please start building an order first.'
            };
        }
        
        // Session has pending confirmation, handle user input
        const { fields, changed } = applyUserEdits(session.fields, utterance);
        
        // Update session with any changes
        if (changed.length > 0) {
            setSession(sessionId, { stage: 'confirm', fields });
        }
        
        // Check for confirmation or cancellation
        if (isAffirmative(utterance)) {
            // User confirmed, proceed with build
            const buildResult = await fixBuild(fields);
            const rawFix = buildResult.raw_fix;
            
            // Validate the built message
            const validateResult = await fixValidate(rawFix);
            
            // Clear session
            clearSession(sessionId);
            
            return {
                type: 'built',
                raw_fix: rawFix,
                valid: validateResult.ok,
                errors: validateResult.errors || []
            };
        }
        
        if (isCancel(utterance)) {
            // User cancelled, clear session
            clearSession(sessionId);
            return { type: 'cancelled' };
        }
        
        // User made edits or other input, re-confirm
        return makeConfirm(fields);
        
    } catch (error) {
        return {
            type: 'error',
            error: error.message
        };
    }
}

// Export LLM mode for configuration
export const LLM_MODE = process.env.LLM_MODE || 'always';

export {
    runBuildFlow,
    runParseFlow,
    runExplainFlow,
    runValidateFlow,
    runLookupFlow,
    runBuildFlowWithConfirm
};
