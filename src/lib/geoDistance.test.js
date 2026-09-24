import { describe, it, expect } from 'vitest'
import {
    calculateHaversineDistanceKm,
    resolveLocationCoordinates,
    parseOpportunityLocation,
    evaluateOpportunityDistance
} from './geoDistance'

describe('geoDistance Engine', () => {
    describe('calculateHaversineDistanceKm', () => {
        it('calculates accurate distance between Tunis and Ariana (~7 km)', () => {
            const tunis = { lat: 36.8065, lon: 10.1815 }
            const ariana = { lat: 36.8663, lon: 10.1956 }
            const distance = calculateHaversineDistanceKm(tunis.lat, tunis.lon, ariana.lat, ariana.lon)
            expect(distance).toBeGreaterThan(6)
            expect(distance).toBeLessThan(9)
        })

        it('calculates accurate distance between Tunis and Sousse (~116 km great circle)', () => {
            const tunis = { lat: 36.8065, lon: 10.1815 }
            const sousse = { lat: 35.8256, lon: 10.6370 }
            const distance = calculateHaversineDistanceKm(tunis.lat, tunis.lon, sousse.lat, sousse.lon)
            expect(distance).toBeGreaterThan(110)
            expect(distance).toBeLessThan(125)
        })

        it('calculates accurate distance between Tunis and Paris (~1480 km)', () => {
            const tunis = { lat: 36.8065, lon: 10.1815 }
            const paris = { lat: 48.8566, lon: 2.3522 }
            const distance = calculateHaversineDistanceKm(tunis.lat, tunis.lon, paris.lat, paris.lon)
            expect(distance).toBeGreaterThan(1400)
            expect(distance).toBeLessThan(1550)
        })

        it('returns null for invalid or missing coordinates', () => {
            expect(calculateHaversineDistanceKm(null, 10, 36, 10)).toBeNull()
            expect(calculateHaversineDistanceKm(36, NaN, 36, 10)).toBeNull()
        })
    })

    describe('resolveLocationCoordinates', () => {
        it('resolves governorate coordinates for Tunis', () => {
            const res = resolveLocationCoordinates('Tunis')
            expect(res).not.toBeNull()
            expect(res.lat).toBeCloseTo(36.8065, 2)
            expect(res.name).toBe('Tunis')
        })

        it('resolves governorate for compound format like "Tunis, Tunis" or "Sousse, Sousse"', () => {
            const res = resolveLocationCoordinates('Sousse, Sousse')
            expect(res).not.toBeNull()
            expect(res.name).toBe('Sousse')
        })

        it('resolves Tunisian tech hub "Lac 2" to Tunis', () => {
            const res = resolveLocationCoordinates('Lac 2')
            expect(res).not.toBeNull()
            expect(res.type).toBe('city')
            expect(res.lat).toBeCloseTo(36.8402, 2)
        })

        it('resolves international city like "Paris"', () => {
            const res = resolveLocationCoordinates('Paris, France')
            expect(res).not.toBeNull()
            expect(res.lat).toBeCloseTo(48.8566, 2)
        })

        it('returns null for unresolvable location strings', () => {
            expect(resolveLocationCoordinates('Unknown Island XYZ')).toBeNull()
            expect(resolveLocationCoordinates('')).toBeNull()
        })
    })

    describe('parseOpportunityLocation', () => {
        it('identifies remote opportunity', () => {
            const res = parseOpportunityLocation('Remote', '')
            expect(res.isRemote).toBe(true)
            expect(res.locationDisplay).toContain('Remote')
        })

        it('identifies hybrid opportunity', () => {
            const res = parseOpportunityLocation('Hybrid - Tunis', 'Tunis')
            expect(res.isHybrid).toBe(true)
        })

        it('falls back to company domiciliation when offer location is missing', () => {
            const res = parseOpportunityLocation('', 'Ariana')
            expect(res.isUnspecified).toBe(false)
            expect(res.coords).not.toBeNull()
            expect(res.locationDisplay).toBe('Ariana')
        })

        it('marks as unspecified when both offer and company location are empty', () => {
            const res = parseOpportunityLocation('', '')
            expect(res.isUnspecified).toBe(true)
            expect(res.locationDisplay).toBe('Location not specified')
        })
    })

    describe('evaluateOpportunityDistance', () => {
        it('computes real distance from student in Tunis to offer in Ariana', () => {
            const res = evaluateOpportunityDistance('Tunis', 'Ariana', '')
            expect(res.distanceKm).not.toBeNull()
            expect(res.distanceKm).toBeLessThan(15)
            expect(res.distanceFormatted).toContain('km')
        })

        it('returns Remote status when job is remote', () => {
            const res = evaluateOpportunityDistance('Tunis', 'Remote - Worldwide', '')
            expect(res.isRemote).toBe(true)
            expect(res.distanceFormatted).toBe('Remote')
        })

        it('marks unspecified when company has no domiciliation and job has no location', () => {
            const res = evaluateOpportunityDistance('Tunis', '', '')
            expect(res.isUnspecified).toBe(true)
            expect(res.distanceKm).toBeNull()
        })
    })
})
