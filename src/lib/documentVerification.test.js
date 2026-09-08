import { describe, it, expect } from 'vitest'
import {
    extractPdfMetadata,
    extractImageMetadata,
    evaluateIntegrityScore
} from './documentVerification'

describe('documentVerification - Metadata Extraction & Anti-Tampering Engine', () => {
    it('detects legitimate PDF without suspicious software', () => {
        const samplePdf = `%PDF-1.4\n1 0 obj\n<< /Title (Official Certificate) /Creator (LaTeX with hyperref) /Producer (pdfTeX-1.40.21) /CreationDate (D:20260115120000) /ModDate (D:20260115120000) >>\nendobj\ntrailer\n<< /Info 1 0 R >>\n%%EOF`
        const buffer = new TextEncoder().encode(samplePdf).buffer
        const metadata = extractPdfMetadata(buffer)

        expect(metadata.isPdf).toBe(true)
        expect(metadata.pdfVersion).toBe('1.4')
        expect(metadata.creator).toBe('LaTeX with hyperref')
        expect(metadata.detectedSoftware).toBeNull()
        expect(metadata.tamperingRisk).toBe(0)
    })

    it('detects Adobe Photoshop signature in PDF metadata and raises high risk', () => {
        const photoshopPdf = `%PDF-1.6\n1 0 obj\n<< /Title (Degree Certificate) /Creator (Adobe Photoshop 24.1) /Producer (Adobe Photoshop PDF) /CreationDate (D:20260110100000) /ModDate (D:20260110110000) >>\nendobj\n%%EOF`
        const buffer = new TextEncoder().encode(photoshopPdf).buffer
        const metadata = extractPdfMetadata(buffer)

        expect(metadata.isPdf).toBe(true)
        expect(metadata.detectedSoftware).toBe('Adobe Photoshop')
        expect(metadata.tamperingRisk).toBeGreaterThanOrEqual(80)
        expect(metadata.tamperingReasons.length).toBeGreaterThan(0)
    })

    it('detects Canva template generator signature', () => {
        const canvaPdf = `%PDF-1.5\n1 0 obj\n<< /Creator (Canva) /Producer (Skia/PDF m115) >>\nendobj\n%%EOF`
        const buffer = new TextEncoder().encode(canvaPdf).buffer
        const metadata = extractPdfMetadata(buffer)

        expect(metadata.detectedSoftware).toBe('Canva')
        expect(metadata.tamperingRisk).toBe(65)
    })

    it('detects GIMP image manipulation signature in EXIF', () => {
        const gimpExif = `Exif\x00\x00II*\x00\x08\x00\x00\x00Software\x00GIMP 2.10.34\x00`
        const buffer = new TextEncoder().encode(gimpExif).buffer
        const metadata = extractImageMetadata(buffer)

        expect(metadata.detectedSoftware).toBe('GIMP')
        expect(metadata.tamperingRisk).toBe(80)
    })

    it('flags timestamp discrepancy between CreationDate and ModDate', () => {
        // Created in 2024, modified in 2026
        const alteredDatePdf = `%PDF-1.4\n1 0 obj\n<< /Creator (ReportLab) /CreationDate (D:20240101120000) /ModDate (D:20260901120000) >>\nendobj\n%%EOF`
        const buffer = new TextEncoder().encode(alteredDatePdf).buffer
        const metadata = extractPdfMetadata(buffer)

        expect(metadata.tamperingRisk).toBeGreaterThanOrEqual(40)
        expect(metadata.tamperingReasons.some(r => r.includes('differ'))).toBe(true)
    })

    it('evaluates clean authentic certificate as verified (score < 25)', () => {
        const metadata = {
            detectedSoftware: null,
            tamperingRisk: 0,
            tamperingReasons: [],
            extractedText: 'This certifies that Zied Fatnassi has successfully completed AWS Solutions Architect'
        }
        const claimed = {
            name: 'AWS Certified Solutions Architect',
            issuingOrganization: 'Amazon Web Services',
            credentialId: 'AWS-CERT-98213',
            credentialUrl: 'https://aws.amazon.com/verify'
        }
        const studentProfile = {
            displayName: 'Zied Fatnassi'
        }

        const report = evaluateIntegrityScore({ metadata, claimed, studentProfile })
        expect(report.status).toBe('verified')
        expect(report.fraudScore).toBeLessThan(25)
        expect(report.checks.metadataAuthenticity.passed).toBe(true)
        expect(report.checks.identityMatch.passed).toBe(true)
    })

    it('flags Photoshop manipulated certificate as flagged_fraud (score >= 65)', () => {
        const metadata = {
            detectedSoftware: 'Adobe Photoshop',
            tamperingRisk: 85,
            tamperingReasons: ['Document edited with photo-editing software (Photoshop).'],
            extractedText: ''
        }
        const claimed = {
            name: 'Fake Degree',
            issuingOrganization: 'Unknown',
            credentialId: '',
            credentialUrl: ''
        }
        const studentProfile = {
            displayName: 'John Doe'
        }

        const report = evaluateIntegrityScore({ metadata, claimed, studentProfile })
        expect(report.status).toBe('flagged_fraud')
        expect(report.fraudScore).toBeGreaterThanOrEqual(65)
        expect(report.checks.metadataAuthenticity.passed).toBe(false)
    })

    it('marks unaccredited issuer with missing ID as suspicious (score between 25 and 65)', () => {
        const metadata = {
            detectedSoftware: null,
            tamperingRisk: 0,
            tamperingReasons: [],
            extractedText: 'Certificate of completion awarded to Student for Web Design'
        }
        const claimed = {
            name: 'Intro to Web Design',
            issuingOrganization: 'Random Online Academy 2026',
            credentialId: '',
            credentialUrl: ''
        }
        const studentProfile = {
            displayName: 'Student'
        }

        const report = evaluateIntegrityScore({ metadata, claimed, studentProfile })
        expect(report.status).toBe('suspicious')
        expect(report.fraudScore).toBeGreaterThanOrEqual(25)
        expect(report.fraudScore).toBeLessThan(65)
    })
})
