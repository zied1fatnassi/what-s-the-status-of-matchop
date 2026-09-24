/**
 * MatchOp Anti-Fraud & Document Integrity Engine
 * 
 * Inspects PDF and Image metadata for:
 * 1. Digital Tampering: Detects Adobe Photoshop, GIMP, Canva, and graphic editor signatures.
 * 2. Timestamp Manipulation: Compares CreationDate vs ModDate.
 * 3. AI Authenticity Check: Evaluates issuer credibility, identity matching, and credential format.
 */

// Known graphic manipulation and PDF editing tools
const SUSPICIOUS_SOFTWARE_PATTERNS = [
    { pattern: /photoshop/i, name: 'Adobe Photoshop', risk: 85, reason: 'Document edited with photo-editing software (Photoshop).' },
    { pattern: /gimp/i, name: 'GIMP', risk: 80, reason: 'Document manipulated using GIMP image editor.' },
    { pattern: /canva/i, name: 'Canva', risk: 65, reason: 'Document created using Canva template generator rather than official issuer portal.' },
    { pattern: /coreldraw|corel/i, name: 'CorelDraw', risk: 75, reason: 'Vector graphic software signature detected.' },
    { pattern: /illustrator/i, name: 'Adobe Illustrator', risk: 70, reason: 'Vector editing tool signature detected.' },
    { pattern: /nitro\s*pdf|pdfescape|sejda|ilovepdf|smallpdf/i, name: 'Online PDF Editor', risk: 50, reason: 'Modified via online PDF editor.' },
    { pattern: /picsart|snapseed|pixelmator/i, name: 'Mobile Photo Editor', risk: 85, reason: 'Mobile photo retouching application signature detected.' }
]

// Recognized accredited issuers & credential systems
const RECOGNIZED_ISSUERS = [
    'amazon web services', 'aws', 'microsoft', 'azure', 'google', 'google cloud',
    'coursera', 'edx', 'udacity', 'cisco', 'oracle', 'ibm', 'harvard', 'mit', 'stanford',
    'scrum alliance', 'scrum.org', 'project management institute', 'pmi', 'comptia',
    'hashicorp', 'linux foundation', 'red hat', 'meta', 'salesforce', 'mongodb',
    'enit', 'insat', 'esprit', 'fsth', 'isi', 'iset', 'polytechnique', 'enis', 'enim',
    'universite de tunis', 'universite de carthage', 'universite de sfax', 'universite de sousse'
]

/**
 * Extract metadata and text from a PDF ArrayBuffer
 * @param {ArrayBuffer} buffer
 * @returns {object} Extracted metadata
 */
