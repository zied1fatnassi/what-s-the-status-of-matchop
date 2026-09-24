import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import {
    DEGREE_LEVELS,
    LICENCE_PROGRAMS,
    INGENIEUR_PROGRAMS,
    MASTER_PROGRAMS,
    DOCTORAT_PROGRAMS,
    ALL_ACADEMIC_PROGRAMS
} from '../../lib/validation'
import { useBilingualText } from '../../lib/useBilingualText'
import './FormComponents.css'

/**
 * FormEducationSelector - Two-level education selector for Tunisian degrees
 * First select degree level, then select program/major
 */
export function FormEducationSelector({
    label = null,
    degreeValue,
    programValue,
    onDegreeChange,
    onProgramChange,
    required = false,
    disabled = false,
    error = null,
    helperText = null,
}) {
    const tr = useBilingualText()
    const resolvedLabel = label || tr('Formation / Education', 'Formation / Education')
    const [availablePrograms, setAvailablePrograms] = useState([])

    // Update available programs when degree changes
    useEffect(() => {
        let programs = []
        if (degreeValue) {
            if (degreeValue.includes('Licence')) programs = LICENCE_PROGRAMS
            else if (degreeValue.includes('Ingénieur')) programs = INGENIEUR_PROGRAMS
            else if (degreeValue.includes('Master')) programs = MASTER_PROGRAMS
            else if (degreeValue.includes('Doctorat')) programs = DOCTORAT_PROGRAMS
            else programs = ALL_ACADEMIC_PROGRAMS
        } else {
            programs = ALL_ACADEMIC_PROGRAMS
        }
        setAvailablePrograms(programs)

        // Optional: clear program if current value doesn't match new degree list
        // kept flexible for now to allow free text if needed or cross-selection
    }, [degreeValue])

    const handleDegreeChange = (value) => {
        if (onDegreeChange) {
            onDegreeChange(value)
            // Reset program when degree changes to force re-selection or valid autocomplete
            if (onProgramChange) onProgramChange('')
        }
    }

    const handleProgramChange = (value) => {
        if (onProgramChange) {
            onProgramChange(value)
        }
    }

    return (
        <div className="form-input-group">
            {resolvedLabel && (
                <label className="form-label">
                    {resolvedLabel}
                    {required && <span className="required-indicator"> *</span>}
                </label>
            )}

            <div className="form-location-grid">
                {/* Degree Level Selector */}
                <select
                    className={`form-input ${error ? 'form-input-error' : ''}`}
                    value={degreeValue || ''}
                    onChange={(e) => handleDegreeChange(e.target.value)}
                    required={required}
                    disabled={disabled}
                >
                    <option value="">{tr('Degree', 'Diplome')}</option>
                    {DEGREE_LEVELS.map((level) => (
                        <option key={level} value={level}>
                            {level}
                        </option>
                    ))}
                </select>

                {/* Program/Major Selector (Autocomplete) */}
                <div style={{ position: 'relative', width: '100%' }}>
                    <input
                        type="text"
                        list="programs-list"
                        className={`form-input ${error ? 'form-input-error' : ''}`}
                        placeholder={tr('Specialty / Major', 'Specialite / filiere')}
                        value={programValue || ''}
                        onChange={(e) => handleProgramChange(e.target.value)}
                        required={required}
                        disabled={disabled || !degreeValue}
                    />
                    <datalist id="programs-list">
                        {availablePrograms.map((prog) => (
                            <option key={prog} value={prog} />
                        ))}
                    </datalist>
                </div>
            </div>

            {helperText && !error && (
                <span className="form-helper-text">{helperText}</span>
            )}
            {error && (
                <div className="form-error-message">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    )
}
