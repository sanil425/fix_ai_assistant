#!/usr/bin/env node

/**
 * Chat service HTTP server
 * Exposes POST /chat endpoint using existing chat modules
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { route } from '../chat/router_llm.js';
import { narrate } from '../chat/narrator_llm.js';
import { detectIntent } from '../chat/intent.js';
import {
    runBuildFlowWithConfirm,
    runParseFlow,
    runExplainFlow,
    runValidateFlow,
    runLookupFlow
} from '../chat/flows.js';

const app = express();
const PORT = process.env.CHAT_PORT || 8787;

// CORS configuration - allow frontend origin or all origins
// TODO: Tighten CORS for production by setting FRONTEND_ORIGIN
const corsOptions = {
    origin: process.env.FRONTEND_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// JSON body parsing with 200kb limit
app.use(express.json({ limit: '200kb' }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
});

/**
 * Generate a simple session ID (timestamp + random)
 * @returns {string} Session ID
 */
function generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle chat message processing
 * @param {string} message - User message
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object>} Chat response
 */
async function processChatMessage(message, sessionId) {
    try {
        const llmMode = process.env.LLM_MODE || 'off';
        let intent, toolResult, replyStyle;
        
        // Route through LLM if enabled
        if (llmMode !== 'off') {
            try {
                const llmResult = await route(message);
                intent = llmResult.intent;
                replyStyle = llmResult.reply_style;
                
                // Handle LLM-provided args
                if (intent === 'build' && llmResult.args.fields) {
                    if (llmResult.args.missing && llmResult.args.missing.length > 0) {
                        toolResult = {
                            type: 'need_info',
                            missing: llmResult.args.missing,
                            prompt: `Please provide: ${llmResult.args.missing.join(', ')}`
                        };
                    } else {
                        // Build with LLM-provided fields
                        toolResult = await runBuildFlowWithConfirm(sessionId, JSON.stringify(llmResult.args.fields));
                    }
                } else if (intent === 'parse' && llmResult.args.raw_fix) {
                    toolResult = await runParseFlow(llmResult.args.raw_fix);
                } else if (intent === 'validate' && llmResult.args.raw_fix) {
                    toolResult = await runValidateFlow(llmResult.args.raw_fix);
                } else if (intent === 'explain' && llmResult.args.raw_fix) {
                    toolResult = await runExplainFlow(llmResult.args.raw_fix);
                } else if (intent === 'lookup' && llmResult.args.tag) {
                    toolResult = await runLookupFlow(llmResult.args.tag);
                } else if (intent === 'chitchat') {
                    toolResult = {
                        type: 'chitchat',
                        message: 'I\'m here to help with FIX protocol questions and order management.'
                    };
                }
            } catch (error) {
                console.error('LLM routing error:', error.message);
                // Fall back to rule-based routing
                intent = 'unknown';
                replyStyle = 'ask_clarify';
            }
        }
        
        // If LLM failed or is disabled, use rule-based routing
        if (!toolResult) {
            intent = detectIntent(message);
            replyStyle = 'final';
            
            switch (intent) {
                case 'build':
                    toolResult = await runBuildFlowWithConfirm(sessionId, message);
                    break;
                    
                case 'parse':
                    toolResult = await runParseFlow(message);
                    break;
                    
                case 'explain':
                    toolResult = await runExplainFlow(message);
                    break;
                    
                case 'validate':
                    toolResult = await runValidateFlow(message);
                    break;
                    
                case 'lookup':
                    const tagMatch = message.match(/(\d+)/);
                    if (tagMatch) {
                        toolResult = await runLookupFlow(tagMatch[1]);
                    } else {
                        toolResult = {
                            type: 'error',
                            error: 'No tag number found in input'
                        };
                    }
                    break;
                    
                default:
                    toolResult = {
                        type: 'unknown',
                        message: 'Could not determine intent. Try: build, parse, explain, validate, or lookup commands.'
                    };
            }
        }
        
        // Generate narration if LLM is enabled
        let narration = null;
        if (llmMode !== 'off') {
            try {
                const context = {
                    intent,
                    toolResult,
                    validation: toolResult.valid,
                    fields: toolResult.fields
                };
                narration = await narrate(context);
            } catch (error) {
                console.error('Narration error:', error.message);
                narration = { text: 'Response generated successfully.' };
            }
        }
        
        return {
            session_id: sessionId,
            intent,
            reply_style: replyStyle,
            result: toolResult,
            narration,
            llm_mode: llmMode
        };
        
    } catch (error) {
        console.error('Chat processing error:', error.message);
        throw error;
    }
}

// Health check endpoint
app.get('/healthz', (req, res) => {
    res.json({
        ok: true,
        mode: process.env.LLM_MODE || 'off'
    });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
    try {
        const { session_id, message } = req.body;
        
        // Validate request
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                error: {
                    code: 'BAD_REQUEST',
                    message: 'message required'
                }
            });
        }
        
        // Generate session ID if missing
        const sessionId = session_id || generateSessionId();
        
        // Process the chat message
        const response = await processChatMessage(message.trim(), sessionId);
        
        res.json(response);
        
    } catch (error) {
        console.error('Chat endpoint error:', error.message);
        
        // Never expose stack traces in production
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An error occurred while processing your request'
            }
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error.message);
    
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Chat service running on port ${PORT}`);
    console.log(`🔍 LLM Mode: ${process.env.LLM_MODE || 'off'}`);
    console.log(`🌐 CORS Origin: ${process.env.FRONTEND_ORIGIN || '*'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/healthz`);
});
