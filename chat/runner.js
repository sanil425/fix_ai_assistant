#!/usr/bin/env node

/**
 * Simple CLI smoke driver for FIX chat
 * Routes user input via detectIntent() and executes appropriate flow
 */

import { detectIntent } from './intent.js';
import {
    runBuildFlow,
    runParseFlow,
    runExplainFlow,
    runValidateFlow,
    runLookupFlow
} from './flows.js';

/**
 * Extract tag number from lookup input
 * @param {string} input - User input
 * @returns {string|null} Tag number or null
 */
function extractTag(input) {
    const match = input.match(/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Main runner function
 * @param {string} input - User input string
 */
async function run(input) {
    if (!input || input.trim() === '') {
        console.error('Usage: node chat/runner.js "<utterance>"');
        process.exit(1);
    }
    
    try {
        const intent = detectIntent(input);
        
        switch (intent) {
            case 'build':
                const buildResult = await runBuildFlow(input);
                console.log(JSON.stringify(buildResult, null, 2));
                break;
                
            case 'parse':
                const parseResult = await runParseFlow(input);
                console.log(JSON.stringify(parseResult, null, 2));
                break;
                
            case 'explain':
                const explainResult = await runExplainFlow(input);
                console.log(JSON.stringify(explainResult, null, 2));
                break;
                
            case 'validate':
                const validateResult = await runValidateFlow(input);
                console.log(JSON.stringify(validateResult, null, 2));
                break;
                
            case 'lookup':
                const tag = extractTag(input);
                if (!tag) {
                    console.log(JSON.stringify({
                        type: 'error',
                        error: 'No tag number found in input'
                    }, null, 2));
                    break;
                }
                const lookupResult = await runLookupFlow(tag);
                console.log(JSON.stringify(lookupResult, null, 2));
                break;
                
            case 'unknown':
            default:
                console.log(JSON.stringify({
                    type: 'unknown',
                    message: 'Could not determine intent. Try: build, parse, explain, validate, or lookup commands.'
                }, null, 2));
                break;
        }
        
    } catch (error) {
        console.error(JSON.stringify({
            type: 'error',
            error: error.message
        }, null, 2));
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const input = process.argv[2];
    run(input);
}

export { run };
