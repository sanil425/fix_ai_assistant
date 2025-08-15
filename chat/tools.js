/**
 * HTTP wrappers for FIX API endpoints
 * Uses globalThis.fetch (Node 18+) and configurable base URL
 */

const FIX_API_BASE = process.env.FIX_API_BASE_URL || "http://127.0.0.1:8000";

// Optional bearer token for FastAPI auth
const FIX_API_TOKEN = process.env.FIX_API_TOKEN;

/**
 * Build a FIX message from fields
 * @param {Object} fields - Tag-value pairs for the FIX message
 * @returns {Promise<Object>} Response with raw_fix
 */
async function fixBuild(fields) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        // Add bearer token if available
        if (FIX_API_TOKEN) {
            headers['Authorization'] = `Bearer ${FIX_API_TOKEN}`;
        }
        
        const response = await fetch(`${FIX_API_BASE}/fix/build`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ fields, delimiter: '|' })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail?.error?.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Build failed: ${error.message}`);
    }
}

/**
 * Parse a FIX message into fields and metadata
 * @param {string} raw - Raw FIX message
 * @returns {Promise<Object>} Response with fields and meta
 */
async function fixParse(raw) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        // Add bearer token if available
        if (FIX_API_TOKEN) {
            headers['Authorization'] = `Bearer ${FIX_API_TOKEN}`;
        }
        
        const response = await fetch(`${FIX_API_BASE}/fix/parse`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ raw_fix: raw, delimiter: '|' })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail?.error?.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Parse failed: ${error.message}`);
    }
}

/**
 * Validate a FIX message against specifications
 * @param {string} raw - Raw FIX message
 * @returns {Promise<Object>} Response with ok status and any errors
 */
async function fixValidate(raw) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        // Add bearer token if available
        if (FIX_API_TOKEN) {
            headers['Authorization'] = `Bearer ${FIX_API_TOKEN}`;
        }
        
        const response = await fetch(`${FIX_API_BASE}/fix/validate`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ raw_fix: raw, delimiter: '|' })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail?.error?.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Validate failed: ${error.message}`);
    }
}

/**
 * Explain a FIX message in human-readable terms
 * @param {string} raw - Raw FIX message
 * @returns {Promise<Object>} Response with explanation
 */
async function fixExplain(raw) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        // Add bearer token if available
        if (FIX_API_TOKEN) {
            headers['Authorization'] = `Bearer ${FIX_API_TOKEN}`;
        }
        
        const response = await fetch(`${FIX_API_BASE}/fix/explain`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ raw_fix: raw, delimiter: '|' })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail?.error?.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Explain failed: ${error.message}`);
    }
}

/**
 * Look up FIX field information by tag
 * @param {string} tag - FIX tag number
 * @returns {Promise<Object>} Response with field metadata
 */
async function fixLookup(tag) {
    try {
        const headers = {};
        
        // Add bearer token if available
        if (FIX_API_TOKEN) {
            headers['Authorization'] = `Bearer ${FIX_API_TOKEN}`;
        }
        
        const response = await fetch(`${FIX_API_BASE}/fix/lookup?tag=${tag}&fix_version=4.4`, {
            headers
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail?.error?.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        throw new Error(`Lookup failed: ${error.message}`);
    }
}

export {
    fixBuild,
    fixParse,
    fixValidate,
    fixExplain,
    fixLookup
};
