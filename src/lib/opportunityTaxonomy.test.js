import { describe, it, expect } from 'vitest'
import {
    resolveOpportunityType,
    matchesOpportunityType,
    matchesOpportunityCategory,
    OPPORTUNITY_TYPES
} from './opportunityTaxonomy'

describe('opportunityTaxonomy Engine', () => {
    describe('resolveOpportunityType', () => {
        it('normalizes internal offer with "Intern" in title to internship even when raw type is missing', () => {
            const offer = {
                title: 'Machine Learning Engineer Intern',
                description: 'Work on cutting-edge AI projects'
            }
            const res = resolveOpportunityType(offer)
            expect(res.key).toBe(OPPORTUNITY_TYPES.INTERNSHIP)
            expect(res.labelEn).toContain('Internship')
        })

        it('normalizes French "Stage PFE - Développeur Fullstack" to internship', () => {
            const offer = {
                title: 'Stage PFE - Développeur Fullstack',
                type: 'Stage'
            }
            const res = resolveOpportunityType(offer)
            expect(res.key).toBe(OPPORTUNITY_TYPES.INTERNSHIP)
        })

        it('normalizes French "Alternance Développeur Python" to internship', () => {
            const offer = {
                title: 'Alternance Développeur Python'
            }
            const res = resolveOpportunityType(offer)
            expect(res.key).toBe(OPPORTUNITY_TYPES.INTERNSHIP)
        })

        it('normalizes "CDI - Lead Tech React" to full-time', () => {
            const offer = {
                title: 'Lead Tech React',
                type: 'CDI'
            }
            const res = resolveOpportunityType(offer)
            expect(res.key).toBe(OPPORTUNITY_TYPES.FULL_TIME)
        })

        it('normalizes "Freelance / Contrat" to contract', () => {
            const offer = {
                title: 'UI/UX Consultant',
                type: 'Freelance'
            }
            const res = resolveOpportunityType(offer)
            expect(res.key).toBe(OPPORTUNITY_TYPES.CONTRACT)
        })

        it('normalizes part-time roles', () => {
            const offer = {
                title: 'Customer Support (Temps partiel)',
                job_type: 'Part-time'
            }
            const res = resolveOpportunityType(offer)
            expect(res.key).toBe(OPPORTUNITY_TYPES.PART_TIME)
        })
    })

    describe('matchesOpportunityType', () => {
        it('returns true when preference is all', () => {
            const offer = { title: 'Software Engineer' }
            expect(matchesOpportunityType(offer, 'all')).toBe(true)
        })

        it('matches internship accurately', () => {
            const internship = { title: 'DevOps Intern' }
            const fullTime = { title: 'DevOps Engineer', type: 'Full-time' }
            expect(matchesOpportunityType(internship, 'internship')).toBe(true)
            expect(matchesOpportunityType(fullTime, 'internship')).toBe(false)
        })
    })

    describe('matchesOpportunityCategory', () => {
        it('matches tech sector roles', () => {
            const offer = { title: 'Frontend Developer', industry: 'IT' }
            expect(matchesOpportunityCategory(offer, 'tech')).toBe(true)
            expect(matchesOpportunityCategory(offer, 'healthcare')).toBe(false)
        })

        it('matches AI/Data sector roles', () => {
            const offer = { title: 'Data Scientist', department: 'Machine Learning' }
            expect(matchesOpportunityCategory(offer, 'ai_data')).toBe(true)
        })

        it('returns true for all', () => {
            expect(matchesOpportunityCategory({ title: 'Chef' }, 'all')).toBe(true)
        })
    })
})
