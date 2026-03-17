import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { safeLogError, safeLogWarn } from '../lib/logger'

const EXTERNAL_MATCH_STATUS_VALUES = new Set([
    'saved',
    'applied',
    'interview',
    'rejected',
    'archived'
])

const allowedTransitions = {
    saved: ['applied', 'archived'],
    applied: ['interview', 'rejected', 'archived'],
    interview: ['rejected', 'archived'],
    rejected: ['archived'],
    archived: []
}

const STATUS_TIMESTAMP_FIELDS = {
    applied: 'applied_at',
    interview: 'interview_at',
    rejected: 'rejected_at',
    archived: 'archived_at'
}

const DAY_IN_MS = 24 * 60 * 60 * 1000
const DEFAULT_FOLLOW_UP_DELAY_DAYS = 7
const STALE_APPLICATION_DAYS = 14
const RECENT_SAVE_WINDOW_DAYS = 3
const HIGH_PRIORITY_THRESHOLD = 60
const MEDIUM_PRIORITY_THRESHOLD = 30

function normalizeStatus(status) {
    return EXTERNAL_MATCH_STATUS_VALUES.has(status) ? status : 'saved'
}

function normalizeTimestamp(value) {
    if (!value) return null

    const normalizedDate = new Date(value)
    return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate.toISOString()
}

function addDays(timestamp, days) {
    const normalizedTimestamp = normalizeTimestamp(timestamp)
    if (!normalizedTimestamp) return null

    return new Date(Date.parse(normalizedTimestamp) + (days * DAY_IN_MS)).toISOString()
}

function getTimestampMs(value) {
    const normalizedTimestamp = normalizeTimestamp(value)
    return normalizedTimestamp ? Date.parse(normalizedTimestamp) : Number.NaN
}

function calculatePriorityScore(match) {
    const status = normalizeStatus(match.status)
    if (status === 'rejected' || status === 'archived') {
        return 0
    }

    let score = 0
    const nowMs = Date.now()
    const savedAtMs = getTimestampMs(match.saved_at)

    if (match.isFollowUpDue) score += 50
    if (match.isStaleApplication) score += 40
    if (status === 'interview') score += 30
    if (status === 'applied') score += 20
    if (status === 'saved') score += 10
    if (Number.isFinite(savedAtMs) && nowMs >= savedAtMs && (nowMs - savedAtMs) <= (RECENT_SAVE_WINDOW_DAYS * DAY_IN_MS)) {
        score += 10
    }

    return score
}

function getPriorityLevel(priorityScore) {
    if (priorityScore >= HIGH_PRIORITY_THRESHOLD) return 'high'
    if (priorityScore >= MEDIUM_PRIORITY_THRESHOLD) return 'medium'
    return 'low'
}

function addDerivedMatchState(match) {
    const followUpAtMs = Date.parse(match.follow_up_at || '')
    const appliedAtMs = Date.parse(match.applied_at || '')
    const nowMs = Date.now()
    const isFollowUpDue = Number.isFinite(followUpAtMs)
        && nowMs > followUpAtMs
        && match.status !== 'rejected'
        && match.status !== 'archived'
    const isStaleApplication = match.status === 'applied'
        && Number.isFinite(appliedAtMs)
        && (nowMs - appliedAtMs) > (STALE_APPLICATION_DAYS * DAY_IN_MS)
    const priorityScore = calculatePriorityScore({
        ...match,
        isFollowUpDue,
        isStaleApplication
    })

    return {
        ...match,
        isFollowUpDue,
        isStaleApplication,
        priorityScore,
        priorityLevel: getPriorityLevel(priorityScore)
    }
}

function compareBySavedAtDesc(leftMatch, rightMatch) {
    const leftSavedAtMs = getTimestampMs(leftMatch.saved_at)
    const rightSavedAtMs = getTimestampMs(rightMatch.saved_at)

    if (Number.isFinite(leftSavedAtMs) && Number.isFinite(rightSavedAtMs)) {
        return rightSavedAtMs - leftSavedAtMs
    }

    if (Number.isFinite(leftSavedAtMs)) return -1
    if (Number.isFinite(rightSavedAtMs)) return 1
    return 0
}

function deriveExternalMatchInsights(matches) {
    const totals = matches.reduce((accumulator, match) => {
        if (match.status === 'saved') accumulator.totalSaved += 1
        if (match.status === 'applied') accumulator.totalApplied += 1
        if (match.status === 'interview') accumulator.totalInterview += 1
        if (match.status === 'rejected') accumulator.totalRejected += 1

        return accumulator
    }, {
        totalSaved: 0,
        totalApplied: 0,
        totalInterview: 0,
        totalRejected: 0
    })

    const conversionRate = totals.totalApplied > 0
        ? totals.totalInterview / totals.totalApplied
        : 0
    const responseRate = totals.totalApplied > 0
        ? (totals.totalInterview + totals.totalRejected) / totals.totalApplied
        : 0

    return {
        ...totals,
        conversionRate,
        responseRate
    }
}

