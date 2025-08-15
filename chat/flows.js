/**
 * Flow orchestration for FIX chat commands
 * Coordinates API calls based on user intent
 */

import { fixBuild, fixParse, fixValidate, fixExplain, fixLookup } from './tools.js';
import { extractNOS } from './slots.js';

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

export {
    runBuildFlow,
    runParseFlow,
    runExplainFlow,
    runValidateFlow,
    runLookupFlow
};
