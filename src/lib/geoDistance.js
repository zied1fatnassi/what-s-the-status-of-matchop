/**
 * GeoDistance & Geolocation Engine for MatchOp
 * 
 * Provides:
 * 1. Coordinates database for all 24 Tunisian Governorates, major cities, delegacies, and international tech hubs
 * 2. Real Haversine distance calculation in kilometers
 * 3. Intelligent location text parsing (detects Remote, Hybrid, On-site, City, Governorate, Country)
 * 4. Opportunity distance evaluation against a reference location
 */

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371

/**
 * GPS Coordinates [latitude, longitude] for all 24 Tunisian Governorates
 */
export const TUNISIAN_GOVERNORATE_COORDS = {
    'Ariana': { lat: 36.8663, lon: 10.1956 },
    'Béja': { lat: 36.7256, lon: 9.1817 },
    'Ben Arous': { lat: 36.7533, lon: 10.2222 },
    'Bizerte': { lat: 37.2744, lon: 9.8739 },
    'Gabès': { lat: 33.8815, lon: 10.0982 },
    'Gafsa': { lat: 34.4250, lon: 8.7842 },
    'Jendouba': { lat: 36.5011, lon: 8.7802 },
    'Kairouan': { lat: 35.6781, lon: 10.0963 },
    'Kasserine': { lat: 35.1676, lon: 8.8365 },
    'Kébili': { lat: 33.7044, lon: 8.9690 },
    'Le Kef': { lat: 36.1742, lon: 8.7049 },
    'Mahdia': { lat: 35.5047, lon: 11.0622 },
    'La Manouba': { lat: 36.8080, lon: 10.0972 },
    'Médenine': { lat: 33.3549, lon: 10.5055 },
    'Monastir': { lat: 35.7780, lon: 10.8262 },
    'Nabeul': { lat: 36.4513, lon: 10.7357 },
    'Sfax': { lat: 34.7406, lon: 10.7603 },
    'Sidi Bouzid': { lat: 35.0382, lon: 9.4849 },
    'Siliana': { lat: 36.0844, lon: 9.3708 },
    'Sousse': { lat: 35.8256, lon: 10.6370 },
    'Tataouine': { lat: 32.9297, lon: 10.4518 },
    'Tozeur': { lat: 33.9197, lon: 8.1335 },
    'Tunis': { lat: 36.8065, lon: 10.1815 },
    'Zaghouan': { lat: 36.4029, lon: 10.1429 },
}

/**
 * Key Tunisian cities, business districts, and tech hubs coordinates
 */
export const TUNISIAN_CITY_COORDS = {
    // Grand Tunis business & tech hubs
    'charguia': { lat: 36.8522, lon: 10.2078, governorate: 'Tunis' },
    'charguia 1': { lat: 36.8522, lon: 10.2078, governorate: 'Tunis' },
    'charguia 2': { lat: 36.8540, lon: 10.2150, governorate: 'Tunis' },
    'lac': { lat: 36.8327, lon: 10.2319, governorate: 'Tunis' },
    'lac 1': { lat: 36.8327, lon: 10.2319, governorate: 'Tunis' },
    'lac 2': { lat: 36.8402, lon: 10.2667, governorate: 'Tunis' },
    'les berges du lac': { lat: 36.8360, lon: 10.2450, governorate: 'Tunis' },
    'centre urbain nord': { lat: 36.8480, lon: 10.1980, governorate: 'Tunis' },
    'el ghazala': { lat: 36.8940, lon: 10.1870, governorate: 'Ariana' },
    'technopole el ghazala': { lat: 36.8940, lon: 10.1870, governorate: 'Ariana' },
    'la marsa': { lat: 36.8782, lon: 10.3247, governorate: 'Tunis' },
    'carthage': { lat: 36.8528, lon: 10.3233, governorate: 'Tunis' },
    'sidi bou said': { lat: 36.8703, lon: 10.3414, governorate: 'Tunis' },
    'gammarth': { lat: 36.9189, lon: 10.2889, governorate: 'Tunis' },
    'el menzah': { lat: 36.8450, lon: 10.1750, governorate: 'Tunis' },
    'el manar': { lat: 36.8380, lon: 10.1530, governorate: 'Tunis' },
    'ennasr': { lat: 36.8610, lon: 10.1600, governorate: 'Ariana' },
    'soukra': { lat: 36.8850, lon: 10.2450, governorate: 'Ariana' },
    'raoued': { lat: 36.9150, lon: 10.1970, governorate: 'Ariana' },
    'rades': { lat: 36.7681, lon: 10.2753, governorate: 'Ben Arous' },
    'hammam lif': { lat: 36.7300, lon: 10.3400, governorate: 'Ben Arous' },
    'ezzahra': { lat: 36.7450, lon: 10.3100, governorate: 'Ben Arous' },
    'el mourouj': { lat: 36.7260, lon: 10.2100, governorate: 'Ben Arous' },
    'oued ellil': { lat: 36.8200, lon: 10.0400, governorate: 'La Manouba' },
    'denden': { lat: 36.8050, lon: 10.1150, governorate: 'La Manouba' },
    
    // Sahel & Cap Bon
    'hammamet': { lat: 36.4000, lon: 10.6167, governorate: 'Nabeul' },
    'hammam sousse': { lat: 35.8589, lon: 10.5969, governorate: 'Sousse' },
    'kantaoui': { lat: 35.8920, lon: 10.5980, governorate: 'Sousse' },
    'port el kantaoui': { lat: 35.8920, lon: 10.5980, governorate: 'Sousse' },
    'sahloul': { lat: 35.8360, lon: 10.6050, governorate: 'Sousse' },
    'moknine': { lat: 35.6300, lon: 10.9000, governorate: 'Monastir' },
    'sahline': { lat: 35.7500, lon: 10.7167, governorate: 'Monastir' },
    'djem': { lat: 35.3000, lon: 10.7167, governorate: 'Mahdia' },
    'el djem': { lat: 35.3000, lon: 10.7167, governorate: 'Mahdia' },
    'kelibia': { lat: 36.8500, lon: 11.1000, governorate: 'Nabeul' },
    'korba': { lat: 36.5800, lon: 10.8600, governorate: 'Nabeul' },

    // South & Islands
    'djerba': { lat: 33.8075, lon: 10.8451, governorate: 'Médenine' },
    'houmt souk': { lat: 33.8750, lon: 10.8570, governorate: 'Médenine' },
    'midoun': { lat: 33.8080, lon: 10.9920, governorate: 'Médenine' },
    'zarzis': { lat: 33.5040, lon: 11.1122, governorate: 'Médenine' },
    'ben gardane': { lat: 33.1389, lon: 11.2167, governorate: 'Médenine' },
}

