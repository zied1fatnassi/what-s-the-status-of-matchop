import { act } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refreshMock = vi.fn()
const markAsAppliedMock = vi.fn()
const markAsInterviewMock = vi.fn()
const archiveExternalMatchMock = vi.fn()
const setFollowUpDateMock = vi.fn()

const hookState = {
    externalMatches: [],
    sortedExternalMatches: [],
    focusMatches: [],
    insights: {
        totalSaved: 0,
        totalApplied: 0,
        totalInterview: 0,
        totalRejected: 0,
        conversionRate: 0,
        responseRate: 0
    },
    loading: false,
    error: null,
    refresh: refreshMock,
    markAsApplied: markAsAppliedMock,
    markAsInterview: markAsInterviewMock,
    archiveExternalMatch: archiveExternalMatchMock,
    setFollowUpDate: setFollowUpDateMock
}

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, options = {}) => {
            const dictionary = {
                'matches.externalTitle': 'External Matches',
                'matches.externalSubtitle': 'Saved external opportunities ready for you to apply on the source website.',
                'matches.loading': 'Loading your matches...',
                'matches.loadError': 'Failed to load matches',
                'common.retry': 'Try again',
                'matches.recently': 'Recently',
                'matches.savedOn': 'Saved {{date}}',
                'matches.remote': 'Remote',
                'matches.applyOn': 'Apply on {{source}}',
                'matches.applyUnavailable': 'Application link unavailable',
                'matches.statusTabs.ariaLabel': 'External application status filters',
                'matches.statusTabs.saved': 'Saved',
                'matches.statusTabs.applied': 'Applied',
                'matches.statusTabs.archived': 'Archived',
                'matches.statuses.applied': 'Applied',
                'matches.statuses.interview': 'Interview',
                'matches.statuses.rejected': 'Rejected',
                'matches.statuses.archived': 'Archived',
                'matches.statusDates.appliedOn': 'Applied on {{date}}',
                'matches.statusDates.interviewOn': 'Interview on {{date}}',
                'matches.statusDates.rejectedOn': 'Rejected on {{date}}',
                'matches.statusDates.archivedOn': 'Archived on {{date}}',
                'matches.actions.markAsApplied': 'Mark as Applied (external)',
                'matches.actions.moveToInterview': 'Move to Interview',
                'matches.actions.markAsFollowedUp': 'Mark as Followed Up',
                'matches.actions.archive': 'Archive',
                'matches.nudges.followUpNow': 'Follow up now',
                'matches.nudges.noResponseAfter14Days': 'No response after 14 days',
                'matches.priority.high': 'High priority',
                'matches.priority.medium': 'Medium',
                'matches.focus.title': 'Your focus today',
                'matches.insights.title': 'Application insights',
                'matches.insights.applications': 'Applications',
                'matches.insights.interviews': 'Interviews',
                'matches.insights.conversion': 'Conversion',
                'matches.followUpSummary': 'You have {{count}} applications to follow up',
                'matches.externalEmptyStates.savedTitle': 'No saved external matches',
                'matches.externalEmptyStates.savedDescription': 'Swipe right on external opportunities to save them here.',
                'matches.externalEmptyStates.appliedTitle': 'No tracked applications yet',
                'matches.externalEmptyStates.appliedDescription': 'Mark saved jobs as applied to track interviews and outcomes here.',
                'matches.externalEmptyStates.archivedTitle': 'No archived external jobs',
                'matches.externalEmptyStates.archivedDescription': 'Archived external opportunities will appear here.',
                'matches.externalSourceFallback': 'the source website',
                'matches.externalTrackingTooltip': 'This job is external. You are tracking your application manually.',
                'matches.statusUpdateFailed': 'Unable to update this external opportunity right now.',
                'matches.tabs.navigationAria': 'Matches navigation',
                'matches.tabs.matches': 'Matches',
                'matches.tabs.externalMatches': 'External Matches'
            }

            let resolved = dictionary[key] || key
            Object.entries(options).forEach(([optionKey, value]) => {
                resolved = resolved.replace(`{{${optionKey}}}`, String(value))
            })
            return resolved
        },
        i18n: {
            language: 'en-US'
        }
    })
}))

vi.mock('../../hooks/useExternalMatches', () => ({
    useExternalMatches: () => hookState
}))

import StudentExternalMatches from './StudentExternalMatches'

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/student/external-matches']}>
            <StudentExternalMatches />
        </MemoryRouter>
    )
}

function getMatchesList() {
    const matchesList = document.querySelector('.matches-list')
    expect(matchesList).not.toBeNull()
    return matchesList
}

