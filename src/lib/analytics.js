export function track(event, payload = {}) {
    console.info('[analytics]', event, payload)
}

export default {
    track
}
