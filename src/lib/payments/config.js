const ACTIVE_PROVIDER = 'd17'

export function getPaymentsProvider() {
    return ACTIVE_PROVIDER
}

export function getPaymentsAllowlist() {
    return [ACTIVE_PROVIDER]
}

export default {
    getPaymentsProvider,
    getPaymentsAllowlist
}