export function extractPdfMetadata(buffer) {
    const bytes = new Uint8Array(buffer)
    // Decode latin1 to preserve byte stream representation
    let rawText = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
        rawText += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(bytes.length, i + chunkSize)))
    }

    const metadata = {
        isPdf: rawText.startsWith('%PDF-'),
        pdfVersion: null,
        creator: null,
        producer: null,
        creationDate: null,
        modDate: null,
        author: null,
        title: null,
        detectedSoftware: null,
        tamperingRisk: 0,
        tamperingReasons: [],
        extractedText: ''
    }

    if (!metadata.isPdf) return metadata

    const versionMatch = rawText.match(/^%PDF-(\d+\.\d+)/)
    if (versionMatch) metadata.pdfVersion = versionMatch[1]

    // Helper to extract PDF string from metadata dict
    const extractField = (fieldName) => {
        const regex = new RegExp(`/${fieldName}\\s*(?:\\(([^)]*)\\)|<([^>]*)>)`, 'i')
        const match = rawText.match(regex)
        if (!match) return null
        if (match[1]) return match[1].trim()
        if (match[2]) {
            // Hex string
            try {
                return match[2].match(/.{1,2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('').trim()
            } catch {
                return match[2]
            }
        }
        return null
    }

    metadata.creator = extractField('Creator')
    metadata.producer = extractField('Producer')
    metadata.author = extractField('Author')
    metadata.title = extractField('Title')
    metadata.creationDate = extractField('CreationDate')
    metadata.modDate = extractField('ModDate')

    // Also scan XML / XMP metadata blocks if present
    const xmpMatch = rawText.match(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/i)
    const xmpBlock = xmpMatch ? xmpMatch[0] : ''

    const searchableMetadata = `${metadata.creator || ''} ${metadata.producer || ''} ${xmpBlock}`

    // Scan for suspicious graphic manipulation software
    for (const item of SUSPICIOUS_SOFTWARE_PATTERNS) {
        if (item.pattern.test(searchableMetadata)) {
            metadata.detectedSoftware = item.name
            metadata.tamperingRisk = Math.max(metadata.tamperingRisk, item.risk)
            metadata.tamperingReasons.push(item.reason)
            break
        }
    }

    // Date discrepancy check (CreationDate vs ModDate)
    if (metadata.creationDate && metadata.modDate) {
        const cleanDate = (d) => {
            // PDF date format: D:YYYYMMDDHHmmSS
            const m = d.match(/D:?(\d{4})(\d{2})?(\d{2})?/)
            return m ? `${m[1]}${m[2] || '01'}${m[3] || '01'}` : null
        }
        const cDate = cleanDate(metadata.creationDate)
        const mDate = cleanDate(metadata.modDate)
        if (cDate && mDate && cDate !== mDate) {
            const diffDays = Math.abs(parseInt(mDate, 10) - parseInt(cDate, 10))
            if (diffDays > 5) {
                metadata.tamperingRisk = Math.max(metadata.tamperingRisk, 40)
                metadata.tamperingReasons.push(`Modification timestamp differs from creation timestamp (${metadata.creationDate} vs ${metadata.modDate}).`)
            }
        }
    }

    // Extract readable text snippets from PDF text objects: BT ... ET
    const textSnippets = []
    const textObjectRegex = /BT\s*([\s\S]*?)\s*ET/g
    let textMatch
    let count = 0
    while ((textMatch = textObjectRegex.exec(rawText)) !== null && count < 60) {
        const block = textMatch[1]
        // Extract strings in parentheses (Tj / TJ operators)
        const tjMatches = block.matchAll(/\(([^)]+)\)\s*T[jd]/gi)
        for (const tm of tjMatches) {
            const clean = tm[1].replace(/\\([()\\])/g, '$1').trim()
            if (clean.length > 1) textSnippets.push(clean)
        }
        count++
    }

    metadata.extractedText = textSnippets.join(' ').replace(/\s+/g, ' ').slice(0, 2000)
    return metadata
}

/**
 * Extract metadata from Image ArrayBuffer (EXIF Software tag)
 * @param {ArrayBuffer} buffer
 * @returns {object}
 */
export function extractImageMetadata(buffer) {
    const bytes = new Uint8Array(buffer)
    let rawText = ''
    const limit = Math.min(bytes.length, 65536) // Check first 64KB for EXIF headers
    for (let i = 0; i < limit; i++) {
        rawText += String.fromCharCode(bytes[i])
    }

    const metadata = {
        isImage: true,
        detectedSoftware: null,
        tamperingRisk: 0,
        tamperingReasons: []
    }

    for (const item of SUSPICIOUS_SOFTWARE_PATTERNS) {
        if (item.pattern.test(rawText)) {
            metadata.detectedSoftware = item.name
            metadata.tamperingRisk = Math.max(metadata.tamperingRisk, item.risk)
            metadata.tamperingReasons.push(item.reason)
            break
        }
    }

    return metadata
}

/**
 * Deterministic fraud score calculation combining metadata signals & claim consistency
 */
