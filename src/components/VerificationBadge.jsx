import { ShieldCheck, Mail, Linkedin } from 'lucide-react'
import './VerificationBadge.css'

/**
 * Displays verification badge based on verification method
 * Shows different icons and colors for email, LinkedIn, and manual verification
 */
function VerificationBadge({ verified, verificationMethod, size = 'sm', showLabel = false }) {
    if (!verified) return null

    const badges = {
        email: {
            icon: Mail,
            label: 'Email Verified',
            color: '#3b82f6',
            colorRgb: '59, 130, 246',
            tooltip: 'Email address verified'
        },
        linkedin: {
            icon: Linkedin,
            label: 'LinkedIn Verified',
            color: '#0a66c2',
            colorRgb: '10, 102, 194',
            tooltip: 'LinkedIn profile connected'
        },
        manual: {
            icon: ShieldCheck,
            label: 'Verified',
            color: '#10b981',
            colorRgb: '16, 185, 129',
            tooltip: 'Verified by MatchOp team'
        }
    }

    const badge = badges[verificationMethod] || badges.manual
    const Icon = badge.icon

    const sizeClasses = {
        xs: 'badge-xs',
        sm: 'badge-sm',
        md: 'badge-md',
        lg: 'badge-lg'
    }

    const iconSizes = {
        xs: 12,
        sm: 16,
        md: 20,
        lg: 24
    }

    return (
        <div
            className={`verification-badge ${sizeClasses[size]}`}
            title={badge.tooltip}
            style={{
                '--badge-color': badge.color,
                '--badge-color-rgb': badge.colorRgb
            }}
        >
            <Icon size={iconSizes[size]} />
            {showLabel && <span className="badge-label">{badge.label}</span>}
        </div>
    )
}

export default VerificationBadge
