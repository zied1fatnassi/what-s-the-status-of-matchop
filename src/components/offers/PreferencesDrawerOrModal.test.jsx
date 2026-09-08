import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PreferencesDrawerOrModal from './PreferencesDrawerOrModal'

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, optionsOrFallback) => {
            if (typeof optionsOrFallback === 'string') return optionsOrFallback
            return key
        },
        i18n: { language: 'en' }
    })
}))

describe('PreferencesDrawerOrModal component', () => {
    const defaultPreferences = {
        locationMode: 'all',
        opportunityType: 'all',
        category: 'all',
        referenceLocation: 'Tunis',
        radiusKm: 'any',
        includeUnspecifiedLocation: true
    }

    const defaultProps = {
        isOpen: true,
        preferences: defaultPreferences,
        studentLocation: 'Tunis, Tunis',
        categoryOptions: ['Software', 'Design'],
        matchCount: 12,
        onReset: vi.fn(),
        onClose: vi.fn(),
        onSave: vi.fn()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders dialog with title, reference location, and current values', () => {
        render(<PreferencesDrawerOrModal {...defaultProps} />)
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('studentSwipe.preferences.title')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('studentSwipe.preferences.referenceLocationPlaceholder')).toHaveValue('Tunis')
    })

    it('allows changing reference location', () => {
        render(<PreferencesDrawerOrModal {...defaultProps} />)
        const locationInput = screen.getByPlaceholderText('studentSwipe.preferences.referenceLocationPlaceholder')
        fireEvent.change(locationInput, { target: { value: 'Sousse' } })
        expect(locationInput.value).toBe('Sousse')
    })

    it('switches workplace mode to remote and disables radius selector', () => {
        render(<PreferencesDrawerOrModal {...defaultProps} />)
        const remoteBtn = screen.getByText('studentSwipe.preferences.locationMode.remote')
        fireEvent.click(remoteBtn)

        const radiusSelect = screen.getByDisplayValue('studentSwipe.preferences.radius.any')
        expect(radiusSelect).toBeDisabled()
        expect(screen.getByText('studentSwipe.preferences.radiusDisabledRemote')).toBeInTheDocument()
    })

    it('calls onSave with updated draft values when Apply Preferences is clicked', () => {
        render(<PreferencesDrawerOrModal {...defaultProps} />)
        
        // Change opportunity type
        const typeSelect = screen.getByDisplayValue('studentSwipe.preferences.opportunityType.all')
        fireEvent.change(typeSelect, { target: { value: 'internship' } })

        // Click apply
        const applyBtn = screen.getByText('studentSwipe.preferences.actions.save')
        fireEvent.click(applyBtn)

        expect(defaultProps.onSave).toHaveBeenCalledWith(expect.objectContaining({
            opportunityType: 'internship',
            locationMode: 'all',
            referenceLocation: 'Tunis'
        }))
        expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('calls onReset and resets fields when Reset is clicked', () => {
        render(<PreferencesDrawerOrModal {...defaultProps} />)
        const resetBtn = screen.getByText('studentSwipe.preferences.actions.reset')
        fireEvent.click(resetBtn)
        expect(defaultProps.onReset).toHaveBeenCalled()
    })
})