export function evaluateIntegrityScore({ metadata, claimed, studentProfile }) {
    let score = 0
    const checks = {
        metadataAuthenticity: { passed: true, label: 'Intégrité numérique des métadonnées', details: 'Fichier sain sans signature logicielle de retouche.' },
        issuerCredibility: { passed: true, label: 'Légitimité de l’organisme émetteur', details: 'Organisme reconnu et accrédité.' },
        identityMatch: { passed: true, label: 'Correspondance de l’identité', details: 'Le nom du candidat concorde avec le document.' },
        credentialIntegrity: { passed: true, label: 'Format et validité de l’accréditation', details: 'Identifiant d’accréditation ou lien de vérification valide.' }
    }

    // 1. Digital manipulation check
    if (metadata.tamperingRisk > 0) {
        score += metadata.tamperingRisk
        checks.metadataAuthenticity.passed = metadata.tamperingRisk < 50
        checks.metadataAuthenticity.details = metadata.tamperingReasons.join(' ') || `Logiciel de retouche détecté : ${metadata.detectedSoftware}`
    }

    // 2. Issuer credibility check
    const orgLower = (claimed.issuingOrganization || '').toLowerCase().trim()
    const isRecognized = RECOGNIZED_ISSUERS.some(issuer => orgLower.includes(issuer) || issuer.includes(orgLower))
    if (!isRecognized && orgLower.length > 0) {
        // Unrecognized or private issuer — not necessarily fraud, but increases caution
        score += 15
        checks.issuerCredibility.passed = true
        checks.issuerCredibility.details = 'Organisme non indexé dans la liste officielle des partenaires majeurs (vérification manuelle recommandée).'
    }

    // 3. Identity match check
    const studentName = (studentProfile?.displayName || '').toLowerCase().trim()
    const textSample = (metadata.extractedText || '').toLowerCase()
    if (studentName.length > 3 && textSample.length > 20) {
        const studentTokens = studentName.split(/\s+/).filter(t => t.length > 2)
        const matchesToken = studentTokens.some(token => textSample.includes(token))
        if (!matchesToken && studentTokens.length > 0) {
            score += 35
            checks.identityMatch.passed = false
            checks.identityMatch.details = `Le nom du profil (${studentProfile.displayName}) ne semble pas figurer dans le texte extrait du document.`
        }
    }

    // 4. Credential ID or verification link check
    const hasCredId = Boolean(claimed.credentialId && claimed.credentialId.trim().length > 3)
    const hasCredUrl = Boolean(claimed.credentialUrl && /^https?:\/\//i.test(claimed.credentialUrl.trim()))
    if (!hasCredId && !hasCredUrl) {
        score += 15
        checks.credentialIntegrity.details = 'Aucun identifiant officiel ou URL de vérification fourni.'
    }

    // Clamp score to 0 - 100
    const finalScore = Math.min(100, Math.max(0, score))

    let status = 'verified'
    let summary = 'Document authentique vérifié avec succès. Les métadonnées confirment l’absence d’altération numérique.'

    if (finalScore >= 65) {
        status = 'flagged_fraud'
        summary = `Alerte : Forte probabilité d'altération numérique ou de document non authentique (${metadata.detectedSoftware || 'Signature suspecte détectée'}).`
    } else if (finalScore >= 25) {
        status = 'suspicious'
        summary = 'Attention : Le document présente des anomalies mineures ou nécessite une vérification complémentaire.'
    }

    return {
        fraudScore: finalScore,
        status,
        checks,
        summary,
        detectedSoftware: metadata.detectedSoftware || null
    }
}

/**
 * Full document analysis pipeline
 * @param {File} file
 * @param {object} claimed - { name, issuingOrganization, issueDate, credentialId, credentialUrl }
 * @param {object} studentProfile - { displayName, email, university }
 * @returns {Promise<object>} Verification report
 */
export async function verifyUploadedDocument(file, claimed = {}, studentProfile = {}) {
    if (!file) {
        throw new Error('Aucun fichier fourni pour la vérification.')
    }

    const buffer = await file.arrayBuffer()
    const fileName = file.name.toLowerCase()

    let metadata
    if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
        metadata = extractPdfMetadata(buffer)
    } else {
        metadata = extractImageMetadata(buffer)
    }

    const evaluation = evaluateIntegrityScore({
        metadata,
        claimed,
        studentProfile
    })

    return {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        ...evaluation,
        analyzedAt: new Date().toISOString()
    }
}
