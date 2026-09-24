import { createProvider } from './base'

export function createD17ReferenceCode(userId, planId = 'monthly') {
    const normalizedUserId = typeof userId === 'string' && userId.trim().length > 0
        ? userId.trim().slice(0, 8)
        : 'guest'

    const normalizedPlanId = planId === 'yearly' ? 'yearly' : 'monthly'
    return `MOP-${normalizedUserId}-${normalizedPlanId}`
}

const d17Provider = createProvider({
    id: 'd17',
    label: 'D17 manual',
    startCheckout({ userId = null, planId = 'monthly' } = {}) {
        return {
            provider: 'd17',
            redirectUrl: null,
            manualFlow: true,
            referenceCode: createD17ReferenceCode(userId, planId),
            message: 'Manual D17 payment flow is active.'
        }
    }
})

export default d17Provider
