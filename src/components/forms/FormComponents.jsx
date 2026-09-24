import { AlertCircle } from 'lucide-react'
import './FormComponents.css'

/**
 * FormInput - Reusable input component with built-in validation
 * Supports: text, email, tel, url, number, date, month
 */
export function FormInput({
    label,
    type = 'text',
    name,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error = null,
    helperText = null,
    maxLength = null,
    min = null,
    max = null,
    autoComplete = null,
}) {
    const handleChange = (e) => {
        if (onChange) {
            onChange(e.target.value, e)
        }
    }

    return (
        <div className="form-input-group">
            {label && (
                <label className="form-label">
                    {label}
                    {required && <span className="required-indicator"> *</span>}
                </label>
            )}
            <input
                type={type}
                name={name}
                className={`form-input ${error ? 'form-input-error' : ''}`}
                value={value || ''}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                maxLength={maxLength}
                min={min}
                max={max}
                autoComplete={autoComplete}
            />
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

/**
 * FormSelect - Reusable select component with built-in validation
 */
export function FormSelect({
    label,
    name,
    value,
    onChange,
    options = [],
    placeholder = 'Sélectionnez une option / Select option',
    required = false,
    disabled = false,
    error = null,
    helperText = null,
}) {
    const handleChange = (e) => {
        if (onChange) {
            onChange(e.target.value, e)
        }
    }

    return (
        <div className="form-input-group">
            {label && (
                <label className="form-label">
                    {label}
                    {required && <span className="required-indicator"> *</span>}
                </label>
            )}
            <select
                name={name}
                className={`form-input ${error ? 'form-input-error' : ''}`}
                value={value || ''}
                onChange={handleChange}
                required={required}
                disabled={disabled}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option
                        key={typeof option === 'string' ? option : option.value}
                        value={typeof option === 'string' ? option : option.value}
                    >
                        {typeof option === 'string' ? option : option.label}
                    </option>
                ))}
            </select>
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

/**
 * FormTextArea - Reusable textarea component with built-in validation and character counter
 */
export function FormTextArea({
    label,
    name,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error = null,
    helperText = null,
    minLength = null,
    maxLength = null,
    rows = 4,
    showCharCount = true,
}) {
    const handleChange = (e) => {
        if (onChange) {
            onChange(e.target.value, e)
        }
    }

    const currentLength = value ? value.length : 0

    return (
        <div className="form-input-group">
            {label && (
                <label className="form-label">
                    {label}
                    {required && <span className="required-indicator"> *</span>}
                </label>
            )}
            <textarea
                name={name}
                className={`form-textarea ${error ? 'form-input-error' : ''}`}
                value={value || ''}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                minLength={minLength}
                maxLength={maxLength}
                rows={rows}
            />
            {showCharCount && maxLength && (
                <div className="form-char-count">
                    {currentLength}/{maxLength}
                </div>
            )}
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

/**
 * FormDatalist - Input with autocomplete suggestions
 */
export function FormDatalist({
    label,
    name,
    value,
    onChange,
    suggestions = [],
    placeholder,
    required = false,
    disabled = false,
    error = null,
    helperText = null,
}) {
    const datalistId = `datalist-${name}`

    const handleChange = (e) => {
        if (onChange) {
            onChange(e.target.value, e)
        }
    }

    return (
        <div className="form-input-group">
            {label && (
                <label className="form-label">
                    {label}
                    {required && <span className="required-indicator"> *</span>}
                </label>
            )}
            <input
                type="text"
                name={name}
                list={datalistId}
                className={`form-input ${error ? 'form-input-error' : ''}`}
                value={value || ''}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
            />
            <datalist id={datalistId}>
                {suggestions.map((suggestion, index) => (
                    <option key={index} value={suggestion} />
                ))}
            </datalist>
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

export { FormLocationSelector } from './FormLocationSelector'
export { FormEducationSelector } from './FormEducationSelector'
