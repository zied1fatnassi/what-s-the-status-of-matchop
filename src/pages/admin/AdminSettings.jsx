import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './Admin.css'

export default function AdminSettings() {
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
            setMessage({ type: 'success', text: 'Settings saved successfully!' })
            setTimeout(() => setMessage(null), 3000)
        } catch (error) {
            console.error('Error saving settings:', error)
            setMessage({ type: 'error', text: 'Failed to save settings' })
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
                <div className="admin-loading">Loading settings...</div>
            </div>
        )
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>⚙️ System Settings</h1>
                <p>Configure application settings</p>
            </div>

            {message && (
                <div className={`admin-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* General Settings */}
            <div className="admin-section">
                <h2>General Settings</h2>
                
                <div className="admin-form-group">
                    <label>Site Name</label>
                    <input
                        type="text"
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    />
                </div>

                <div className="admin-form-group">
                    <label>Site Description</label>
                    <textarea
                        value={settings.siteDescription}
                        onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                        rows={3}
                    />
                </div>

                <div className="admin-form-group">
                    <label>Contact Email</label>
                    <input
                        type="email"
                        value={settings.contactEmail}
                        onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    />
                </div>
            </div>

            {/* Limits & Rules */}
            <div className="admin-section">
                <h2>Limits & Rules</h2>
                
                <div className="admin-form-group">
                    <label>Max Offers Per Company</label>
                    <input
                        type="number"
                        value={settings.maxOffersPerCompany}
                        onChange={(e) => setSettings({ ...settings, maxOffersPerCompany: parseInt(e.target.value) })}
                        min={1}
                        max={1000}
                    />
                </div>

                <div className="admin-form-group">
                    <label>Match Expiry (days)</label>
                    <input
                        type="number"
                        value={settings.matchExpiryDays}
                        onChange={(e) => setSettings({ ...settings, matchExpiryDays: parseInt(e.target.value) })}
                        min={1}
                        max={365}
                    />
                </div>
            </div>

            {/* Notifications */}
            <div className="admin-section">
                <h2>Notifications</h2>
                
                <div className="settings-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.enableEmailNotifications}
                            onChange={(e) => setSettings({ ...settings, enableEmailNotifications: e.target.checked })}
                        />
                        <span>Enable Email Notifications</span>
                    </label>
                </div>

                <div className="settings-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.enablePushNotifications}
                            onChange={(e) => setSettings({ ...settings, enablePushNotifications: e.target.checked })}
                        />
                        <span>Enable Push Notifications</span>
                    </label>
                </div>
            </div>

            {/* System Controls */}
            <div className="admin-section">
                <h2>System Controls</h2>
                
                <div className="settings-toggle warning">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                        />
                        <span>Maintenance Mode</span>
                    </label>
                    <p className="setting-description">
                        When enabled, only admins can access the site
                    </p>
                </div>

                <div className="settings-toggle">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.allowNewSignups}
                            onChange={(e) => setSettings({ ...settings, allowNewSignups: e.target.checked })}
                        />
                        <span>Allow New Signups</span>
                    </label>
                    <p className="setting-description">
                        Disable to prevent new user registrations
                    </p>
                </div>
            </div>

            {/* Save Button */}
            <div className="admin-settings-actions">
                <button
                    className="admin-btn admin-btn-success admin-btn-lg"
                    onClick={saveSettings}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : '💾 Save Settings'}
                </button>
            </div>
        </div>
    )
}
