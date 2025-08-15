/**
 * Ephemeral session store for chat adapter
 * Sessions expire after 30 minutes of inactivity
 */

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const sessions = new Map();

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.updatedAt > SESSION_TIMEOUT) {
            sessions.delete(sessionId);
        }
    }
}

/**
 * Get session data by ID
 * @param {string} sessionId - Session identifier
 * @returns {Object|null} Session data or null if not found/expired
 */
function getSession(sessionId) {
    cleanupExpiredSessions();
    
    const session = sessions.get(sessionId);
    if (!session) return null;
    
    // Check if expired
    if (Date.now() - session.updatedAt > SESSION_TIMEOUT) {
        sessions.delete(sessionId);
        return null;
    }
    
    return session;
}

/**
 * Set session data by ID
 * @param {string} sessionId - Session identifier
 * @param {Object} data - Session data
 */
function setSession(sessionId, data) {
    cleanupExpiredSessions();
    
    sessions.set(sessionId, {
        ...data,
        updatedAt: Date.now()
    });
}

/**
 * Clear session by ID
 * @param {string} sessionId - Session identifier
 */
function clearSession(sessionId) {
    sessions.delete(sessionId);
}

/**
 * Get all active session IDs (for debugging)
 * @returns {string[]} Array of active session IDs
 */
function getActiveSessions() {
    cleanupExpiredSessions();
    return Array.from(sessions.keys());
}

export {
    getSession,
    setSession,
    clearSession,
    getActiveSessions
};
