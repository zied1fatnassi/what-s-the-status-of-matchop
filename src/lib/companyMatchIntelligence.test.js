import { beforeEach, describe, expect, it } from 'vitest'
import {
    applyMatchStatusOverrides,
    readMatchFailReasons,
    readMatchStatusOverrides,
    setMatchFailReason,
    setMatchStatusOverride,
    shouldShowArchivedItem,
} from './companyMatchIntelligence'

describe('companyMatchIntelligence', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('saves and loads match fail reasons', () => {
        setMatchFailReason('42', 'skill_gap')
        expect(readMatchFailReasons()).toEqual({ '42': 'skill_gap' })
    })

    it('filters archived items by reason for archived match entities only', () => {
        const items = [
            { id: 'intro-1', type: 'intro', matchId: null },
            { id: 'match-1', type: 'match', matchId: '1' },
            { id: 'match-2', type: 'match', matchId: '2' },
        ]

        const failReasons = { '1': 'skill_gap', '2': 'not_fit' }
        const visible = items.filter((item) => shouldShowArchivedItem(item, 'skill_gap', failReasons, {}))

        expect(visible).toEqual([{ id: 'match-1', type: 'match', matchId: '1' }])
    })

    it('reconsider override moves archived match back to active lists', () => {
        const baseMatches = [
            { id: 'm-1', status: 'archived' },
            { id: 'm-2', status: 'active' },
        ]

        setMatchStatusOverride('m-1', 'active')
        expect(readMatchStatusOverrides()).toEqual({ 'm-1': 'active' })

        const withOverrides = applyMatchStatusOverrides(baseMatches, readMatchStatusOverrides())
        const activeMatches = withOverrides.filter((match) => match.status !== 'archived')
        const archivedMatches = withOverrides.filter((match) => match.status === 'archived')

        expect(activeMatches.map((match) => match.id)).toEqual(['m-1', 'm-2'])
        expect(archivedMatches).toEqual([])
    })
})
