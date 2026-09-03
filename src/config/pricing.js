export const CURRENCY = 'TND'

export const PLANS = {
    monthly: {
        id: 'monthly',
        label: 'Monthly',
        price: 19,
        cadence: '/month',
        badge: null
    },
    yearly: {
        id: 'yearly',
        label: 'Yearly',
        price: 149,
        cadence: '/year',
        badge: 'Best value'
    }
}

export const PREMIUM_FEATURES = [
    'Unlimited daily discovery',
    'Global opportunity discovery',
    'Personalized recommendations',
    'Faster matching momentum',
    'Priority profile visibility',
    'Early access to premium features'
]

export default {
    CURRENCY,
    PLANS,
    PREMIUM_FEATURES
}