describe('StudentExternalMatches', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-03-20T12:00:00.000Z'))
        refreshMock.mockReset()
        markAsAppliedMock.mockReset()
        markAsInterviewMock.mockReset()
        archiveExternalMatchMock.mockReset()
        setFollowUpDateMock.mockReset()
        markAsAppliedMock.mockResolvedValue({ error: null })
        markAsInterviewMock.mockResolvedValue({ error: null })
        archiveExternalMatchMock.mockResolvedValue({ error: null })
        setFollowUpDateMock.mockResolvedValue({ error: null })

        const savedMatch = {
            id: 'saved-1',
            externalJobId: 'job-1',
            title: 'Saved Role',
            company_name: 'Orbit Labs',
            source_website: 'LinkedIn',
            original_url: 'https://example.com/saved-role',
            saved_at: '2026-03-17T10:00:00.000Z',
            status: 'saved',
            applied_at: null,
            interview_at: null,
            rejected_at: null,
            archived_at: null,
            follow_up_at: null,
            isFollowUpDue: false,
            isStaleApplication: false,
            priorityScore: 20,
            priorityLevel: 'low',
            location: 'Remote'
        }
        const appliedDueMatch = {
            id: 'applied-1',
            externalJobId: 'job-2',
            title: 'Applied Role',
            company_name: 'Nova AI',
            source_website: 'Indeed',
            original_url: 'https://example.com/applied-role',
            saved_at: '2026-03-17T09:00:00.000Z',
            status: 'applied',
            applied_at: '2026-03-17T09:00:00.000Z',
            interview_at: null,
            rejected_at: null,
            archived_at: null,
            follow_up_at: '2026-03-18T09:00:00.000Z',
            isFollowUpDue: true,
            isStaleApplication: true,
            priorityScore: 120,
            priorityLevel: 'high',
            location: 'Paris'
        }
        const interviewFocusMatch = {
            id: 'interview-1',
            externalJobId: 'job-3',
            title: 'Interview Role',
            company_name: 'Atlas',
            source_website: 'Welcome to the Jungle',
            original_url: null,
            saved_at: '2026-03-17T08:00:00.000Z',
            status: 'interview',
            applied_at: '2026-03-10T08:00:00.000Z',
            interview_at: '2026-03-16T08:00:00.000Z',
            rejected_at: null,
            archived_at: null,
            follow_up_at: '2026-03-18T08:00:00.000Z',
            isFollowUpDue: true,
            isStaleApplication: false,
            priorityScore: 90,
            priorityLevel: 'high',
            location: 'Remote'
        }
        const appliedFreshMatch = {
            id: 'applied-2',
            externalJobId: 'job-6',
            title: 'Second Applied Role',
            company_name: 'Layer',
            source_website: 'Lever',
            original_url: 'https://example.com/second-applied-role',
            saved_at: '2026-03-19T11:00:00.000Z',
            status: 'applied',
            applied_at: '2026-03-19T11:00:00.000Z',
            interview_at: null,
            rejected_at: null,
            archived_at: null,
            follow_up_at: '2026-03-29T11:00:00.000Z',
            isFollowUpDue: false,
            isStaleApplication: false,
            priorityScore: 30,
            priorityLevel: 'medium',
            location: 'Remote'
        }
        const rejectedMatch = {
            id: 'rejected-1',
            externalJobId: 'job-4',
            title: 'Rejected Role',
            company_name: 'Kernel',
            source_website: 'Greenhouse',
            original_url: null,
            saved_at: '2026-03-17T07:00:00.000Z',
            status: 'rejected',
            applied_at: '2026-03-11T07:00:00.000Z',
            interview_at: null,
            rejected_at: '2026-03-15T07:00:00.000Z',
            archived_at: null,
            follow_up_at: '2026-03-12T07:00:00.000Z',
            isFollowUpDue: false,
            isStaleApplication: false,
            priorityScore: 0,
            priorityLevel: 'low',
            location: 'Berlin'
        }
        const archivedMatch = {
            id: 'archived-1',
            externalJobId: 'job-5',
            title: 'Archived Role',
            company_name: 'Signal',
            source_website: 'Lever',
            original_url: 'https://example.com/archived-role',
            saved_at: '2026-03-17T06:00:00.000Z',
            status: 'archived',
            applied_at: '2026-03-08T06:00:00.000Z',
            interview_at: null,
            rejected_at: null,
            archived_at: '2026-03-14T06:00:00.000Z',
            follow_up_at: '2026-03-10T06:00:00.000Z',
            isFollowUpDue: false,
            isStaleApplication: false,
            priorityScore: 0,
            priorityLevel: 'low',
            location: 'Remote'
        }

        hookState.loading = false
        hookState.error = null
        hookState.externalMatches = [
            savedMatch,
            appliedDueMatch,
            interviewFocusMatch,
            appliedFreshMatch,
            rejectedMatch,
            archivedMatch
        ]
        hookState.sortedExternalMatches = [
            appliedDueMatch,
            interviewFocusMatch,
            appliedFreshMatch,
            savedMatch,
            rejectedMatch,
            archivedMatch
        ]
        hookState.focusMatches = [
            appliedDueMatch,
            interviewFocusMatch,
            appliedFreshMatch
        ]
        hookState.insights = {
            totalSaved: 1,
            totalApplied: 2,
            totalInterview: 1,
            totalRejected: 1,
            conversionRate: 0.5,
            responseRate: 1
        }
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('shows saved jobs by default and triggers saved-job actions from the tabbed list', async () => {
        renderPage()

        const matchesList = getMatchesList()
        expect(within(matchesList).getByText('Saved Role')).toBeInTheDocument()
        expect(within(matchesList).queryByText('Applied Role')).not.toBeInTheDocument()
        expect(screen.getByText('You have 2 applications to follow up')).toBeInTheDocument()

        const savedCard = within(matchesList).getByText('Saved Role').closest('article')
        expect(savedCard).not.toBeNull()
        expect(within(savedCard).getByRole('link', { name: 'Apply on LinkedIn' })).toHaveAttribute('href', 'https://example.com/saved-role')
        expect(within(savedCard).getByRole('button', { name: 'Mark as Applied (external)' })).toHaveAttribute(
            'title',
            'This job is external. You are tracking your application manually.'
        )

        await act(async () => {
            fireEvent.click(within(savedCard).getByRole('button', { name: 'Mark as Applied (external)' }))
        })
        expect(markAsAppliedMock).toHaveBeenCalledWith('saved-1')

        await act(async () => {
            fireEvent.click(within(savedCard).getByRole('button', { name: 'Archive' }))
        })
        expect(archiveExternalMatchMock).toHaveBeenCalledWith('saved-1')
    })

    it('renders the focus section, priority badges, and insights', () => {
        renderPage()

        expect(screen.getByText('Your focus today')).toBeInTheDocument()
        expect(screen.getByText('Applied Role')).toBeInTheDocument()
        expect(screen.getByText('Interview Role')).toBeInTheDocument()
        expect(screen.getByText('Second Applied Role')).toBeInTheDocument()
        expect(screen.getAllByText('High priority').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Medium').length).toBeGreaterThan(0)
        expect(screen.getByLabelText('Application insights')).toBeInTheDocument()
        expect(screen.getByText('Applications')).toBeInTheDocument()
        expect(screen.getByText('Interviews')).toBeInTheDocument()
        expect(screen.getByText('Conversion')).toBeInTheDocument()
        expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('groups applied, interview, and rejected jobs under the Applied tab with priority ordering', () => {
        renderPage()

        fireEvent.click(screen.getByRole('button', { name: 'Applied' }))

        const matchesList = getMatchesList()
        expect(within(matchesList).queryByText('Saved Role')).not.toBeInTheDocument()
        expect(within(matchesList).getByText('Applied Role')).toBeInTheDocument()
        expect(within(matchesList).getByText('Interview Role')).toBeInTheDocument()
        expect(within(matchesList).getByText('Second Applied Role')).toBeInTheDocument()
        expect(within(matchesList).getByText('Rejected Role')).toBeInTheDocument()
        expect(within(matchesList).getAllByText('Applied').length).toBeGreaterThan(0)
        expect(within(matchesList).getByText('Interview')).toBeInTheDocument()
        expect(within(matchesList).getByText('Rejected')).toBeInTheDocument()
        expect(within(matchesList).getAllByText('Follow up now').length).toBeGreaterThan(0)
        expect(within(matchesList).getByText('No response after 14 days')).toBeInTheDocument()
        expect(within(matchesList).getByText('Applied on Mar 17')).toBeInTheDocument()
        expect(within(matchesList).getByText('Interview on Mar 16')).toBeInTheDocument()
        expect(within(matchesList).getByText('Rejected on Mar 15')).toBeInTheDocument()
        expect(within(matchesList).getAllByText('High priority').length).toBeGreaterThan(0)
        expect(within(matchesList).getByText('Medium')).toBeInTheDocument()
    })

    it('uses focus actions for top follow-ups and applied jobs', async () => {
        renderPage()

        const followUpButtons = screen.getAllByRole('button', { name: 'Mark as Followed Up' })
        const moveToInterviewButton = screen.getByRole('button', { name: 'Move to Interview' })

        await act(async () => {
            fireEvent.click(followUpButtons[0])
        })
        expect(setFollowUpDateMock).toHaveBeenCalledWith('applied-1', '2026-03-27T12:00:00.000Z')

        await act(async () => {
            fireEvent.click(moveToInterviewButton)
        })
        expect(markAsInterviewMock).toHaveBeenCalledWith('applied-2')
    })

    it('shows archived jobs in the Archived tab without active pipeline actions', () => {
        renderPage()

        fireEvent.click(screen.getByRole('button', { name: 'Archived' }))

        const matchesList = getMatchesList()
        expect(within(matchesList).getByText('Archived Role')).toBeInTheDocument()
        expect(within(matchesList).queryByText('Saved Role')).not.toBeInTheDocument()

        const archivedCard = within(matchesList).getByText('Archived Role').closest('article')
        expect(archivedCard).not.toBeNull()
        expect(within(archivedCard).queryByRole('button', { name: 'Mark as Applied (external)' })).not.toBeInTheDocument()
        expect(within(archivedCard).queryByRole('button', { name: 'Move to Interview' })).not.toBeInTheDocument()
        expect(within(archivedCard).queryByRole('button', { name: 'Mark as Followed Up' })).not.toBeInTheDocument()
    })
})
