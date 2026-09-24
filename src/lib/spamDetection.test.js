import { describe, it, expect } from 'vitest'
import {
    detectSpam,
    sanitizeMessage,
    checkProfileBio,
    isRateLimited,
    getSpamErrorMessage
} from '../lib/spamDetection'

describe('Spam Detection', () => {

    describe('detectSpam', () => {

        // Normal messages should NOT be spam
        it('should pass normal messages', () => {
            const normalMessages = [
                "Hello, I'm interested in this position",
                "I have 3 years experience in React",
                "Can we schedule an interview?",
                "Looking forward to hearing from you",
                "The job description looks great"
            ]

            normalMessages.forEach(msg => {
                const result = detectSpam(msg)
                expect(result.isSpam).toBe(false)
            })
        })

        // Money/scam related spam
        it('should detect money scam patterns', () => {
            const spamMessages = [
                "earn $5000 working from home",
                "MAKE MONEY FAST with this trick",
                "GET RICH QUICK guaranteed",
                "FREE MONEY click here",
                "Guaranteed income $10000/month"
            ]

            spamMessages.forEach(msg => {
                const result = detectSpam(msg)
                expect(result.isSpam).toBe(true)
                expect(result.severity).toBe('high')
            })
        })

        // URL shortener spam
        it('should detect URL shorteners', () => {
            const urlSpam = [
                "Check this out: bit.ly/abc123",
                "Click here tinyurl.com/deal",
                "Visit goo.gl/offer"
            ]

            urlSpam.forEach(msg => {
                const result = detectSpam(msg)
                expect(result.isSpam).toBe(true)
            })
        })

        // Contact redirect spam
        it('should detect WhatsApp/Telegram redirects', () => {
            const redirectSpam = [
                "Add me on whatsapp for opportunity",
                "Contact me on telegram @scammer",
                "add me on snapchat quick"
            ]

            redirectSpam.forEach(msg => {
                const result = detectSpam(msg)
                expect(result.isSpam).toBe(true)
            })
        })

        // Classic spam phrases
        it('should detect classic spam phrases', () => {
            const classicSpam = [
                "CLICK HERE NOW for exclusive offer",
                "ACT NOW limited time",
                "Congratulations you've won a prize"
            ]

            classicSpam.forEach(msg => {
                const result = detectSpam(msg)
                expect(result.isSpam).toBe(true)
            })
        })

        // Excessive caps
        it('should detect excessive capital letters', () => {
            const capsSpam = "THIS IS ALL CAPS AND VERY LONG MESSAGE THAT LOOKS LIKE SPAM"
            const result = detectSpam(capsSpam)
            expect(result.isSpam).toBe(true)
            expect(result.severity).toBe('medium')
        })

        // Too many links
        it('should detect messages with too many links', () => {
            const manyLinks = "Check https://a.com and https://b.com and https://c.com and https://d.com"
            const result = detectSpam(manyLinks)
            expect(result.isSpam).toBe(true)
            expect(result.reason).toContain('link')
        })

        // Short messages skip detection
        it('should skip very short messages', () => {
            const result = detectSpam("Hi")
            expect(result.isSpam).toBe(false)
        })

        // Empty/null handling
        it('should handle null and empty input', () => {
            expect(detectSpam(null).isSpam).toBe(false)
            expect(detectSpam('').isSpam).toBe(false)
            expect(detectSpam(undefined).isSpam).toBe(false)
        })
    })

    describe('sanitizeMessage', () => {

        it('should trim whitespace', () => {
            expect(sanitizeMessage('  hello  ')).toBe('hello')
        })

        it('should normalize multiple spaces', () => {
            expect(sanitizeMessage('hello    world')).toBe('hello world')
        })

        it('should truncate long messages', () => {
            const longMsg = 'a'.repeat(3000)
            expect(sanitizeMessage(longMsg).length).toBe(2000)
        })

        it('should handle empty input', () => {
            expect(sanitizeMessage('')).toBe('')
            expect(sanitizeMessage(null)).toBe('')
        })
    })

    describe('checkProfileBio', () => {

        it('should pass normal bios', () => {
            const result = checkProfileBio("I'm a software developer with 5 years experience")
            expect(result.isSpam).toBe(false)
        })

        it('should detect affiliate links', () => {
            const result = checkProfileBio("Check my work at example.com?ref=mycode")
            expect(result.isSpam).toBe(true)
        })

        it('should handle empty bio', () => {
            const result = checkProfileBio('')
            expect(result.isSpam).toBe(false)
        })
    })

    describe('isRateLimited', () => {

        it('should not rate limit within threshold', () => {
            const store = new Map()

            // 3 messages should be fine
            expect(isRateLimited('user1', store, 5, 10000)).toBe(false)
            expect(isRateLimited('user1', store, 5, 10000)).toBe(false)
            expect(isRateLimited('user1', store, 5, 10000)).toBe(false)
        })

        it('should rate limit when threshold exceeded', () => {
            const store = new Map()

            // Send 6 messages rapidly
            for (let i = 0; i < 5; i++) {
                isRateLimited('user2', store, 5, 10000)
            }

            // 6th should trigger rate limit
            expect(isRateLimited('user2', store, 5, 10000)).toBe(true)
        })
    })

    describe('getSpamErrorMessage', () => {

        it('should return appropriate messages for each severity', () => {
            expect(getSpamErrorMessage('high')).toContain('prohibited')
            expect(getSpamErrorMessage('medium')).toContain('spam')
            expect(getSpamErrorMessage('low')).toContain('suspicious')
        })
    })
})