function deriveExternalMatchCollections(matches) {
    const sortedExternalMatches = [...matches].sort((leftMatch, rightMatch) => {
        if (rightMatch.priorityScore !== leftMatch.priorityScore) {
            return rightMatch.priorityScore - leftMatch.priorityScore
        }

        return compareBySavedAtDesc(leftMatch, rightMatch)
    })

    return {
        sortedExternalMatches,
        focusMatches: sortedExternalMatches
            .filter((match) => match.isFollowUpDue || match.status === 'applied')
            .slice(0, 3),
        insights: deriveExternalMatchInsights(matches)
    }
}

function buildExternalMatchSelect() {
    return `
        id,
        student_id,
        external_job_id,
        source_website,
        original_url,
        title,
        company_name,
        saved_at,
        status,
        applied_at,
        interview_at,
        rejected_at,
        archived_at,
        follow_up_at
    `
}

function normalizeExternalMatch(row, locationsByJobId) {
    return addDerivedMatchState({
        id: row.id,
        externalJobId: row.external_job_id,
        title: row.title || 'External opportunity',
        company_name: row.company_name || 'Unknown Company',
        source_website: row.source_website || 'External',
        original_url: row.original_url || null,
        saved_at: row.saved_at || null,
        status: normalizeStatus(row.status),
        applied_at: row.applied_at || null,
        interview_at: row.interview_at || null,
        rejected_at: row.rejected_at || null,
        archived_at: row.archived_at || null,
        follow_up_at: row.follow_up_at || null,
        location: locationsByJobId.get(row.external_job_id) || 'Remote'
    })
}

