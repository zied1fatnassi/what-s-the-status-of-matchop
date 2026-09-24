const DEBUG_WEB_VITALS = import.meta.env.VITE_DEBUG_WEBVITALS === 'true'
const MAX_SELECTOR_DEPTH = 5
const CLS_EVENT_STORE_KEY = '__MATCHOP_CLS_DEBUG__'

function formatRect(rect) {
    if (!rect) return null

    return {
        x: Number(rect.x?.toFixed?.(2) ?? rect.x ?? 0),
        y: Number(rect.y?.toFixed?.(2) ?? rect.y ?? 0),
        width: Number(rect.width?.toFixed?.(2) ?? rect.width ?? 0),
        height: Number(rect.height?.toFixed?.(2) ?? rect.height ?? 0),
    }
}

function toSelector(node) {
    if (!node || node.nodeType !== 1) return null

    if (node.id) {
        return `${node.tagName.toLowerCase()}#${node.id}`
    }

    const parts = []
    let cursor = node
    let depth = 0

    while (cursor && cursor.nodeType === 1 && depth < MAX_SELECTOR_DEPTH) {
        const tag = cursor.tagName.toLowerCase()
        const classNames = Array.from(cursor.classList || []).slice(0, 2)
        const classPart = classNames.length ? `.${classNames.join('.')}` : ''

        let nthPart = ''
        const parent = cursor.parentElement
        if (parent) {
            const siblings = Array.from(parent.children).filter(
                (child) => child.tagName === cursor.tagName,
            )
            if (siblings.length > 1) {
                nthPart = `:nth-of-type(${siblings.indexOf(cursor) + 1})`
            }
        }

        parts.unshift(`${tag}${classPart}${nthPart}`)

        if (cursor.id) break
        cursor = cursor.parentElement
        depth += 1
    }

    return parts.join(' > ')
}

function logLayoutShiftEntry(entry, runningCls) {
    const entryValue = Number(entry.value ?? 0)
    const startTime = Number(entry.startTime ?? 0)
    const sources = (entry.sources || []).map((source) => ({
        selector: toSelector(source?.node) || '(selector unavailable)',
        previousRect: formatRect(source?.previousRect),
        currentRect: formatRect(source?.currentRect),
    }))

    console.groupCollapsed(
        `[CLS][layout-shift] +${entryValue.toFixed(4)} @ ${startTime.toFixed(1)}ms (running ${runningCls.toFixed(4)})`,
    )
    if (sources.length) {
        console.table(sources)
    } else {
        console.log('No layout shift sources exposed by the browser for this entry.')
    }
    console.log(entry)
    console.groupEnd()

    if (typeof window !== 'undefined' && Array.isArray(window[CLS_EVENT_STORE_KEY])) {
        window[CLS_EVENT_STORE_KEY].push({
            type: 'layout-shift',
            value: Number(entryValue.toFixed(4)),
            runningCls: Number(runningCls.toFixed(4)),
            timeMs: Number(startTime.toFixed(1)),
            sources,
        })
    }
}

function setupLayoutShiftObserver() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        console.warn('[CLS][debug] PerformanceObserver is not available in this browser.')
        return
    }

    let runningCls = 0
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue
            runningCls += entry.value
            logLayoutShiftEntry(entry, runningCls)
        }
    })

    observer.observe({ type: 'layout-shift', buffered: true })

    window.addEventListener(
        'beforeunload',
        () => {
            observer.disconnect()
        },
        { once: true },
    )
}

async function setupWebVitalsLogger() {
    try {
        const { onCLS } = await import('web-vitals/attribution')

        onCLS(
            (metric) => {
                const latestEntry = metric.entries?.[metric.entries.length - 1]
                const payload = {
                    value: Number(metric.value.toFixed(4)),
                    delta: Number(metric.delta.toFixed(4)),
                    rating: metric.rating,
                    id: metric.id,
                    navigationType: metric.navigationType,
                    largestShiftTarget: metric.attribution?.largestShiftTarget || '(none)',
                    timeMs: latestEntry ? Number(latestEntry.startTime.toFixed(1)) : null,
                }

                console.log('[CLS][web-vitals]', payload)

                if (typeof window !== 'undefined' && Array.isArray(window[CLS_EVENT_STORE_KEY])) {
                    window[CLS_EVENT_STORE_KEY].push({
                        type: 'web-vitals-cls',
                        ...payload,
                    })
                }
            },
            { reportAllChanges: true },
        )
    } catch (error) {
        console.warn('[CLS][debug] Failed to initialize web-vitals logger.', error)
    }
}

export function initWebVitalsDebug() {
    if (!DEBUG_WEB_VITALS || typeof window === 'undefined') return

    window[CLS_EVENT_STORE_KEY] = []

    console.info('[CLS][debug] Enabled. Set VITE_DEBUG_WEBVITALS=false to disable.')
    setupLayoutShiftObserver()
    void setupWebVitalsLogger()
}
