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
    runLookupFlow,
    runBuildFlowWithConfirm
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
 * Parse command line arguments
 * @returns {Object} { sessionId, input }
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let sessionId = 'local';
    let input = '';
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--session' && i + 1 < args.length) {
            sessionId = args[i + 1];
            i++; // Skip the session value
        } else if (!input) {
            input = args[i];
        }
    }
    
    return { sessionId, input };
}

/**
 * Main runner function
 * @param {string} sessionId - Session identifier
 * @param {string} input - User input string
 */
async function run(sessionId, input) {
    if (!input || input.trim() === '') {
        console.error('Usage: node chat/runner.js [--session <id>] "<utterance>"');
        console.error('Examples:');
        console.error('  node chat/runner.js "build a limit buy 100 AAPL at 187.5"');
        console.error('  node chat/runner.js --session x "yes"');
        console.error('  node chat/runner.js --session y "price 187.5"');
        process.exit(1);
    }
    
    try {
        const intent = detectIntent(input);
        
        switch (intent) {
            case 'build':
                const buildResult = await runBuildFlowWithConfirm(sessionId, input);
                console.log(JSON.stringify(buildResult, null, 2));
                
                // Add instructions for confirmation if needed
                if (buildResult.type === 'confirm') {
                    console.log('\n--- Instructions ---');
                    console.log('To confirm: node chat/runner.js --session', sessionId, '"yes"');
                    console.log('To edit: node chat/runner.js --session', sessionId, '"price 187.5"');
                    console.log('To cancel: node chat/runner.js --session', sessionId, '"cancel"');
                    console.log('------------------');
                }
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
    const { sessionId, input } = parseArgs();
    run(sessionId, input);
}

export { run };
