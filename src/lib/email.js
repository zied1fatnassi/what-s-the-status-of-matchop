// Email notifications disabled. This stub keeps imports stable without EmailJS.
export const sendMatchEmail = async () => {
    console.warn('Email notifications are disabled (EmailJS removed).')
    return { status: 'disabled' }
}
