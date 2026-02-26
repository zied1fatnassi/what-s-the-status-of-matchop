import { getPaymentsAllowlist, getPaymentsProvider } from './config'
import d17Provider from './providers/d17'

const PROVIDERS = {
    d17: d17Provider
}

export function getProvider() {
    const providerKey = getPaymentsProvider()
    return PROVIDERS[providerKey] || d17Provider
}

export function startCheckout(params = {}) {
    return getProvider().startCheckout(params)
}

export function getAvailableProviders() {
    const allowlist = getPaymentsAllowlist()
    const providerKey = getPaymentsProvider()
    if (!allowlist.includes(providerKey)) return ['d17']
    return [providerKey]
}

export default {
    getProvider,
    startCheckout,
    getAvailableProviders
}
