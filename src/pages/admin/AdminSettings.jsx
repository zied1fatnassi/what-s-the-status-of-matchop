import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useBilingualText } from '../../lib/useBilingualText'
import './Admin.css'

export default function AdminSettings() {
    const tr = useBilingualText()
    const [settings, setSettings] = useState({
        siteName: 'MATCHOP',
        siteDescription: 'Match students with internship opportunities',
        contactEmail: 'contact@matchop.com',
        maxOffersPerCompany: 50,
        matchExpiryDays: 30,
        enableEmailNotifications: true,
        enablePushNotifications: false,
        maintenanceMode: false,
        allowNewSignups: true
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    async function fetchSettings() {
        try {
            const { data } = await supabase
                .from('app_settings')
                .select('*')
                .single()

            if (data) {
                setSettings(data.settings || settings)
            }
        } catch {
            console.log('No settings found, using defaults')
        } finally {
            setLoading(false)
        }
    }

    async function saveSettings() {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    id: 1,
                    settings,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error

            await logAdminAction('Updated app settings')
            setMessage({ type: 'success', text: tr('Settings saved successfully!', 'Parametres enregistres avec succes !') })
            setTimeout(() => setMessage(null), 3000)
        } catch (error) {
            console.error('Error saving settings:', error)
            setMessage({ type: 'error', text: tr('Failed to save settings', "Echec d'enregistrement des parametres") })
        } finally {
            setSaving(false)
        }
    }

    async function logAdminAction(action) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('admin_audit_logs').insert({
            admin_id: user?.id,
            admin_email: user?.email,
            action,
            target_type: 'settings'
        })
    }

    if (loading) {
        return (
            <div className="admin-container">
                <div className="admin-loading">{tr('Loading settings...', 'Chargement des parametres...')}</div>
            </div>
        )
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>{tr('System Settings', 'Parametres systeme')}</h1>
                <p>{tr('Configure application settings', "Configurer les parametres de l'application")}</p>
            </div>

            {message && (
                <div className={`admin-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="admin-section">
                <h2>{tr('General Settings', 'Parametres generaux')}</h2>

                <div className="admin-form-group">
                    <label>{tr('Site Name', 'Nom du site')}</label>
                    <input
                        type="text"
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    />
                </div>

                <div className="admin-form-group">
                    <label>{tr('Site Description', 'Description du site')}</label>
                    <textarea
                        value={settings.siteDescription}
                        onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                        rows={3}
                    />
                </div>

                <div className="admin-form-group">
                    <label>{tr('Contact Email', 'Email de contact')}</label>
                    <input
                        type="email"
                        value={settings.contactEmail}
                        onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    />
                </div>
            </div>

            <div className="admin-section">
                <h2>{tr('Limits & Rules', 'Limites et regles')}</h2>

                <div className="admin-form-group">
                    <label>{tr('Max Offers Per Company', "Max d'offres par entreprise")}</label>
                    <input
                        type="number"
                        value={settings.maxOffersPerCompany}
                        onChange={(e) => setSettings({ ...settings, maxOffersPerCompany: parseInt(e.target.value, 10) })}
                        min={1}
                        max={1000}
                    />
                </div>

                <div className="admin-form-group">
                    <label>{tr('Match Expiry (days)', 'Expiration des matchs (jours)')}</label>
                    <input
                        type="number"
                        value={settings.matchExpiryDays}
                        onChange={(e) => setSettings({ ...settings, matchExpiryDays: parseInt(e.target.value, 10) })}
                        min={1}
                        max={365}
                    />
                </div>
            </div>

            <div className="admin-section">
                <h2>{tr('Notifications', 'Notifications')}</h2>

                <div className="settings-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.enableEmailNotifications}
                            onChange={(e) => setSettings({ ...settings, enableEmailNotifications: e.target.checked })}
                        />
                        <span>{tr('Enable Email Notifications', 'Activer les notifications email')}</span>
                    </label>
                </div>

                <div className="settings-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.enablePushNotifications}
                            onChange={(e) => setSettings({ ...settings, enablePushNotifications: e.target.checked })}
                        />
                        <span>{tr('Enable Push Notifications', 'Activer les notifications push')}</span>
                    </label>
                </div>
            </div>

            <div className="admin-section">
                <h2>{tr('System Controls', 'Controles systeme')}</h2>

                <div className="settings-toggle warning">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                        />
                        <span>{tr('Maintenance Mode', 'Mode maintenance')}</span>
                    </label>
                    <p className="setting-description">
                        {tr('When enabled, only admins can access the site', "Quand active, seuls les admins peuvent acceder au site")}
                    </p>
                </div>

                <div className="settings-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.allowNewSignups}
                            onChange={(e) => setSettings({ ...settings, allowNewSignups: e.target.checked })}
                        />
                        <span>{tr('Allow New Signups', 'Autoriser les nouvelles inscriptions')}</span>
                    </label>
                    <p className="setting-description">
                        {tr('Disable to prevent new user registrations', 'Desactivez pour bloquer les nouvelles inscriptions')}
                    </p>
                </div>
            </div>

            <div className="admin-settings-actions">
                <button
                    className="admin-btn admin-btn-success admin-btn-lg"
                    onClick={saveSettings}
                    disabled={saving}
                >
                    {saving ? tr('Saving...', 'Enregistrement...') : tr('Save Settings', 'Enregistrer les parametres')}
                </button>
            </div>
        </div>
    )
}
