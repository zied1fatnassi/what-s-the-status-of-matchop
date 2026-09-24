import { safeLogDebug } from './logger'

export function track(event, payload = {}) {
    safeLogDebug('[analytics]', { event, payload })
}

export default {
    track
}
