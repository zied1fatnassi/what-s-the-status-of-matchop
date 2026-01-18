import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'

const ThemeContext = createContext()

/**
 * Manages the application theme (light, dark, system).
 * Applies 'data-theme' attribute to the document root.
 * Provides reactive isDark value for components.
 */
export const ThemeProvider = ({ children }) => {
    // Default to 'light' as requested by user
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('matchop-theme')
        return saved || 'light'
    })
    
    // Track the actual applied theme (resolved from 'system' if needed)
    const [appliedTheme, setAppliedTheme] = useState('light')

    useEffect(() => {
        const root = window.document.documentElement
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

        const applyTheme = (targetTheme) => {
            let resolvedTheme
            if (targetTheme === 'system') {
                resolvedTheme = systemDark.matches ? 'dark' : 'light'
            } else {
                resolvedTheme = targetTheme
            }
            root.setAttribute('data-theme', resolvedTheme)
            setAppliedTheme(resolvedTheme)
        }

        applyTheme(theme)
        localStorage.setItem('matchop-theme', theme)

        // Listener for system changes if in system mode
        if (theme === 'system') {
            const listener = (e) => {
                const newTheme = e.matches ? 'dark' : 'light'
                root.setAttribute('data-theme', newTheme)
                setAppliedTheme(newTheme)
            }
            systemDark.addEventListener('change', listener)
            return () => systemDark.removeEventListener('change', listener)
        }
    }, [theme])

    // Memoize value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        theme,
        setTheme,
        isDark: appliedTheme === 'dark',
        appliedTheme
    }), [theme, appliedTheme])

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