export function useExternalMatches() {
    const [externalMatches, setExternalMatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { user, isStudent } = useAuth()
    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    const fetchExternalMatches = useCallback(async () => {
        if (!user || !isStudent) {
            if (isMounted.current) {
                setExternalMatches([])
                setError(null)
                setLoading(false)
            }
            return
        }

        if (isMounted.current) {
            setLoading(true)
            setError(null)
        }

        try {
            const { data, error: matchesError } = await supabase
                .from('external_matches')
                .select(buildExternalMatchSelect())
                .eq('student_id', user.id)
                .order('saved_at', { ascending: false })

            if (matchesError) {
                throw matchesError
            }

            const externalJobIds = Array.from(
                new Set((data || []).map((row) => row.external_job_id).filter(Boolean))
            )

            const locationsByJobId = new Map()
            if (externalJobIds.length > 0) {
                // external_jobs base access is intentionally locked down; enrich from the public view.
                const { data: jobsData, error: jobsError } = await supabase
                    .from('external_jobs_public')
                    .select('id, location')
                    .in('id', externalJobIds)

                if (jobsError) {
                    safeLogWarn('[useExternalMatches] location enrichment warning', { error: jobsError })
                } else {
                    ;(jobsData || []).forEach((job) => {
                        locationsByJobId.set(job.id, job.location || 'Remote')
                    })
                }
            }

            if (isMounted.current) {
                setExternalMatches((data || []).map((row) => normalizeExternalMatch(row, locationsByJobId)))
                setError(null)
                setLoading(false)
            }
        } catch (err) {
            safeLogError('[useExternalMatches] fetch failed', { error: err })
            if (isMounted.current) {
                setExternalMatches([])
                setError(err.message || 'Failed to load saved external opportunities')
                setLoading(false)
            }
        }
    }, [isStudent, user])

    useEffect(() => {
        fetchExternalMatches()
    }, [fetchExternalMatches])

    const syncExternalMatchRow = useCallback((row) => {
        if (!row || !isMounted.current) return

        setExternalMatches((prev) => prev.map((match) => {
            if (match.id !== row.id) return match

            return addDerivedMatchState({
                ...match,
                externalJobId: row.external_job_id || match.externalJobId,
                title: row.title || 'External opportunity',
                company_name: row.company_name || 'Unknown Company',
                source_website: row.source_website || 'External',
                original_url: row.original_url || null,
                saved_at: row.saved_at || null,
                status: normalizeStatus(row.status),
                applied_at: row.applied_at || match.applied_at || null,
                interview_at: row.interview_at || match.interview_at || null,
                rejected_at: row.rejected_at || match.rejected_at || null,
                archived_at: row.archived_at || match.archived_at || null,
                follow_up_at: row.follow_up_at || null
            })
        }))
    }, [])

    const {
        sortedExternalMatches,
        focusMatches,
        insights
    } = useMemo(() => deriveExternalMatchCollections(externalMatches), [externalMatches])

    const updateExternalMatchStatus = useCallback(async (externalMatchId, nextStatus) => {
        if (!user || !isStudent || !externalMatchId) {
            return {
                error: new Error('Only authenticated student users can update external opportunities.')
            }
        }

        const normalizedStatus = normalizeStatus(nextStatus)
        const { data: currentRow, error: currentRowError } = await supabase
            .from('external_matches')
            .select(buildExternalMatchSelect())
            .eq('id', externalMatchId)
            .eq('student_id', user.id)
            .maybeSingle()

        if (currentRowError) {
            safeLogError('[useExternalMatches] status read failed', {
                error: currentRowError,
                externalMatchId
            })
            return { error: currentRowError }
        }

        if (!currentRow) {
            return {
                error: new Error('External opportunity not found for this student.')
            }
        }

        syncExternalMatchRow(currentRow)

        const currentStatus = normalizeStatus(currentRow.status)
        if (currentStatus === normalizedStatus) {
            return {
                error: null,
                skipped: true
            }
        }

        if (!allowedTransitions[currentStatus]?.includes(normalizedStatus)) {
            const transitionError = new Error('Invalid external application status transition.')
            safeLogWarn('[useExternalMatches] invalid status transition blocked', {
                externalMatchId,
                currentStatus,
                nextStatus: normalizedStatus
            })
            return {
                error: transitionError,
                blocked: true
            }
        }

        const timestampField = STATUS_TIMESTAMP_FIELDS[normalizedStatus]
        const updatePayload = { status: normalizedStatus }
        let enteredStatusAt = currentRow[timestampField]
        if (timestampField && !currentRow[timestampField]) {
            enteredStatusAt = new Date().toISOString()
            updatePayload[timestampField] = enteredStatusAt
        }

        if (normalizedStatus === 'applied' && !currentRow.follow_up_at) {
            const followUpAt = addDays(enteredStatusAt || currentRow.applied_at || new Date().toISOString(), DEFAULT_FOLLOW_UP_DELAY_DAYS)
            if (followUpAt) {
                updatePayload.follow_up_at = followUpAt
            }
        }

        const { data: updatedRow, error: updateError } = await supabase
            .from('external_matches')
            .update(updatePayload)
            .eq('id', externalMatchId)
            .eq('student_id', user.id)
            .eq('status', currentStatus)
            .select(buildExternalMatchSelect())
            .maybeSingle()

        if (updateError) {
            safeLogError('[useExternalMatches] status update failed', {
                error: updateError,
                externalMatchId,
                nextStatus: normalizedStatus
            })
            return { error: updateError }
        }

        if (!updatedRow) {
            return {
                error: new Error('External opportunity status changed before the update completed.')
            }
        }

        syncExternalMatchRow(updatedRow)

        return { error: null }
    }, [isStudent, syncExternalMatchRow, user])

    const markAsApplied = useCallback((externalMatchId) => (
        updateExternalMatchStatus(externalMatchId, 'applied')
    ), [updateExternalMatchStatus])

    const markAsInterview = useCallback((externalMatchId) => (
        updateExternalMatchStatus(externalMatchId, 'interview')
    ), [updateExternalMatchStatus])

    const markAsRejected = useCallback((externalMatchId) => (
        updateExternalMatchStatus(externalMatchId, 'rejected')
    ), [updateExternalMatchStatus])

    const archiveExternalMatch = useCallback((externalMatchId) => (
        updateExternalMatchStatus(externalMatchId, 'archived')
    ), [updateExternalMatchStatus])

    const setFollowUpDate = useCallback(async (externalMatchId, date) => {
        if (!user || !isStudent || !externalMatchId) {
            return {
                error: new Error('Only authenticated student users can update external opportunities.')
            }
        }

        const normalizedDate = normalizeTimestamp(date)
        if (!normalizedDate) {
            return {
                error: new Error('Invalid follow-up date.')
            }
        }

        const { data: currentRow, error: currentRowError } = await supabase
            .from('external_matches')
            .select(buildExternalMatchSelect())
            .eq('id', externalMatchId)
            .eq('student_id', user.id)
            .maybeSingle()

        if (currentRowError) {
            safeLogError('[useExternalMatches] follow-up read failed', {
                error: currentRowError,
                externalMatchId
            })
            return { error: currentRowError }
        }

        if (!currentRow) {
            return {
                error: new Error('External opportunity not found for this student.')
            }
        }

        syncExternalMatchRow(currentRow)

        if (currentRow.follow_up_at === normalizedDate) {
            return {
                error: null,
                skipped: true
            }
        }

        const { data: updatedRow, error: updateError } = await supabase
            .from('external_matches')
            .update({ follow_up_at: normalizedDate })
            .eq('id', externalMatchId)
            .eq('student_id', user.id)
            .select(buildExternalMatchSelect())
            .maybeSingle()

        if (updateError) {
            safeLogError('[useExternalMatches] follow-up update failed', {
                error: updateError,
                externalMatchId
            })
            return { error: updateError }
        }

        if (!updatedRow) {
            return {
                error: new Error('External opportunity not found after updating follow-up date.')
            }
        }

        syncExternalMatchRow(updatedRow)
        return { error: null }
    }, [isStudent, syncExternalMatchRow, user])

    return {
        externalMatches,
        sortedExternalMatches,
        focusMatches,
        insights,
        loading,
        error,
        refresh: fetchExternalMatches,
        markAsApplied,
        markAsInterview,
        markAsRejected,
        archiveExternalMatch,
        setFollowUpDate
    }
}

export default useExternalMatches
