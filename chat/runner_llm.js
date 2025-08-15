#!/usr/bin/env node

/**
 * LLM-powered CLI wrapper for FIX chat
 * Integrates LLM routing with existing flows
 */

import 'dotenv/config';
import { route } from './router_llm.js';
import { narrate } from './narrator_llm.js';
import {
    runBuildFlowWithConfirm,
    runParseFlow,
    runExplainFlow,
    runValidateFlow,
    runLookupFlow
} from './flows.js';

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
 * Main LLM runner function
 * @param {string} sessionId - Session identifier
 * @param {string} input - User input string
 */
async function run(sessionId, input) {
    if (!input || input.trim() === '') {
        console.error('Usage: node chat/runner_llm.js [--session <id>] "<utterance>"');
        console.error('Examples:');
        console.error('  node chat/runner_llm.js "buy 100 AAPL limit at 187.5"');
        console.error('  node chat/runner_llm.js --session x "yes"');
        console.error('  node chat/runner_llm.js "what is tag 38"');
        process.exit(1);
    }
    
    const llmMode = process.env.LLM_MODE || 'always';
    
    try {
        let intent, args, replyStyle, toolResult;
        
        // Route through LLM if enabled
        if (llmMode !== 'off') {
            console.log(`🔍 LLM Mode: ${llmMode}`);
            const llmResult = await route(input);
            intent = llmResult.intent;
            args = llmResult.args;
            replyStyle = llmResult.reply_style;
            
            console.log(`📋 LLM Intent: ${intent}, Style: ${replyStyle}`);
        } else {
            console.log('🔍 LLM Mode: off - using rule-based routing');
            // Fallback to rule-based routing
            intent = 'unknown';
            args = {};
            replyStyle = 'ask_clarify';
        }
        
        // Execute appropriate flow based on intent
        switch (intent) {
            case 'build':
                if (args.fields) {
                    // Use fields from LLM
                    const fields = args.fields;
                    if (args.missing && args.missing.length > 0) {
                        toolResult = {
                            type: 'need_info',
                            missing: args.missing,
                            prompt: `Please provide: ${args.missing.join(', ')}`
                        };
                    } else {
                        // Build with LLM-provided fields
                        const buildResult = await runBuildFlowWithConfirm(sessionId, JSON.stringify(fields));
                        toolResult = buildResult;
                    }
                } else {
                    // Fallback to rule-based extraction
                    toolResult = await runBuildFlowWithConfirm(sessionId, input);
                }
                break;
                
            case 'parse':
                if (args.raw_fix) {
                    toolResult = await runParseFlow(args.raw_fix);
                } else {
                    toolResult = await runParseFlow(input);
                }
                break;
                
            case 'explain':
                if (args.raw_fix) {
                    toolResult = await runExplainFlow(args.raw_fix);
                } else {
                    toolResult = await runExplainFlow(input);
                }
                break;
                
            case 'validate':
                if (args.raw_fix) {
                    toolResult = await runValidateFlow(args.raw_fix);
                } else {
                    toolResult = await runValidateFlow(input);
                }
                break;
                
            case 'lookup':
                if (args.tag) {
                    toolResult = await runLookupFlow(args.tag);
                } else {
                    // Extract tag from input
                    const tagMatch = input.match(/(\d+)/);
                    if (tagMatch) {
                        toolResult = await runLookupFlow(tagMatch[1]);
                    } else {
                        toolResult = {
                            type: 'error',
                            error: 'No tag number found in input'
                        };
                    }
                }
                break;
                
            case 'chitchat':
                toolResult = {
                    type: 'chitchat',
                    message: 'I\'m here to help with FIX protocol questions and order management.'
                };
                break;
                
            case 'unknown':
            default:
                if (llmMode === 'always') {
                    // LLM couldn't determine intent, fallback to rule-based
                    console.log('🔄 LLM returned unknown intent, falling back to rule-based routing');
                    
                    // Try to detect intent from input content
                    if (input.toLowerCase().includes('tag') || input.toLowerCase().includes('what is')) {
                        const tagMatch = input.match(/(\d+)/);
                        if (tagMatch) {
                            toolResult = await runLookupFlow(tagMatch[1]);
                        } else {
                            toolResult = {
                                type: 'error',
                                error: 'No tag number found in input'
                            };
                        }
                    } else if (input.startsWith('8=FIX.') || input.includes('|35=')) {
                        if (input.toLowerCase().includes('explain')) {
                            toolResult = await runExplainFlow(input);
                        } else if (input.toLowerCase().includes('validate') || input.toLowerCase().includes('check')) {
                            toolResult = await runValidateFlow(input);
                        } else {
                            toolResult = await runParseFlow(input);
                        }
                    } else {
                        // Try build flow as last resort
                        toolResult = await runBuildFlowWithConfirm(sessionId, input);
                    }
                } else {
                    // Try to detect intent from input content for rule-based mode
                    if (input.toLowerCase().includes('tag') || input.toLowerCase().includes('what is')) {
                        const tagMatch = input.match(/(\d+)/);
                        if (tagMatch) {
                            toolResult = await runLookupFlow(tagMatch[1]);
                        } else {
                            toolResult = {
                                type: 'error',
                                error: 'No tag number found in input'
                            };
                        }
                    } else if (input.startsWith('8=FIX.') || input.includes('|35=')) {
                        if (input.toLowerCase().includes('explain')) {
                            toolResult = await runExplainFlow(input);
                        } else if (input.toLowerCase().includes('validate') || input.toLowerCase().includes('check')) {
                            toolResult = await runValidateFlow(input);
                        } else {
                            toolResult = await runParseFlow(input);
                        }
                    } else {
                        toolResult = {
                            type: 'unknown',
                            message: 'Could not determine intent. Try: build, parse, explain, validate, or lookup commands.'
                        };
                    }
                }
                break;
        }
        
        // Generate narration if LLM is enabled
        let narration = null;
        if (llmMode !== 'off') {
            try {
                const context = {
                    intent,
                    toolResult,
                    validation: toolResult.valid,
                    fields: toolResult.fields || args.fields
                };
                narration = await narrate(context);
            } catch (error) {
                console.error('Narration error:', error.message);
                narration = { text: 'Response generated successfully.' };
            }
        }
        
        // Output compact JSON result
        const output = {
            intent,
            reply_style: replyStyle,
            llm_mode: llmMode,
            result: toolResult,
            narration
        };
        
        console.log(JSON.stringify(output, null, 2));
        
        // Add instructions for confirmation if needed
        if (toolResult.type === 'confirm') {
            console.log('\n--- Instructions ---');
            console.log('To confirm: node chat/runner_llm.js --session', sessionId, '"yes"');
            console.log('To edit: node chat/runner_llm.js --session', sessionId, '"price 187.5"');
            console.log('To cancel: node chat/runner_llm.js --session', sessionId, '"cancel"');
            console.log('------------------');
        }
        
    } catch (error) {
        console.error(JSON.stringify({
            intent: 'error',
            reply_style: 'ask_clarify',
            llm_mode: llmMode,
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
