/**
 * Spam Detection Utilities
 * Pattern-based detection for common spam in messages and profiles
 */

// Common spam patterns
const SPAM_PATTERNS = [
    // Suspicious URLs
    /https?:\/\/[^\s]{50,}/i,  // Very long URLs
    /bit\.ly|tinyurl|t\.co|goo\.gl/i,  // URL shorteners (often spam)

    // Money/scam related
    /earn\s+\$?\d+/i,
    /make\s+money\s+(fast|quick|easy)/i,
    /work\s+from\s+home.*\$\d+/i,
    /get\s+rich\s+(quick|fast)/i,
    /free\s+money/i,
    /\b(bitcoin|crypto)\s+invest/i,
    /guaranteed\s+(income|profit|earnings)/i,

    // Classic spam phrases
    /click\s+here\s+now/i,
    /act\s+now|limited\s+time\s+offer/i,
    /congratulations.*you('ve)?\s+(won|been\s+selected)/i,
    /you('ve)?\s+been\s+chosen/i,

    // Inappropriate content markers
    /\b(viagra|cialis|casino|gambling|porn|xxx)\b/i,

    // Contact info harvesting
    /send\s+me\s+your\s+(credit\s+card|bank|password)/i,
    /share\s+your\s+(personal|private)\s+(details|info)/i,

    // Excessive caps (80%+ uppercase in long messages)
    // Handled separately in checkExcessiveCaps()

    // Repetitive characters (spam signature)
    /(.)\1{9,}/,  // Same character 10+ times

    // Phone number spam patterns
    /call\s+now.*\d{10}/i,
    /text\s+me.*\d{10}/i,

    // WhatsApp/external platform redirect
    /add\s+me\s+on\s+(whatsapp|telegram|snapchat)/i,
    /contact\s+me\s+on\s+(whatsapp|telegram)/i,
]

// Suspicious keywords (lower severity - just flag, don't block)
const SUSPICIOUS_KEYWORDS = [
    'investment opportunity',
    'no experience needed',
    'work from home',
    'easy money',
    'be your own boss',
    'financial freedom',
    'mlm',
    'pyramid',
    'network marketing',
]

/**
 * Check if message contains spam patterns
 * @param {string} message - Message to check
 * @returns {Object} - { isSpam: boolean, reason?: string, severity: 'low'|'medium'|'high' }
 */
export function detectSpam(message) {
    if (!message || typeof message !== 'string') {
        return { isSpam: false, severity: 'none' }
    }

    const text = message.trim()

    // Skip very short messages
    if (text.length < 10) {
        return { isSpam: false, severity: 'none' }
    }

    // Check against spam patterns (HIGH severity - block)
    for (const pattern of SPAM_PATTERNS) {
        if (pattern.test(text)) {
            return {
                isSpam: true,
                reason: 'Message contains prohibited content',
                severity: 'high',
                pattern: pattern.toString()
            }
        }
    }

    // Check excessive caps (MEDIUM severity)
    if (checkExcessiveCaps(text)) {
        return {
            isSpam: true,
            reason: 'Please avoid using excessive capital letters',
            severity: 'medium'
        }
    }

    // Check suspicious keywords (LOW severity - warn, don't block)
    const lowerText = text.toLowerCase()
    for (const keyword of SUSPICIOUS_KEYWORDS) {
        if (lowerText.includes(keyword)) {
            return {
                isSpam: false,
                flagged: true,
                reason: 'Message may appear suspicious to recipients',
                severity: 'low'
            }
        }
    }

    // Check for excessive links (potential spam)
    const linkCount = (text.match(/https?:\/\//g) || []).length
    if (linkCount > 3) {
        return {
            isSpam: true,
            reason: 'Too many links in message',
            severity: 'medium'
        }
    }

    return { isSpam: false, severity: 'none' }
}

/**
 * Check for excessive capital letters (spam indicator)
 * @param {string} text - Text to check
 * @returns {boolean}
 */
function checkExcessiveCaps(text) {
    // Only check messages longer than 20 chars
    if (text.length < 20) return false

    const letters = text.replace(/[^a-zA-Z]/g, '')
    if (letters.length < 10) return false

    const upperCount = (letters.match(/[A-Z]/g) || []).length
    const ratio = upperCount / letters.length

    // More than 70% caps is spam-like
    return ratio > 0.7
}

/**
 * Clean/sanitize message before sending
 * @param {string} message - Original message
 * @returns {string} - Cleaned message
 */
export function sanitizeMessage(message) {
    if (!message) return ''

    return message
        .trim()
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .slice(0, 2000)  // Max length
}

/**
 * Check if profile bio contains spam
 * @param {string} bio - Profile bio text
 * @returns {Object} - { isSpam: boolean, reason?: string }
 */
export function checkProfileBio(bio) {
    if (!bio) return { isSpam: false }

    // Use same detection
    const result = detectSpam(bio)

    // Additional bio-specific checks
    if (bio.length > 0) {
        // Check for affiliate links
        if (/\?ref=|\?aff=|affiliate/i.test(bio)) {
            return {
                isSpam: true,
                reason: 'Affiliate links are not allowed in profiles'
            }
        }
    }

    return result
}

/**
 * Rate limiting helper - track message frequency
 * @param {string} userId - User ID
 * @param {Map} rateLimitStore - Storage for rate limits
 * @param {number} maxMessages - Max messages per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - true if rate limited
 */
export function isRateLimited(userId, rateLimitStore, maxMessages = 5, windowMs = 10000) {
    const now = Date.now()
    const userHistory = rateLimitStore.get(userId) || []

    // Filter to only messages within window
    const recentMessages = userHistory.filter(time => now - time < windowMs)

    // Update store
    recentMessages.push(now)
    rateLimitStore.set(userId, recentMessages)

    return recentMessages.length > maxMessages
}

/**
 * Get user-friendly error message for spam detection
 * @param {string} severity - Spam severity level
 * @returns {string}
 */
export function getSpamErrorMessage(severity) {
    switch (severity) {
        case 'high':
            return 'Your message was blocked because it contains prohibited content. Please review our community guidelines.'
        case 'medium':
            return 'Your message appears to be spam. Please rephrase and try again.'
        case 'low':
            return 'Your message may appear suspicious to recipients. Consider rephrasing.'
        default:
            return 'Message could not be sent. Please try again.'
    }
}
