/**
 * Confirmation logic for FIX order building
 * Handles user edits and confirmations
 */

import { summarizeNOS } from './slots.js';

/**
 * Create confirmation message for order fields
 * @param {Object} fields - FIX fields
 * @returns {Object} Confirmation object
 */
export function makeConfirm(fields) {
    return {
        type: 'confirm',
        summary: summarizeNOS(fields),
        fields
    };
}

/**
 * Apply user edits to existing fields
 * @param {Object} fields - Current FIX fields
 * @param {string} utterance - User input
 * @returns {Object} { fields, changed: string[] }
 */
export function applyUserEdits(fields, utterance) {
    const text = utterance.toLowerCase();
    const changed = [];
    
    // Price edits
    const pricePatterns = [
        /price\s+(\d+\.?\d*)/i,
        /at\s+(\d+\.?\d*)/i,
        /px\s+(\d+\.?\d*)/i
    ];
    for (const pattern of pricePatterns) {
        const match = text.match(pattern);
        if (match) {
            fields['44'] = match[1];
            changed.push('44');
            break;
        }
    }
    
    // Quantity edits
    const qtyPatterns = [
        /qty\s+(\d+)/i,
        /for\s+(\d+)/i,
        /(\d+)\s+shares?/i
    ];
    for (const pattern of qtyPatterns) {
        const match = text.match(pattern);
        if (match) {
            fields['38'] = match[1];
            changed.push('38');
            break;
        }
    }
    
    // Side edits
    if (text.includes('buy')) {
        fields['54'] = '1';
        changed.push('54');
    } else if (text.includes('sell')) {
        fields['54'] = '2';
        changed.push('54');
    }
    
    // Symbol edits - look for uppercase symbols
    const symbolMatch = text.match(/\b([A-Z]{1,5})\b/);
    if (symbolMatch) {
        const symbol = symbolMatch[1];
        const commonWords = ['THE', 'AND', 'FOR', 'BUY', 'SELL', 'NEW', 'LIMIT', 'MARKET', 'ORDER', 'PRICE', 'AT', 'ID'];
        if (!commonWords.includes(symbol)) {
            fields['55'] = symbol;
            changed.push('55');
        }
    }
    
    // ID edits
    const idPatterns = [
        /id\s+([a-z0-9_-]+)/i,
        /clordid\s+([a-z0-9_-]+)/i
    ];
    for (const pattern of idPatterns) {
        const match = text.match(pattern);
        if (match) {
            fields['11'] = match[1];
            changed.push('11');
            break;
        }
    }
    
    // Order type edits
    if (text.includes('limit')) {
        fields['40'] = '2';
        changed.push('40');
    } else if (text.includes('market')) {
        fields['40'] = '1';
        changed.push('40');
    }
    
    return { fields, changed };
}

/**
 * Check if user input is affirmative
 * @param {string} utterance - User input
 * @returns {boolean} True if affirmative
 */
export function isAffirmative(utterance) {
    const text = utterance.toLowerCase().trim();
    const affirmatives = ['yes', 'y', 'ok', 'okay', 'confirm', 'proceed', 'go', 'build', 'submit'];
    return affirmatives.includes(text);
}

/**
 * Check if user input is cancellation
 * @param {string} utterance - User input
 * @returns {boolean} True if cancellation
 */
export function isCancel(utterance) {
    const text = utterance.toLowerCase().trim();
    const cancellations = ['cancel', 'stop', 'no', 'n', 'abort', 'quit', 'exit'];
    return cancellations.includes(text);
}
