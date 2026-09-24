const OVERLAY_LOCK_ATTR = 'data-overlay-lock-count'

export function lockOverlayScroll() {
    if (typeof document === 'undefined') return

    const body = document.body
    const current = Number(body.getAttribute(OVERLAY_LOCK_ATTR) || '0')
    const next = current + 1

    body.setAttribute(OVERLAY_LOCK_ATTR, String(next))
    body.classList.add('overlay-open')
}

export function unlockOverlayScroll() {
    if (typeof document === 'undefined') return

    const body = document.body
    const current = Number(body.getAttribute(OVERLAY_LOCK_ATTR) || '0')
    const next = Math.max(0, current - 1)

    if (next === 0) {
        body.removeAttribute(OVERLAY_LOCK_ATTR)
        body.classList.remove('overlay-open')
        return
    }

    body.setAttribute(OVERLAY_LOCK_ATTR, String(next))
}