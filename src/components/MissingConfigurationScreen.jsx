import { AlertTriangle } from 'lucide-react'
import { requiredSupabaseEnvVars } from '../lib/supabase'

function MissingConfigurationScreen() {
    return (
        <main style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'var(--bg-primary, #f5f7fb)',
            color: 'var(--text-primary, #0f172a)'
        }}>
            <section style={{
                width: '100%',
                maxWidth: '640px',
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #dbe2ea)',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <AlertTriangle size={22} color="#d97706" />
                    <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Missing configuration</h1>
                </div>

                <p style={{ margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    MatchOp cannot start because required Supabase environment variables are not set.
                </p>

                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Required variables:</p>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                    {requiredSupabaseEnvVars.map((envKey) => (
                        <li key={envKey}>
                            <code>{envKey}</code>
                        </li>
                    ))}
                </ul>

                <p style={{ margin: '16px 0 0 0', color: 'var(--text-secondary, #475569)' }}>
                    Copy <code>.env.example</code> to <code>.env</code> and provide valid values, then restart the app.
                </p>
            </section>
        </main>
    )
}

export default MissingConfigurationScreen
