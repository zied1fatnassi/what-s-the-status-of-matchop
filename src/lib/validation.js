/**
 * Validation utilities for authentication
 * Provides strong password validation and email validation
 */

/**
 * Password requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*(),.?":{}|<>)
 */
export const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean, errors: string[], strength: number }}
 */
export function validatePassword(password) {
    const errors = []
    let strength = 0

    if (!password) {
        return { valid: false, errors: ['Password is required'], strength: 0 }
    }

    // Check minimum length
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`)
    } else {
        strength += 20
    }

    // Check for uppercase
    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
    } else {
        strength += 20
    }

    // Check for lowercase
    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
    } else {
        strength += 20
    }

    // Check for number
    if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number')
    } else {
        strength += 20
    }

    // Check for special character
    if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*)')
    } else {
        strength += 20
    }

    return {
        valid: errors.length === 0,
        errors,
        strength: Math.min(strength, 100),
    }
}

/**
 * Get password strength label and color
 * @param {number} strength - Password strength (0-100)
 * @returns {{ label: string, color: string }}
 */
export function getPasswordStrengthInfo(strength) {
    if (strength < 40) {
        return { label: 'Weak', color: '#ef4444' }
    } else if (strength < 60) {
        return { label: 'Fair', color: '#f97316' }
    } else if (strength < 80) {
        return { label: 'Good', color: '#eab308' }
    } else {
        return { label: 'Strong', color: '#10b981' }
    }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateEmail(email) {
    if (!email) {
        return { valid: false, error: 'Email is required' }
    }

    // Basic email regex - more permissive than strict RFC 5322
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Please enter a valid email address' }
    }

    return { valid: true, error: null }
}

/**
 * Validate name (non-empty, reasonable length)
 * @param {string} name - Name to validate
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateName(name) {
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Name is required' }
    }

    if (name.trim().length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters' }
    }

    if (name.trim().length > 100) {
        return { valid: false, error: 'Name must be less than 100 characters' }
    }

    return { valid: true, error: null }
}

/**
 * Map Supabase auth error codes to user-friendly messages
 * @param {Error} error - Supabase error object
 * @returns {string} User-friendly error message
 */
export function getAuthErrorMessage(error) {
    const errorCode = error?.code || error?.message || ''

    const errorMessages = {
        'invalid_credentials': 'Invalid email or password. Please try again.',
        'user_not_found': 'No account found with this email address.',
        'email_not_confirmed': 'Please verify your email before logging in.',
        'invalid_login_credentials': 'Invalid email or password. Please try again.',
        'email_address_invalid': 'Please enter a valid email address.',
        'weak_password': 'Password is too weak. Please choose a stronger password.',
        'user_already_exists': 'An account with this email already exists. Please sign in instead.',
        'over_request_rate_limit': 'Too many attempts. Please wait a moment and try again.',
        'over_email_send_rate_limit': 'Email rate limit reached. Please wait a few minutes before trying again.',
        'confirmation email': 'Unable to send confirmation email. Check your Supabase SMTP settings or run database/auto_confirm_emails.sql for local testing.',
        'error sending confirmation email': 'Unable to send confirmation email. Check your Supabase SMTP settings or run database/auto_confirm_emails.sql for local testing.',
        'signup_disabled': 'Sign up is currently disabled. Please contact support.',
    }

    // Check for matching error code
    for (const [code, message] of Object.entries(errorMessages)) {
        if (errorCode.toLowerCase().includes(code.toLowerCase())) {
            return message
        }
    }

    // Default message
    return error?.message || 'An error occurred. Please try again.'
}

/**
 * Tunisian governorates (24 total)
 */
export const TUNISIAN_GOVERNORATES = [
    'Ariana',
    'Béja',
    'Ben Arous',
    'Bizerte',
    'Gabès',
    'Gafsa',
    'Jendouba',
    'Kairouan',
    'Kasserine',
    'Kébili',
    'Le Kef',
    'Mahdia',
    'La Manouba',
    'Médenine',
    'Monastir',
    'Nabeul',
    'Sfax',
    'Sidi Bouzid',
    'Siliana',
    'Sousse',
    'Tataouine',
    'Tozeur',
    'Tunis',
    'Zaghouan',
]

/**
 * Cities by governorate mapping
 */
export const CITIES_BY_GOVERNORATE = {
    'Ariana': ['Ariana', 'La Marsa', 'Ettadhamen', 'Charguia', 'Raoued', 'Sidi Thabet', 'Boumhel', 'El Mourouj', 'Soukra', 'El Menzah', 'El Omrane'],
    'Béja': ['Béja', 'Testour', 'Nefza', 'Medjez el Bab', 'Téboursouk', 'Bou Arada', 'Oued Zarga'],
    'Ben Arous': ['Ben Arous', 'Hammam Lif', 'Rades', 'Ezzahra', 'Mohamedia', 'Fouchana', 'Mornag', 'Rejiche', 'Sidi Bou Said', 'Sidi Daoud'],
    'Bizerte': ['Bizerte', 'Menzel Bourguiba', 'Menzel Jemil', 'Menzel Abderrahmane', 'Menzel Temime', 'Ghar el Melh', 'Ras Jebel', 'Sidi Salem', 'Ghezala', 'Sejnane', 'El Alia'],
    'Gabès': ['Gabès', 'Médenine', 'Matmata', 'Zarzis', 'Djerba', 'Ghannouch'],
    'Gafsa': ['Gafsa', 'Redeyef', 'Métlaoui', 'Sidi Aïch', 'El Guettar', 'Moularès', 'El Ksar', 'Oum El Araies'],
    'Jendouba': ['Jendouba', 'Tabarka', 'Ghardimaou', 'Oued Meliz', 'Aïn Draham', 'Testour', 'Téboursouk', 'Bou Arada', 'Oued Zarga'],
    'Kairouan': ['Kairouan', 'El Djem', 'Hajeb El Ayoun', 'Sidi El Hani', 'Oueslatia', 'Haffouz'],
    'Kasserine': ['Kasserine', 'Sbeitla', 'Thala', 'Feriana', 'Haidra', 'El Ksour'],
    'Kébili': ['Kébili', 'Douz', 'El Hamma'],
    'Le Kef': ['Le Kef', 'Sakiet Sidi Youssef', 'Sakiet El Zit'],
    'Mahdia': ['Mahdia', 'El Jem', 'Boumerdes'],
    'La Manouba': ['La Manouba', 'Oued Ellil', 'Borj El Amri'],
    'Médenine': ['Médenine', 'Zarzis', 'Djerba', 'Ben Gardane'],
    'Monastir': ['Monastir', 'Moknine', 'Sahline'],
    'Nabeul': ['Nabeul', 'Hammamet', 'Korba', 'Kélibia', 'El Haouaria'],
    'Sfax': ['Sfax', 'Sakiet Ezzit'],
    'Sidi Bouzid': ['Sidi Bouzid', 'Regueb'],
    'Siliana': ['Siliana', 'Kef', 'El Kef'],
    'Sousse': ['Sousse', 'Hammam Sousse', 'Sidi Bou Ali'],
    'Tataouine': ['Tataouine', 'Remada'],
    'Tozeur': ['Tozeur', 'Nefta'],
    'Tunis': ['Tunis', 'Ariana', 'Ben Arous', 'La Marsa', 'Sidi Bou Said', 'La Goulette', 'Carthage', 'El Manar', 'El Menzah', 'El Omrane'],
    'Zaghouan': ['Zaghouan', 'Hammam Zriba'],
}

/**
 * Legacy: All Tunisian cities in a flat array (for backward compatibility)
 * @deprecated Use TUNISIAN_GOVERNORATES and CITIES_BY_GOVERNORATE instead
 */
export const TUNISIAN_CITIES = [
    'Tunis', 'Ariana', 'Ben Arous', 'La Marsa', 'Nabeul', 'Zaghouan', 'Bizerte',
    'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia',
    'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabès', 'Médenine',
    'Tataouine', 'Gafsa', 'Tozeur', 'Kébili', 'La Manouba', 'Hammam Lif',
    'Hammamet', 'Rades', 'Ezzahra', 'Mohamedia', 'Carthage', 'Sidi Bou Said',
]

/**
 * Tunisian universities for autocomplete (2025-2026)
 * Includes public universities, private universities, and major institutes
 */
export const TUNISIAN_UNIVERSITIES = [
    // Public Universities
    'Université de Tunis',
    'Université de Tunis El Manar',
    'Université de Carthage',
    'Université de Sousse',
    'Université de Sfax',
    'Université de la Manouba',
    'Université de Monastir',
    'Université Ez-Zitouna',
    'Université Virtuelle de Tunis',
    'Université de Gafsa',
    'Université de Jendouba',
    'Université de Kairouan',
    'Université de Gabès',

    // Engineering Schools (ENI)
    'Ecole Nationale d\'Ingénieurs de Tunis (ENIT)',
    'Ecole Nationale d\'Ingénieurs de Carthage (ENICARTHAGE)',
    'Ecole Nationale d\'Ingénieurs de Sousse (ENISO)',
    'Ecole Nationale d\'Ingénieurs de Sfax (ENIS)',
    'Ecole Nationale d\'Ingénieurs de Monastir (ENIM)',
    'Ecole Nationale d\'Ingénieurs de Bizerte (ENIB)',
    'Ecole Nationale d\'Ingénieurs de Gabès (ENIG)',
    'Ecole Nationale d\'Ingénieurs de Tunis (Manar)',

    // Computer Science & IT
    'Ecole Nationale des Sciences de l\'Informatique (ENSI)',
    'Institut Supérieur d\'Informatique (ISI)',
    'Ecole Supérieure de Technologie et d\'Informatique (ESTI)',
    'Institut National des Sciences Appliquées et de Technologie (INSAT)',
    'Sup\'Com',

    // Business & Management (Public)
    'Institut Supérieur de Gestion (ISG Tunis)',
    'Institut Supérieur de Gestion de Sousse (ISG Sousse)',
    'Institut Supérieur de Gestion de Gabès (ISG Gabès)',
    'Ecole Supérieure de Commerce (ESC Tunis)',
    'Institut des Hautes Etudes Commerciales (IHEC Carthage)',
    'Institut Supérieur de Commerce International (ISCI)',

    // ISET (Instituts Supérieurs des Etudes Technologiques)
    'ISET Nabeul',
    'ISET Bizerte',
    'ISET Sousse',
    'ISET Sfax',
    'ISET Kairouan',

    // Private Universities & Schools
    'ESPRIT',
    'Université Centrale',
    'Université Libre de Tunis (ULT)',
    'Université Internationale de Tunis (UIT)',
    'Polytech Intl',
    'Ecole Polytechnique de Tunis (EPT)',
    'Mediterranean School of Business (MSB)',
    'Business School Tunis (ESPRIT BS)',

    // Private Engineering & IT
    'SESAME University',
    'SUPTEL',
    'TEK-UP',
    'HORIZON',
    'IHEC Carthage',
    'Ecole Supérieure Privée d\'Ingénierie et de Technologie (ESPIT)',
    'Ecole Supérieure Privée de Technologie et de Management (ESPTM)',
    'Institut Supérieur Privé de Technologies de l\'Information (ESPRIT)',

    // Specialized Schools
    'Ecole Nationale d\'Architecture et d\'Urbanisme (ENAU)',
    'Institut Supérieur des Beaux-Arts de Tunis (ISBAT)',
    'Institut Supérieur de Musique de Tunis',
    'Institut Supérieur du Sport et de l\'Education Physique (ISSEP)',
    'Institut Préparatoire aux Etudes d\'Ingénieurs (IPEI)',
    'Institut Préparatoire aux Etudes Scientifiques et Techniques (IPEST)',

    // Medicine & Health
    'Faculté de Médecine de Tunis',
    'Faculté de Médecine de Sousse',
    'Faculté de Médecine de Sfax',
    'Faculté de Médecine de Monastir',
    'Faculté de Pharmacie de Monastir',
    'Institut Supérieur des Sciences Infirmières',

    // Law & Social Sciences
    'Faculté des Sciences Juridiques, Politiques et Sociales de Tunis',
    'Faculté de Droit de Sfax',
    'Ecole Nationale d\'Administration (ENA)',

    // Economics & Management
    'Faculté des Sciences Economiques et de Gestion de Tunis (FSEGT)',
    'Faculté des Sciences Economiques et de Gestion de Sfax (FSEGS)',
    'Faculté des Sciences Economiques et de Gestion de Sousse (FSEGS)',
]

/**
 * Tunisian Academic Programs by Level
 * Comprehensive list of degrees offered across Tunisian universities
 */

// Licence (Bachelor) Programs
export const LICENCE_PROGRAMS = [
    'Licence en Sciences de la Vie et de la Terre',
    'Licence en Sciences Humaines et Sociales',
    'Licence en Droit',
    'Licence en Sciences Économiques et de Gestion',
    'Licence en Informatique',
    'Licence en Mathématiques',
    'Licence en Physique',
    'Licence en Chimie',
    'Licence en Biologie',
    'Licence en Génie Civil',
    'Licence en Génie Mécanique',
    'Licence en Génie Électrique',
    'Licence en Architecture',
    'Licence en Arts et Lettres',
    'Licence en Langues Étrangères Appliquées',
    'Licence en Sciences Politiques',
    'Licence en Psychologie',
    'Licence en Sciences de l\'Éducation',
    'Licence en Sciences de l\'Information et de la Communication',
    'Licence en Tourisme et Hôtellerie',
    'Licence en Environnement et Développement Durable',
    'Licence en Sciences de l\'Alimentation',
    'Licence en Sciences de la Santé',
    'Licence en Sciences Infirmières',
    'Licence en Pharmacie',
    'Licence en Médecine Vétérinaire',
]

// Cycle d'Ingénieur (Engineering Cycle)
export const INGENIEUR_PROGRAMS = [
    'Cycle d\'Ingénieur en Génie Civil',
    'Cycle d\'Ingénieur en Génie Mécanique',
    'Cycle d\'Ingénieur en Génie Électrique',
    'Cycle d\'Ingénieur en Génie Informatique',
    'Cycle d\'Ingénieur en Génie Industriel',
    'Cycle d\'Ingénieur en Génie des Procédés',
    'Cycle d\'Ingénieur en Génie des Matériaux',
    'Cycle d\'Ingénieur en Génie Biotechnologique',
    'Cycle d\'Ingénieur en Génie de l\'Environnement',
    'Cycle d\'Ingénieur en Génie de la Production',
    'Cycle d\'Ingénieur en Génie Énergétique',
    'Cycle d\'Ingénieur en Génie des Télécommunications',
    'Cycle d\'Ingénieur en Génie Logiciel',
    'Cycle d\'Ingénieur en Réseaux et Sécurité',
]

// Master Programs
export const MASTER_PROGRAMS = [
    'Master en Sciences Humaines et Sociales',
    'Master en Droit',
    'Master en Sciences Économiques et de Gestion',
    'Master en Informatique',
    'Master en Mathématiques',
    'Master en Physique',
    'Master en Chimie',
    'Master en Biologie',
    'Master en Génie Civil',
    'Master en Génie Mécanique',
    'Master en Génie Électrique',
    'Master en Génie Informatique',
    'Master en Architecture',
    'Master en Arts et Lettres',
    'Master en Langues Étrangères Appliquées',
    'Master en Sciences Politiques',
    'Master en Psychologie',
    'Master en Sciences de l\'Éducation',
    'Master en Sciences de l\'Information et de la Communication',
    'Master en Tourisme et Hôtellerie',
    'Master en Environnement et Développement Durable',
    'Master en Sciences de l\'Alimentation',
    'Master en Sciences de la Santé',
    'Master en Gestion des Ressources Humaines',
    'Master en Finance',
    'Master en Marketing',
    'Master en Commerce International',
    'Master en Business Intelligence',
    'Master en Data Science',
    'Master en Cybersécurité',
    'Master en Intelligence Artificielle',
    'Master en Systèmes Embarqués',
    'Master en Génie Logiciel',
]

// Doctorat (PhD) Programs
export const DOCTORAT_PROGRAMS = [
    'Doctorat en Sciences Humaines et Sociales',
    'Doctorat en Droit',
    'Doctorat en Sciences Économiques et de Gestion',
    'Doctorat en Informatique',
    'Doctorat en Mathématiques',
    'Doctorat en Physique',
    'Doctorat en Chimie',
    'Doctorat en Biologie',
    'Doctorat en Génie Civil',
    'Doctorat en Génie Mécanique',
    'Doctorat en Génie Électrique',
    'Doctorat en Génie Informatique',
    'Doctorat en Architecture',
    'Doctorat en Arts et Lettres',
    'Doctorat en Langues Étrangères Appliquées',
    'Doctorat en Sciences Politiques',
    'Doctorat en Psychologie',
    'Doctorat en Sciences de l\'Éducation',
    'Doctorat en Sciences de l\'Information et de la Communication',
    'Doctorat en Tourisme et Hôtellerie',
    'Doctorat en Environnement et Développement Durable',
    'Doctorat en Sciences de l\'Alimentation',
    'Doctorat en Sciences de la Santé',
    'Doctorat en Gestion des Ressources Humaines',
    'Doctorat en Finance',
    'Doctorat en Marketing',
    'Doctorat en Commerce International',
]

// Degree levels for selection
export const DEGREE_LEVELS = [
    'Licence / Bachelor',
    'Cycle d\'Ingénieur',
    'Master',
    'Doctorat / PhD',
    'Diplôme Universitaire de Technologie (DUT)',
    'Brevet de Technicien Supérieur (BTS)',
]

// All programs combined (for autocomplete if degree level not selected)
export const ALL_ACADEMIC_PROGRAMS = [
    ...LICENCE_PROGRAMS,
    ...INGENIEUR_PROGRAMS,
    ...MASTER_PROGRAMS,
    ...DOCTORAT_PROGRAMS,
]

/**
 * Validate Tunisian phone number
 * Format: +216 XX XXX XXX or +216XXXXXXXX
 * @param {string} phone - Phone number to validate
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateTunisianPhone(phone) {
    if (!phone || phone.trim().length === 0) {
        return { valid: false, error: 'Numéro de téléphone requis / Phone number required' }
    }

    // Remove spaces and check format
    const cleanPhone = phone.replace(/\s/g, '')

    // Must start with +216 and have 8 more digits
    const phoneRegex = /^\+216[0-9]{8}$/

    if (!phoneRegex.test(cleanPhone)) {
        return {
            valid: false,
            error: 'Format invalide. Utilisez: +216 XX XXX XXX / Invalid format. Use: +216 XX XXX XXX'
        }
    }

    return { valid: true, error: null }
}

/**
 * Validate URL (strict https:// or http:// required)
 * @param {string} url - URL to validate
 * @param {boolean} required - Whether the URL is required
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateURL(url, required = false) {
    if (!url || url.trim().length === 0) {
        if (required) {
            return { valid: false, error: 'Lien requis / Link required' }
        }
        return { valid: true, error: null }
    }

    // Must start with http:// or https://
    const urlRegex = /^https?:\/\/.+/

    if (!urlRegex.test(url.trim())) {
        return {
            valid: false,
            error: 'Veuillez entrer un lien valide (ex: https://example.com) / Please enter a valid link (e.g., https://example.com)'
        }
    }

    return { valid: true, error: null }
}

/**
 * Validate Tunisian location/city
 * @param {string} city - City name to validate
 * @param {boolean} allowOther - Whether to allow cities not in the list
 * @returns {{ valid: boolean, error: string | null, suggestion: string | null }}
 */
export function validateLocation(city, allowOther = true) {
    if (!city || city.trim().length === 0) {
        return { valid: false, error: 'Ville requise / City required', suggestion: null }
    }

    const normalizedCity = city.trim()

    // Check if it's in the list (case-insensitive)
    const isInList = TUNISIAN_CITIES.some(
        c => c.toLowerCase() === normalizedCity.toLowerCase()
    )

    if (isInList || allowOther) {
        return { valid: true, error: null, suggestion: null }
    }

    // Find similar cities for suggestion
    const similar = TUNISIAN_CITIES.find(c =>
        c.toLowerCase().startsWith(normalizedCity.toLowerCase().substring(0, 2))
    )

    return {
        valid: false,
        error: 'Ville non reconnue / City not recognized',
        suggestion: similar || TUNISIAN_CITIES[0]
    }
}

/**
 * Validate date range (start must be before or equal to end)
 * @param {string} startDate - Start date (YYYY-MM format)
 * @param {string} endDate - End date (YYYY-MM format)
 * @param {boolean} isCurrent - Whether the item is current (ongoing)
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateDateRange(startDate, endDate, isCurrent = false) {
    if (!startDate) {
        return { valid: false, error: 'Date de début requise / Start date required' }
    }

    // If current, end date is not needed
    if (isCurrent) {
        return { valid: true, error: null }
    }

    if (!endDate) {
        return { valid: true, error: null } // End date is optional if not current
    }

    // Parse dates (format: YYYY-MM)
    const start = new Date(startDate + '-01')
    const end = new Date(endDate + '-01')

    if (end < start) {
        return {
            valid: false,
            error: 'La date de fin doit être après la date de début / End date must be after start date'
        }
    }

    return { valid: true, error: null }
}

/**
 * Validate that a date is not in the future
 * @param {string} date - Date to validate (YYYY-MM format)
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validatePastDate(date) {
    if (!date) {
        return { valid: true, error: null } // Optional field
    }

    const inputDate = new Date(date + '-01')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (inputDate > today) {
        return {
            valid: false,
            error: 'La date ne peut pas être dans le futur / Date cannot be in the future'
        }
    }

    return { valid: true, error: null }
}

/**
 * Validate numeric value within a range
 * @param {string} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {boolean} required - Whether the value is required
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateNumeric(value, min = 0, max = 999999, required = false) {
    if (!value || value.trim().length === 0) {
        if (required) {
            return { valid: false, error: 'Valeur requise / Value required' }
        }
        return { valid: true, error: null }
    }

    const num = Number(value)

    if (isNaN(num)) {
        return {
            valid: false,
            error: 'Doit être un nombre / Must be a number'
        }
    }

    if (num < min || num > max) {
        return {
            valid: false,
            error: `Doit être entre ${min} et ${max} / Must be between ${min} and ${max}`
        }
    }

    return { valid: true, error: null }
}

/**
 * Validate text length
 * @param {string} text - Text to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @param {string} fieldName - Name of the field for error message
 * @param {boolean} required - Whether the field is required
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateTextLength(text, min, max, fieldName = 'Ce champ', required = false) {
    if (!text || text.trim().length === 0) {
        if (required) {
            return { valid: false, error: `${fieldName} est requis / ${fieldName} is required` }
        }
        return { valid: true, error: null }
    }

    const length = text.trim().length

    if (length < min) {
        return {
            valid: false,
            error: `${fieldName} doit contenir au moins ${min} caractères / ${fieldName} must be at least ${min} characters`
        }
    }

    if (length > max) {
        return {
            valid: false,
            error: `${fieldName} ne peut pas dépasser ${max} caractères / ${fieldName} cannot exceed ${max} characters`
        }
    }

    return { valid: true, error: null }
}

/**
 * Validate professional text (no emojis, minimum quality)
 * @param {string} text - Text to validate
 * @param {number} minLength - Minimum length for quality
 * @returns {{ valid: boolean, error: string | null, warnings: string[] }}
 */
export function validateProfessionalText(text, minLength = 50) {
    if (!text || text.trim().length === 0) {
        return { valid: true, error: null, warnings: [] }
    }

    const warnings = []

    // Check for emojis
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    if (emojiRegex.test(text)) {
        warnings.push('Évitez les emojis dans les textes professionnels / Avoid emojis in professional text')
    }

    // Check minimum length for quality
    if (text.trim().length < minLength) {
        warnings.push(`Pour plus de qualité, ajoutez au moins ${minLength} caractères / For better quality, add at least ${minLength} characters`)
    }

    return { valid: true, error: null, warnings }
}

export default {
    validatePassword,
    validateEmail,
    validateName,
    getPasswordStrengthInfo,
    getAuthErrorMessage,
    PASSWORD_REQUIREMENTS,
    // Tunisian-specific validators
    validateTunisianPhone,
    validateURL,
    validateLocation,
    validateDateRange,
    validatePastDate,
    validateNumeric,
    validateTextLength,
    validateProfessionalText,
    // Constants
    TUNISIAN_GOVERNORATES,
    CITIES_BY_GOVERNORATE,
    TUNISIAN_CITIES,
    TUNISIAN_UNIVERSITIES,
    LICENCE_PROGRAMS,
    INGENIEUR_PROGRAMS,
    MASTER_PROGRAMS,
    DOCTORAT_PROGRAMS,
    DEGREE_LEVELS,
    ALL_ACADEMIC_PROGRAMS,
}
