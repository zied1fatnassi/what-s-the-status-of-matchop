import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Compass, Home } from 'lucide-react'

function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="page-shell flex items-center justify-center p-4">
      <div className="glass-card hover-lift text-center" style={{ maxWidth: '480px', width: '100%', padding: 'clamp(2rem, 5vw, 3.5rem)' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-xl)',
          background: 'rgba(59, 130, 246, 0.12)',
          color: 'var(--primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem'
        }}>
          <Compass size={32} />
        </div>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
          404
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
          {t('notFound.message', 'Page not found. The page you are looking for might have been moved or does not exist.')}
        </p>
        <Link to="/" className="btn btn-primary" style={{ minWidth: '180px' }}>
          <Home size={18} />
          <span>{t('notFound.backHome', 'Back to Home')}</span>
        </Link>
      </div>
    </div>
  )
}

export default NotFound
