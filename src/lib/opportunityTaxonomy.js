/**
 * Opportunity Taxonomy & Normalization Engine for MatchOp
 * 
 * Unifies:
 * 1. Opportunity types (Internships / Stage / PFE, Full-time / CDI, Part-time, Contract / Freelance)
 *    across internal offers and external ATS scrapers (Greenhouse, Lever, Workable, etc.)
 * 2. Industry category mapping and matching
 */

export const OPPORTUNITY_TYPES = {
    ALL: 'all',
    INTERNSHIP: 'internship',
    FULL_TIME: 'full-time',
    PART_TIME: 'part-time',
    CONTRACT: 'contract',
}

const INTERNSHIP_KEYWORDS = [
    'intern',
    'internship',
    'stage',
    'stagiaire',
    'pfe',
    'pfa',
    'alternance',
    'alternant',
    'apprentice',
    'apprenti',
    'trainee',
]

const FULL_TIME_KEYWORDS = [
    'full-time',
    'fulltime',
    'full time',
    'cdi',
    'temps plein',
    'permanent',
    'regular',
]

const PART_TIME_KEYWORDS = [
    'part-time',
    'parttime',
    'part time',
    'temps partiel',
    'mi-temps',
]

const CONTRACT_KEYWORDS = [
    'contract',
    'contractor',
    'contractuel',
    'cdd',
    'freelance',
    'freelancer',
    'prestataire',
    'prestation',
    'temporary',
    'interim',
    'fixed-term',
]

/**
 * Standard industry categories
 */
export const CURATED_CATEGORIES = [
    { id: 'all', labelEn: 'All Industries', labelFr: 'Tous les secteurs' },
    { id: 'tech', labelEn: 'Software & Technology', labelFr: 'Informatique & Tech' },
    { id: 'ai_data', labelEn: 'AI & Data Science', labelFr: 'IA & Science des Données' },
    { id: 'design', labelEn: 'Product & Design', labelFr: 'Design & Produit' },
    { id: 'marketing', labelEn: 'Marketing & Growth', labelFr: 'Marketing & Communication' },
    { id: 'business', labelEn: 'Finance, Sales & Operations', labelFr: 'Finance & Gestion' },
    { id: 'engineering', labelEn: 'Hardware & Engineering', labelFr: 'Ingénierie & Industrie' },
    { id: 'healthcare', labelEn: 'HealthTech & Bio', labelFr: 'Santé & Sciences' },
    { id: 'other', labelEn: 'Other Fields', labelFr: 'Autres domaines' },
]

function clean(val) {
    return String(val || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

/**
 * Resolves and normalizes the opportunity type for any offer or job.
 * 
 * Inspects:
 * 1. Explicit offer type / job_type
 * 2. Title keywords
 * 3. Description keywords (fallback)
 * 
 * @param {Object} offer Offer object
 * @returns {{
 *   key: 'internship' | 'full-time' | 'part-time' | 'contract',
 *   labelEn: string,
 *   labelFr: string,
 *   badge: string
 * }}
 */
export function resolveOpportunityType(offer) {
    const rawType = clean(offer?.type || offer?.job_type || offer?.opportunityType)
    const title = clean(offer?.title)
    const desc = clean(offer?.description)

    // Check internship
    if (
        INTERNSHIP_KEYWORDS.some((kw) => rawType.includes(kw)) ||
        INTERNSHIP_KEYWORDS.some((kw) => title.includes(kw))
    ) {
        return {
            key: OPPORTUNITY_TYPES.INTERNSHIP,
            labelEn: 'Internship / Stage',
            labelFr: 'Stage / PFE',
            badge: 'Stage'
        }
    }

    // Check part-time
    if (
        PART_TIME_KEYWORDS.some((kw) => rawType.includes(kw)) ||
        PART_TIME_KEYWORDS.some((kw) => title.includes(kw))
    ) {
        return {
            key: OPPORTUNITY_TYPES.PART_TIME,
            labelEn: 'Part-time',
            labelFr: 'Temps partiel',
            badge: 'Part-time'
        }
    }

    // Check contract / freelance
    if (
        CONTRACT_KEYWORDS.some((kw) => rawType.includes(kw)) ||
        CONTRACT_KEYWORDS.some((kw) => title.includes(kw))
    ) {
        return {
            key: OPPORTUNITY_TYPES.CONTRACT,
            labelEn: 'Contract / Freelance',
            labelFr: 'Contrat / Freelance',
            badge: 'Contract'
        }
    }

    // Check full-time
    if (
        FULL_TIME_KEYWORDS.some((kw) => rawType.includes(kw)) ||
        FULL_TIME_KEYWORDS.some((kw) => title.includes(kw))
    ) {
        return {
            key: OPPORTUNITY_TYPES.FULL_TIME,
            labelEn: 'Full-time / CDI',
            labelFr: 'CDI / Temps plein',
            badge: 'Full-time'
        }
    }

    // Description fallback if title and type were ambiguous
    if (INTERNSHIP_KEYWORDS.some((kw) => desc.includes(kw))) {
        return {
            key: OPPORTUNITY_TYPES.INTERNSHIP,
            labelEn: 'Internship / Stage',
            labelFr: 'Stage / PFE',
            badge: 'Stage'
        }
    }

    // Default to Full-time
    return {
        key: OPPORTUNITY_TYPES.FULL_TIME,
        labelEn: 'Full-time',
        labelFr: 'Temps plein',
        badge: 'Full-time'
    }
}

/**
 * Checks if an opportunity matches the selected opportunity type preference.
 * 
 * @param {Object} offer Offer object
 * @param {string} preferenceType Selected type ('all', 'internship', 'full-time', etc.)
 * @returns {boolean}
 */
export function matchesOpportunityType(offer, preferenceType) {
    if (!preferenceType || preferenceType === OPPORTUNITY_TYPES.ALL) return true
    const resolved = resolveOpportunityType(offer)
    return resolved.key === preferenceType
}

/**
 * Checks if an opportunity matches the selected industry category.
 * 
 * @param {Object} offer Offer object
 * @param {string} categoryId Selected category id or raw string ('all', 'tech', 'ai_data', etc.)
 * @returns {boolean}
 */
export function matchesOpportunityCategory(offer, categoryId) {
    if (!categoryId || categoryId === 'all') return true

    const haystack = clean(
        `${offer?.industry || ''} ${offer?.department || ''} ${offer?.company || ''} ${offer?.title || ''}`
    )

    switch (categoryId) {
        case 'tech':
            return /software|developp|develop|web|it|tech|cloud|devops|full stack|frontend|backend|mobile|informatique|systeme/i.test(haystack)
        case 'ai_data':
            return /ai|ia|data|machine learning|deep learning|nlp|analytics|intelligence artificielle|vision/i.test(haystack)
        case 'design':
            return /design|ux|ui|graphic|graphique|creati|figma|motion/i.test(haystack)
        case 'marketing':
            return /market|growth|content|social media|comm|seo|pub/i.test(haystack)
        case 'business':
            return /business|finance|sale|ventes|comptab|gestion|rh|hr|recrut|manage|admin|operations/i.test(haystack)
        case 'engineering':
            return /engineer|ingenieur|mecanique|electri|iot|hardware|robot|industr|chimie/i.test(haystack)
        case 'healthcare':
            return /health|sante|med|bio|pharma|clinique/i.test(haystack)
        case 'other':
            return true
        default:
            // Match custom/dynamic category string directly
            return haystack.includes(clean(categoryId))
    }
}
