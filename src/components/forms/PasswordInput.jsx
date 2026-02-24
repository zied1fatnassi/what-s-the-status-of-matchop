import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import './PasswordInput.css'

const BULLET_CHAR = String.fromCharCode(8226)

function PasswordInput({
    id,
    name = 'password',
    value = '',
    onChange,
    onFocus,
    onBlur,
    placeholder = 'Enter your password',
    required = false,
    disabled = false,
    autoComplete = 'current-password',
    className = '',
    inputClassName = 'input',
    hasLeadingIcon = false,
    ...rest
}) {
    const generatedId = useId()
    const inputId = id || `matchop-password-${generatedId.replace(/:/g, '')}`
    const toggleButtonId = `${inputId}-toggle`

    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [scrollLeft, setScrollLeft] = useState(0)

    const inputRef = useRef(null)
    const frameRef = useRef(null)

    const syncScroll = useCallback(() => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current)
        }

        frameRef.current = requestAnimationFrame(() => {
            if (inputRef.current) {
                setScrollLeft(inputRef.current.scrollLeft)
            }
        })
    }, [])

    useEffect(() => {
        syncScroll()
    }, [value, syncScroll])

    useEffect(() => {
        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current)
            }
        }
    }, [])

    const handleChange = (event) => {
        onChange?.(event)
        syncScroll()
    }

    const handleFocus = (event) => {
        setIsFocused(true)
        onFocus?.(event)
    }

    const handleBlur = (event) => {
        setIsFocused(false)
        onBlur?.(event)
    }

    const isMasked = !isPasswordVisible && Boolean(value)

    return (
        <div
            className={[
                'matchop-password-input',
                isFocused ? 'is-focused' : '',
                isPasswordVisible ? 'is-visible' : '',
                disabled ? 'is-disabled' : '',
                className
            ].join(' ').trim()}
        >
            <Motion.span
                aria-hidden="true"
                className="matchop-password-focus-glow"
                animate={{
                    opacity: isFocused ? 1 : 0,
                    scale: isFocused ? 1 : 0.98
                }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
            />

            <input
                ref={inputRef}
                id={inputId}
                type={isPasswordVisible ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={handleChange}
                onSelect={syncScroll}
                onKeyUp={syncScroll}
                onClick={syncScroll}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required={required}
                disabled={disabled}
                autoComplete={autoComplete}
                autoCapitalize="off"
                autoCorrect="off"
                placeholder={placeholder}
                aria-describedby={toggleButtonId}
                className={`${inputClassName} matchop-password-field ${isMasked ? 'matchop-password-field--masked' : ''}`.trim()}
                {...rest}
            />

            <AnimatePresence initial={false}>
                {isMasked && (
                    <Motion.div
                        key="mask"
                        aria-hidden="true"
                        className={`matchop-password-mask ${hasLeadingIcon ? 'matchop-password-mask--with-icon' : ''}`.trim()}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                    >
                        <Motion.span
                            key={value}
                            className="matchop-password-mask-text"
                            initial={{ y: 4, opacity: 0, filter: 'blur(2px)' }}
                            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{ transform: `translateX(-${scrollLeft}px)` }}
                        >
                            {BULLET_CHAR.repeat(value.length)}
                        </Motion.span>
                    </Motion.div>
                )}
            </AnimatePresence>

            <Motion.button
                type="button"
                id={toggleButtonId}
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                aria-controls={inputId}
                aria-pressed={isPasswordVisible}
                className="matchop-password-toggle"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                disabled={disabled}
                whileHover={disabled ? undefined : { scale: 1.04 }}
                whileTap={disabled ? undefined : { scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            >
                <AnimatePresence initial={false} mode="wait">
                    {isPasswordVisible ? (
                        <Motion.span
                            key="hide"
                            className="matchop-password-toggle-icon"
                            initial={{ opacity: 0, rotate: -8, scale: 0.9, y: 2 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 8, scale: 0.9, y: -2 }}
                            transition={{ duration: 0.14 }}
                        >
                            <EyeOff size={18} />
                        </Motion.span>
                    ) : (
                        <Motion.span
                            key="show"
                            className="matchop-password-toggle-icon"
                            initial={{ opacity: 0, rotate: 8, scale: 0.9, y: 2 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: -8, scale: 0.9, y: -2 }}
                            transition={{ duration: 0.14 }}
                        >
                            <Eye size={18} />
                        </Motion.span>
                    )}
                </AnimatePresence>
            </Motion.button>
        </div>
    )
}

export default PasswordInput
