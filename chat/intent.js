/**
 * Tiny intent detector for FIX chat commands
 * Analyzes user input to determine intended action
 */

/**
 * Detect user intent from input text
 * @param {string} input - User input text
 * @returns {"build" | "parse" | "validate" | "explain" | "lookup" | "unknown"}
 */
function detectIntent(input) {
    const text = input.toLowerCase().trim();
    
    // Check if input looks like FIX message
    if (/^8=FIX\./.test(input)) {
        if (text.includes('explain')) return 'explain';
        if (text.includes('validate') || text.includes('check')) return 'validate';
        return 'parse';
    }
    
    // Check for explain commands with FIX messages
    if (text.includes('explain') && /8=FIX\./.test(input)) {
        return 'explain';
    }
    
    // Lookup patterns
    if (/what is tag \d+/.test(text) || /tag \d+/.test(text)) {
        return 'lookup';
    }
    
    // Build patterns
    const buildVerbs = ['build', 'create', 'make', 'new', 'submit'];
    const hasBuildVerb = buildVerbs.some(verb => text.includes(verb));
    const hasOrderComponents = (text.includes('buy') || text.includes('sell') || text.includes('short')) &&
                              /\d+/.test(text) && 
                              /[a-z]{1,5}/i.test(text);
    
    if (hasBuildVerb || hasOrderComponents) {
        return 'build';
    }
    
    return 'unknown';
}

export { detectIntent };
