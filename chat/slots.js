/**
 * Slot extraction for NewOrderSingle MVP
 * Parses natural language into FIX field mappings
 */

/**
 * Extract NewOrderSingle fields from natural language input
 * @param {string} input - Natural language input
 * @returns {Object} { fields: Object, missing: Array<string> }
 */
function extractNOS(input) {
    const text = input.toLowerCase();
    const fields = {};
    const missing = [];
    
    // Always add required fields
    fields['35'] = 'D'; // MsgType = NewOrderSingle
    fields['60'] = new Date().toISOString(); // TransactTime = now
    
    // Extract side (54)
    if (text.includes('buy')) {
        fields['54'] = '1';
    } else if (text.includes('sell') || text.includes('short')) {
        fields['54'] = '2';
    }
    
    // Extract quantity (38) - first integer
    const qtyMatch = text.match(/(\d+)/);
    if (qtyMatch) {
        fields['38'] = qtyMatch[1];
    }
    
    // Extract symbol (55) - uppercase 1-5 letters after "in/for/" or standalone
    const symbolPatterns = [
        /(?:in|for)\s+([a-z]{1,5})\b/i,
        /\b([a-z]{1,5})\b/i
    ];
    
    for (const pattern of symbolPatterns) {
        const match = text.match(pattern);
        if (match && /^[a-z]{1,5}$/i.test(match[1])) {
            // Check if it's not a common word
            const symbol = match[1].toUpperCase();
            const commonWords = ['the', 'and', 'for', 'buy', 'sell', 'new', 'limit', 'market', 'order', 'price', 'at', 'id'];
            if (!commonWords.includes(symbol.toLowerCase())) {
                fields['55'] = symbol;
                break;
            }
        }
    }
    
    // Extract order type (40)
    if (text.includes('limit')) {
        fields['40'] = '2';
    } else if (text.includes('market')) {
        fields['40'] = '1';
    }
    
    // Extract price (44) - decimal after "at/price/px"
    const pricePatterns = [
        /at\s+(\d+\.?\d*)/i,
        /price\s+(\d+\.?\d*)/i,
        /px\s+(\d+\.?\d*)/i
    ];
    
    for (const pattern of pricePatterns) {
        const match = text.match(pattern);
        if (match) {
            fields['44'] = match[1];
            break;
        }
    }
    
    // Extract ClOrdID (11) - after "id/oid/clordid" or generate
    const idPatterns = [
        /id\s+([a-z0-9_-]+)/i,
        /oid\s+([a-z0-9_-]+)/i,
        /clordid\s+([a-z0-9_-]+)/i
    ];
    
    let foundId = false;
    for (const pattern of idPatterns) {
        const match = text.match(pattern);
        if (match) {
            fields['11'] = match[1];
            foundId = true;
            break;
        }
    }
    
    if (!foundId) {
        fields['11'] = `AUTO-${Date.now()}`;
    }
    
    // Check for missing required fields
    if (!fields['54']) missing.push('54'); // Side
    if (!fields['38']) missing.push('38'); // OrderQty
    if (!fields['55']) missing.push('55'); // Symbol
    if (!fields['40']) missing.push('40'); // OrdType
    
    // Price is required for limit orders
    if (fields['40'] === '2' && !fields['44']) {
        missing.push('44'); // Price
    }
    
    return { fields, missing };
}

export { extractNOS };