/**
 * Major international tech hubs for global and external opportunities
 */
export const GLOBAL_CITY_COORDS = {
    // France
    'paris': { lat: 48.8566, lon: 2.3522, country: 'France' },
    'lyon': { lat: 45.7640, lon: 4.8357, country: 'France' },
    'marseille': { lat: 43.2965, lon: 5.3698, country: 'France' },
    'toulouse': { lat: 43.6047, lon: 1.4442, country: 'France' },
    'bordeaux': { lat: 44.8378, lon: -0.5792, country: 'France' },
    'nantes': { lat: 47.2184, lon: -1.5536, country: 'France' },
    'lille': { lat: 50.6292, lon: 3.0573, country: 'France' },

    // Europe
    'london': { lat: 51.5074, lon: -0.1278, country: 'United Kingdom' },
    'berlin': { lat: 52.5200, lon: 13.4050, country: 'Germany' },
    'munich': { lat: 48.1351, lon: 11.5820, country: 'Germany' },
    'frankfurt': { lat: 50.1109, lon: 8.6821, country: 'Germany' },
    'amsterdam': { lat: 52.3676, lon: 4.9041, country: 'Netherlands' },
    'brussels': { lat: 50.8503, lon: 4.3517, country: 'Belgium' },
    'bruxelles': { lat: 50.8503, lon: 4.3517, country: 'Belgium' },
    'geneva': { lat: 46.2044, lon: 6.1432, country: 'Switzerland' },
    'geneve': { lat: 46.2044, lon: 6.1432, country: 'Switzerland' },
    'zurich': { lat: 47.3769, lon: 8.5417, country: 'Switzerland' },
    'madrid': { lat: 40.4168, lon: -3.7038, country: 'Spain' },
    'barcelona': { lat: 41.3851, lon: 2.1734, country: 'Spain' },

    // North America
    'new york': { lat: 40.7128, lon: -74.0060, country: 'United States' },
    'san francisco': { lat: 37.7749, lon: -122.4194, country: 'United States' },
    'seattle': { lat: 47.6062, lon: -122.3321, country: 'United States' },
    'austin': { lat: 30.2672, lon: -97.7431, country: 'United States' },
    'boston': { lat: 42.3601, lon: -71.0589, country: 'United States' },
    'montreal': { lat: 45.5017, lon: -73.5673, country: 'Canada' },
    'toronto': { lat: 43.6532, lon: -79.3832, country: 'Canada' },

    // Middle East & North Africa
    'dubai': { lat: 25.2048, lon: 55.2708, country: 'United Arab Emirates' },
    'abu dhabi': { lat: 24.4539, lon: 54.3773, country: 'United Arab Emirates' },
    'riyadh': { lat: 24.7136, lon: 46.6753, country: 'Saudi Arabia' },
    'doha': { lat: 25.2854, lon: 51.5310, country: 'Qatar' },
    'casablanca': { lat: 33.5731, lon: -7.5898, country: 'Morocco' },
    'rabat': { lat: 34.0209, lon: -6.8416, country: 'Morocco' },
    'algiers': { lat: 36.7538, lon: 3.0588, country: 'Algeria' },
    'alger': { lat: 36.7538, lon: 3.0588, country: 'Algeria' },
    'cairo': { lat: 30.0444, lon: 31.2357, country: 'Egypt' },
}

