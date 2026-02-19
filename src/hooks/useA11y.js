import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Accessibility-focused Modal Component
 *
 * Features:
 * - Uses React Portal to render outside DOM hierarchy
 * - Focus trapping when modal is open
 * - Returns focus to trigger element on close
 * - Proper ARIA attributes
 * - ESC key to close
 */
export function FocusTrap({ children, isOpen, onClose, initialFocusRef }) {
    const modalRef = useRef(null)
    const previousActiveElement = useRef(null)

    // Store the previously focused element
    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement
        }
    }, [isOpen])

    // Handle focus trapping
    useEffect(() => {
        if (!isOpen) return

        const modal = modalRef.current
        if (!modal) return

        // Focus the modal or initialFocusRef
        const focusTarget = initialFocusRef?.current || modal
        setTimeout(() => focusTarget?.focus(), 0)

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return

            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
            const firstElement = focusableElements[0]
            const lastElement = focusableElements[focusableElements.length - 1]

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault()
                lastElement?.focus()
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault()
                firstElement?.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, initialFocusRef])

    // Return focus on close
    useEffect(() => {
        if (!isOpen && previousActiveElement.current) {
            previousActiveElement.current.focus()
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onKeyDown={(e) => {
                if (e.key === 'Escape') onClose?.()
            }}
        >
            {children}
        </div>
    )
}

/**
 * Portal wrapper for modals
 * Renders children into a portal outside the main DOM hierarchy
 */
export function ModalPortal({ children, isOpen }) {
    const portalRoot = useRef(null)

    useEffect(() => {
        // Create portal root if it doesn't exist
        if (!portalRoot.current) {
            const div = document.createElement('div')
            div.id = 'modal-portal'
            document.body.appendChild(div)
            portalRoot.current = div
        }

        return () => {
            // Don't remove portal root on unmount - it may be reused
        }
    }, [])

    if (!isOpen || !portalRoot.current) return null

    return createPortal(children, portalRoot.current)
}

/**
 * Hook to manage body scroll lock and aria-hidden
 * Use instead of setting aria-hidden on #root
 */
export function useAriaModal(isOpen) {
    useEffect(() => {
        if (!isOpen) return

        // Lock body scroll
        document.body.style.overflow = 'hidden'

        // Set aria-hidden on #root only when modal is open
        const root = document.getElementById('root')
        if (root) {
            root.setAttribute('aria-hidden', 'true')
        }

        return () => {
            document.body.style.overflow = ''
            if (root) {
                root.removeAttribute('aria-hidden')
            }
        }
    }, [isOpen])
}

export default { FocusTrap, ModalPortal, useAriaModal }
