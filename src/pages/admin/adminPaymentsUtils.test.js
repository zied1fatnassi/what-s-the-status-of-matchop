import { describe, expect, it, vi } from 'vitest'
import {
    applyQuickFilters,
    buildFilteredPaymentsCsv,
    resolveProofUrl,
} from './adminPaymentsUtils'

describe('adminPaymentsUtils', () => {
    it('applies quick filters for missing proof, pending > 24h, and repeated attempts', () => {
        const now = Date.parse('2026-02-27T12:00:00.000Z')
        const rows = [
            {
                id: '1',
                user_id: 'u-1',
                user_email: 'u1@example.com',
                status: 'pending',
                proof_object_path: '',
                created_at: '2026-02-25T10:00:00.000Z',
            },
            {
                id: '2',
                user_id: 'u-1',
                user_email: 'u1@example.com',
                status: 'rejected',
                proof_object_path: 'proofs/2.pdf',
                created_at: '2026-02-26T10:00:00.000Z',
            },
            {
                id: '3',
                user_id: 'u-2',
                user_email: 'u2@example.com',
                status: 'approved',
                proof_object_path: '',
                created_at: '2026-02-27T10:00:00.000Z',
            },
        ]

        const filtered = applyQuickFilters(rows, {
            needsProof: true,
            pendingOver24h: true,
            repeatedAttempts: true,
        }, now)

        expect(filtered).toEqual([rows[0]])
    })

    it('serializes filtered rows to CSV with escaping', () => {
        const csv = buildFilteredPaymentsCsv([
            {
                id: 'request-1',
                user_email: 'alice@example.com',
                user_id: 'user-1',
                plan_id: 'monthly',
                amount_tnd: 19,
                currency: 'TND',
                reference: 'REF,"quoted"',
                proof_object_path: 'proofs/item,\nwith-newline.pdf',
                status: 'pending',
                created_at: '2026-02-27T10:00:00.000Z',
                reviewed_at: null,
                admin_note: 'note "with" comma, too',
            },
        ])

        expect(csv).toContain('"REF,""quoted"""')
        expect(csv).toContain('"proofs/item,\nwith-newline.pdf"')
        expect(csv).toContain('"note ""with"" comma, too"')
    })

    it('resolves proof url branches for direct URL, storage path, and signer failures', async () => {
        const signerMock = vi.fn(async (path) => ({
            signedUrl: `https://signed.example/${path}`,
            error: null,
        }))

        await expect(resolveProofUrl('https://cdn.example/proof.pdf', signerMock)).resolves.toMatchObject({
            url: 'https://cdn.example/proof.pdf',
            error: null,
            source: 'url',
        })

        await expect(resolveProofUrl('proofs/object/path.pdf', signerMock)).resolves.toMatchObject({
            url: 'https://signed.example/proofs/object/path.pdf',
            error: null,
            source: 'storage',
        })

        await expect(resolveProofUrl('proofs/fail.pdf', async () => ({ signedUrl: '', error: 'expired' }))).resolves.toMatchObject({
            url: '',
            error: 'expired',
            source: 'storage',
        })
    })
})
