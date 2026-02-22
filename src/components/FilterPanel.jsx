import { useEffect, useState } from 'react'
import { Filter, X, MapPin, DollarSign, Briefcase, Building2 } from 'lucide-react'
import { lockOverlayScroll, unlockOverlayScroll } from '../lib/overlayLock'
import './FilterPanel.css'

/**
 * Advanced job filters panel component
 * Allows filtering by salary, location, work type, contract type, etc.
 */
function FilterPanel({ filters, onFilterChange, onReset, jobCount }) {
    const [isOpen, setIsOpen] = useState(false)
    const getIsMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport)

    useEffect(() => {
        if (typeof window === 'undefined') return undefined

        const mediaQuery = window.matchMedia('(max-width: 767px)')
        const handleChange = (event) => setIsMobileViewport(event.matches)

        setIsMobileViewport(mediaQuery.matches)
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    useEffect(() => {
        if (!isOpen) return undefined

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
            }
        }

        if (isMobileViewport) {
            lockOverlayScroll()
        }
        document.addEventListener('keydown', handleEsc)

        return () => {
            if (isMobileViewport) {
                unlockOverlayScroll()
            }
            document.removeEventListener('keydown', handleEsc)
        }
    }, [isOpen, isMobileViewport])

    // Work type options
    const workTypes = [
        { value: 'remote', label: 'Remote', icon: '🏠' },
        { value: 'hybrid', label: 'Hybrid', icon: '🔄' },
        { value: 'onsite', label: 'On-site', icon: '🏢' }
    ]

    // Contract types
    const contractTypes = [
        { value: 'internship', label: 'Internship' },
        { value: 'full-time', label: 'Full-time' },
        { value: 'part-time', label: 'Part-time' },
        { value: 'contract', label: 'Contract' }
    ]

    // Industry sectors
    const industries = [
        'Technology', 'Finance', 'Healthcare', 'Education',
        'Marketing', 'Design', 'Engineering', 'Sales'
    ]

    // Salary ranges
    const salaryRanges = [
        { value: '0-500', label: 'Under 500 TND' },
        { value: '500-1000', label: '500 - 1000 TND' },
        { value: '1000-2000', label: '1000 - 2000 TND' },
        { value: '2000+', label: '2000+ TND' }
    ]

    const handleToggleArray = (field, value) => {
        const current = filters[field] || []
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value]
        onFilterChange({ ...filters, [field]: updated })
    }

    const hasActiveFilters = Object.values(filters).some(v =>
        Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== ''
    )

    const activeFilterCount = Object.values(filters).reduce((count, v) => {
        if (Array.isArray(v)) return count + v.length
        if (v) return count + 1
        return count
    }, 0)

    return (
        <div className="filter-panel-container">
            {/* Filter Toggle Button */}
            <button
                className={`filter-toggle-btn ${hasActiveFilters ? 'has-filters' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Filter size={18} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                    <span className="filter-count">{activeFilterCount}</span>
                )}
            </button>

            {/* Filter Panel */}
            {isOpen && (
                isMobileViewport ? (
                    <div className="filter-panel-backdrop" onClick={() => setIsOpen(false)}>
                        <div className="filter-panel" onClick={(event) => event.stopPropagation()}>
                            <div className="filter-panel-header">
                                <h3>
                                    <Filter size={18} />
                                    Filters
                                </h3>
                                <button className="close-btn" onClick={() => setIsOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="filter-panel-content">
                                {/* Work Type */}
                                <div className="filter-group">
                                    <label className="filter-label">
                                        <Building2 size={16} />
                                        Work Type
                                    </label>
                                    <div className="filter-chips">
                                        {workTypes.map(type => (
                                            <button
                                                key={type.value}
                                                className={`filter-chip ${filters.workTypes?.includes(type.value) ? 'active' : ''}`}
                                                onClick={() => handleToggleArray('workTypes', type.value)}
                                            >
                                                {type.icon} {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Contract Type */}
                                <div className="filter-group">
                                    <label className="filter-label">
                                        <Briefcase size={16} />
                                        Contract Type
                                    </label>
                                    <div className="filter-chips">
                                        {contractTypes.map(type => (
                                            <button
                                                key={type.value}
                                                className={`filter-chip ${filters.contractTypes?.includes(type.value) ? 'active' : ''}`}
                                                onClick={() => handleToggleArray('contractTypes', type.value)}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Salary Range */}
                                <div className="filter-group">
                                    <label className="filter-label">
                                        <DollarSign size={16} />
                                        Salary Range
                                    </label>
                                    <div className="filter-chips">
                                        {salaryRanges.map(range => (
                                            <button
                                                key={range.value}
                                                className={`filter-chip ${filters.salaryRange === range.value ? 'active' : ''}`}
                                                onClick={() => onFilterChange({
                                                    ...filters,
                                                    salaryRange: filters.salaryRange === range.value ? null : range.value
                                                })}
                                            >
                                                {range.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Industry */}
                                <div className="filter-group">
                                    <label className="filter-label">
                                        <MapPin size={16} />
                                        Industry
                                    </label>
                                    <div className="filter-chips">
                                        {industries.map(industry => (
                                            <button
                                                key={industry}
                                                className={`filter-chip ${filters.industries?.includes(industry) ? 'active' : ''}`}
                                                onClick={() => handleToggleArray('industries', industry)}
                                            >
                                                {industry}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="filter-panel-footer">
                                <span className="match-count">
                                    {jobCount} {jobCount === 1 ? 'job' : 'jobs'} match
                                </span>
                                <div className="filter-actions">
                                    {hasActiveFilters && (
                                        <button className="btn btn-secondary" onClick={onReset}>
                                            Clear All
                                        </button>
                                    )}
                                    <button className="btn btn-primary" onClick={() => setIsOpen(false)}>
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="filter-panel">
                    <div className="filter-panel-header">
                        <h3>
                            <Filter size={18} />
                            Filters
                        </h3>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="filter-panel-content">
                        {/* Work Type */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <Building2 size={16} />
                                Work Type
                            </label>
                            <div className="filter-chips">
                                {workTypes.map(type => (
                                    <button
                                        key={type.value}
                                        className={`filter-chip ${filters.workTypes?.includes(type.value) ? 'active' : ''}`}
                                        onClick={() => handleToggleArray('workTypes', type.value)}
                                    >
                                        {type.icon} {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contract Type */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <Briefcase size={16} />
                                Contract Type
                            </label>
                            <div className="filter-chips">
                                {contractTypes.map(type => (
                                    <button
                                        key={type.value}
                                        className={`filter-chip ${filters.contractTypes?.includes(type.value) ? 'active' : ''}`}
                                        onClick={() => handleToggleArray('contractTypes', type.value)}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Salary Range */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <DollarSign size={16} />
                                Salary Range
                            </label>
                            <div className="filter-chips">
                                {salaryRanges.map(range => (
                                    <button
                                        key={range.value}
                                        className={`filter-chip ${filters.salaryRange === range.value ? 'active' : ''}`}
                                        onClick={() => onFilterChange({
                                            ...filters,
                                            salaryRange: filters.salaryRange === range.value ? null : range.value
                                        })}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Industry */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <MapPin size={16} />
                                Industry
                            </label>
                            <div className="filter-chips">
                                {industries.map(industry => (
                                    <button
                                        key={industry}
                                        className={`filter-chip ${filters.industries?.includes(industry) ? 'active' : ''}`}
                                        onClick={() => handleToggleArray('industries', industry)}
                                    >
                                        {industry}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="filter-panel-footer">
                        <span className="match-count">
                            {jobCount} {jobCount === 1 ? 'job' : 'jobs'} match
                        </span>
                        <div className="filter-actions">
                            {hasActiveFilters && (
                                <button className="btn btn-secondary" onClick={onReset}>
                                    Clear All
                                </button>
                            )}
                            <button className="btn btn-primary" onClick={() => setIsOpen(false)}>
                                Apply Filters
                            </button>
                        </div>
                    </div>
                    </div>
                )
            )}
        </div>
    )
}

export default FilterPanel
