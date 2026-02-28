import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

function ProfileMenu({
    menuId,
    isOpen,
    onToggle,
    onClose,
    triggerLabel,
    avatarUrl,
    initials,
    items = [],
    onLogout,
}) {
    const containerRef = useRef(null)
    const triggerRef = useRef(null)
    const closeMenu = (returnFocus = false) => {
        if (!isOpen) return
        onClose?.()
        if (returnFocus) {
            queueMicrotask(() => {
                triggerRef.current?.focus()
            })
        }
    }

    useEffect(() => {
        if (!isOpen) return undefined

        const handleDocumentClick = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                onClose?.()
            }
        }

        const handleDocumentKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose?.()
                queueMicrotask(() => {
                    triggerRef.current?.focus()
                })
            }
        }

        document.addEventListener('mousedown', handleDocumentClick)
        document.addEventListener('keydown', handleDocumentKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleDocumentClick)
            document.removeEventListener('keydown', handleDocumentKeyDown)
        }
    }, [isOpen, onClose])

    useEffect(() => {
        if (!isOpen) return
        const firstItem = containerRef.current?.querySelector('[data-menuitem="true"]')
        if (firstItem instanceof HTMLElement) {
            firstItem.focus()
        }
    }, [isOpen])

    const handleTriggerKeyDown = (event) => {
        const key = event.key
        if (key === 'Enter' || key === ' ' || key === 'ArrowDown') {
            event.preventDefault()
            if (!isOpen) {
                onToggle?.()
            }
        }
    }

    const handleContainerBlur = (event) => {
        if (!isOpen) return
        const nextFocusTarget = event.relatedTarget
        if (nextFocusTarget && containerRef.current?.contains(nextFocusTarget)) {
            return
        }
        closeMenu(false)
    }

    const handleActionItem = async (event, item) => {
        if (item.kind === 'logout') {
            await onLogout?.()
            closeMenu(false)
            return
        }

        await item.onSelect?.(event)
        if (item.closeOnSelect !== false) {
            closeMenu(false)
        }
    }

    const handleLinkItem = (event, item) => {
        item.onSelect?.(event)
        closeMenu(false)
    }

    return (
        <div
            ref={containerRef}
            className={`profile-menu-shell ${isOpen ? 'open' : ''}`}
            onBlur={handleContainerBlur}
        >
            <button
                id={`${menuId}-trigger`}
                ref={triggerRef}
                type="button"
                className="navbar-utility-button profile-trigger"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={menuId}
                aria-label={isOpen ? 'Close profile menu' : 'Open profile menu'}
                onClick={() => onToggle?.()}
                onKeyDown={handleTriggerKeyDown}
            >
                <span className="profile-trigger-avatar" aria-hidden="true">
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
                </span>
                <span className="profile-trigger-label">{triggerLabel}</span>
                <ChevronDown size={16} className="profile-trigger-chevron" aria-hidden="true" />
            </button>

            {isOpen && (
                <ul
                    id={menuId}
                    className="profile-menu"
                    role="menu"
                    aria-labelledby={`${menuId}-trigger`}
                >
                    {items.map((item) => {
                        if (item.type === 'divider') {
                            return <li key={item.id} className="profile-menu-divider" role="separator" />
                        }

                        const itemClasses = [
                            'profile-menu-item',
                            item.active ? 'active' : '',
                            item.danger || item.kind === 'logout' ? 'danger' : '',
                        ].filter(Boolean).join(' ')

                        if (item.type === 'action' || item.kind === 'logout') {
                            return (
                                <li key={item.id} role="none">
                                    <button
                                        type="button"
                                        className={itemClasses}
                                        role="menuitem"
                                        data-menuitem="true"
                                        onClick={(event) => {
                                            handleActionItem(event, item)
                                        }}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </button>
                                </li>
                            )
                        }

                        return (
                            <li key={item.id} role="none">
                                <Link
                                    to={item.to}
                                    className={itemClasses}
                                    role="menuitem"
                                    data-menuitem="true"
                                    onClick={(event) => {
                                        handleLinkItem(event, item)
                                    }}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

export default ProfileMenu