/**
 * Normalize text for accent-insensitive, case-insensitive keyword lookup
 */
function cleanText(val) {
    return String(val || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

/**
 * Calculate the great-circle distance between two geographic coordinates using the Haversine formula.
 * 
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers, rounded to 1 decimal place
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
    if (
        !Number.isFinite(lat1) || !Number.isFinite(lon1) ||
        !Number.isFinite(lat2) || !Number.isFinite(lon2)
    ) {
        return null
    }

    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const rLat1 = lat1 * (Math.PI / 180)
    const rLat2 = lat2 * (Math.PI / 180)

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rLat1) * Math.cos(rLat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const dist = EARTH_RADIUS_KM * c

    return Math.round(dist * 10) / 10
}

/**
 * Lookup coordinates for a given location query (city, governorate, or text)
 * 
 * @param {string} locationQuery Text query such as "Tunis", "Ariana, Ariana", "Paris", "Charguia"
 * @returns {{ lat: number, lon: number, name: string, type: 'governorate' | 'city' | 'global' } | null}
 */
export function resolveLocationCoordinates(locationQuery) {
    if (!locationQuery || typeof locationQuery !== 'string') return null
    const cleaned = cleanText(locationQuery)
    if (!cleaned) return null

    // 1. Direct governorate check
    for (const [gov, coords] of Object.entries(TUNISIAN_GOVERNORATE_COORDS)) {
        const cleanedGov = cleanText(gov)
        if (cleaned === cleanedGov) {
            return { ...coords, name: gov, type: 'governorate' }
        }
    }
    for (const [gov, coords] of Object.entries(TUNISIAN_GOVERNORATE_COORDS)) {
        const cleanedGov = cleanText(gov)
        if (cleaned.includes(cleanedGov)) {
            return { ...coords, name: gov, type: 'governorate' }
        }
    }

    // 2. Tunisian city / tech hub check (exact first, then longest substring match)
    const cityEntries = Object.entries(TUNISIAN_CITY_COORDS)
    for (const [city, data] of cityEntries) {
        if (cleaned === cleanText(city)) {
            return {
                lat: data.lat,
                lon: data.lon,
                name: `${city.charAt(0).toUpperCase() + city.slice(1)}, ${data.governorate}`,
                type: 'city'
            }
        }
    }

    // Sort by key length descending so "lac 2" matches before "lac"
    const sortedCities = [...cityEntries].sort((a, b) => b[0].length - a[0].length)
    for (const [city, data] of sortedCities) {
        const cleanedCity = cleanText(city)
        if (cleaned.includes(cleanedCity)) {
            return {
                lat: data.lat,
                lon: data.lon,
                name: `${city.charAt(0).toUpperCase() + city.slice(1)}, ${data.governorate}`,
                type: 'city'
            }
        }
    }

    // 3. Global city check (exact first, then longest substring)
    const globalEntries = Object.entries(GLOBAL_CITY_COORDS)
    for (const [city, data] of globalEntries) {
        if (cleaned === cleanText(city)) {
            return {
                lat: data.lat,
                lon: data.lon,
                name: `${city.charAt(0).toUpperCase() + city.slice(1)}, ${data.country}`,
                type: 'global'
            }
        }
    }
    const sortedGlobal = [...globalEntries].sort((a, b) => b[0].length - a[0].length)
    for (const [city, data] of sortedGlobal) {
        const cleanedCity = cleanText(city)
        if (cleaned.includes(cleanedCity)) {
            return {
                lat: data.lat,
                lon: data.lon,
                name: `${city.charAt(0).toUpperCase() + city.slice(1)}, ${data.country}`,
                type: 'global'
            }
        }
    }

    return null
}

const REMOTE_REGEX = /\b(remote|teletravail|wfh|distanciel|work from home|anywhere|worldwide|full-remote|100% remote)\b/i
const HYBRID_REGEX = /\b(hybrid|hybride)\b/i

/**
 * Parses an opportunity's location string and optional company domiciliation string.
 * 
 * Resolves:
 * - isRemote: boolean
 * - isHybrid: boolean
 * - isUnspecified: boolean
 * - locationDisplay: clean display name
 * - coords: { lat, lon } | null
 */
export function parseOpportunityLocation(offerLocation, companyLocation) {
    const rawOffer = `${offerLocation || ''}`.trim()
    const rawCompany = `${companyLocation || ''}`.trim()

    const combinedText = `${rawOffer} ${rawCompany}`.trim()
    const isRemote = REMOTE_REGEX.test(combinedText)
    const isHybrid = HYBRID_REGEX.test(combinedText)

    // Primary effective location string
    let effectiveLocationStr = rawOffer
    if (!effectiveLocationStr || cleanText(effectiveLocationStr) === 'remote') {
        effectiveLocationStr = rawCompany || ''
    }

    // If still empty or just generic remote
    const isUnspecified = !effectiveLocationStr || effectiveLocationStr.toLowerCase() === 'unspecified'

    // Try resolving coordinates
    let coords = null
    let resolvedName = null

    if (!isUnspecified) {
        const resolved = resolveLocationCoordinates(effectiveLocationStr)
        if (resolved) {
            coords = { lat: resolved.lat, lon: resolved.lon }
            resolvedName = resolved.name
        }
    }

    // Format clean display text
    let locationDisplay = rawOffer || rawCompany
    if (isRemote) {
        locationDisplay = isHybrid ? 'Hybrid / Télétravail partiel' : 'Remote · Télétravail'
    } else if (isUnspecified) {
        locationDisplay = 'Location not specified'
    } else if (resolvedName) {
        locationDisplay = resolvedName
    }

    return {
        isRemote,
        isHybrid,
        isUnspecified,
        rawLocation: rawOffer || rawCompany || '',
        locationDisplay,
        coords
    }
}

/**
 * Evaluates the real geographical distance between a reference origin and an opportunity.
 * 
 * @param {string | { lat: number, lon: number }} referenceLocation Student's base location string or coords
 * @param {string} offerLocation Offer location string (e.g. "Ariana", "Tunis, Tunis", "Remote")
 * @param {string} companyLocation Company domiciliation location string (fallback)
 * @returns {{
 *   distanceKm: number | null,
 *   isRemote: boolean,
 *   isHybrid: boolean,
 *   isUnspecified: boolean,
 *   locationDisplay: string,
 *   distanceFormatted: string | null
 * }}
 */
export function evaluateOpportunityDistance(referenceLocation, offerLocation, companyLocation) {
    const parsed = parseOpportunityLocation(offerLocation, companyLocation)

    if (parsed.isRemote && !parsed.coords) {
        return {
            distanceKm: null,
            isRemote: true,
            isHybrid: parsed.isHybrid,
            isUnspecified: false,
            locationDisplay: parsed.locationDisplay,
            distanceFormatted: 'Remote'
        }
    }

    // Resolve reference coordinates
    let refCoords = null
    if (referenceLocation && typeof referenceLocation === 'object' && Number.isFinite(referenceLocation.lat)) {
        refCoords = referenceLocation
    } else if (typeof referenceLocation === 'string' && referenceLocation.trim()) {
        const resolved = resolveLocationCoordinates(referenceLocation)
        if (resolved) {
            refCoords = { lat: resolved.lat, lon: resolved.lon }
        }
    }

    // If offer or company has no location specified
    if (parsed.isUnspecified || !parsed.coords) {
        return {
            distanceKm: null,
            isRemote: parsed.isRemote,
            isHybrid: parsed.isHybrid,
            isUnspecified: true,
            locationDisplay: parsed.locationDisplay,
            distanceFormatted: parsed.isRemote ? 'Remote' : null
        }
    }

    // If reference coordinates are not available
    if (!refCoords) {
        return {
            distanceKm: null,
            isRemote: parsed.isRemote,
            isHybrid: parsed.isHybrid,
            isUnspecified: false,
            locationDisplay: parsed.locationDisplay,
            distanceFormatted: null
        }
    }

    // Calculate real Haversine distance
    const distKm = calculateHaversineDistanceKm(
        refCoords.lat,
        refCoords.lon,
        parsed.coords.lat,
        parsed.coords.lon
    )

    const distanceFormatted = distKm != null
        ? `${Math.round(distKm)} km`
        : null

    return {
        distanceKm: distKm,
        isRemote: parsed.isRemote,
        isHybrid: parsed.isHybrid,
        isUnspecified: false,
        locationDisplay: parsed.locationDisplay,
        distanceFormatted
    }
}
