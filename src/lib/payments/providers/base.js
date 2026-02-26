/**
 * Provider interface (frontend-only D17 shell):
 * {
 *   id: 'd17',
 *   label: string,
 *   startCheckout: (params: {
 *     userId?: string | null,
 *     planId?: string,
 *     source?: string
 *   }) => {
 *     provider: 'd17',
 *     redirectUrl: string | null,
 *     message?: string,
 *     manualFlow?: boolean,
 *     referenceCode?: string
 *   }
 * }
 */

export function createProvider(definition) {
    if (!definition || typeof definition !== 'object') {
        throw new Error('Invalid payments provider definition')
    }
    if (!definition.id || typeof definition.startCheckout !== 'function') {
        throw new Error('Payments provider requires id and startCheckout')
    }
    return definition
}

export default {
    createProvider
}
