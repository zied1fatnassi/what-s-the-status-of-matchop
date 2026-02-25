import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function NotFound() {
  const { t } = useTranslation()
  return (
    <section
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: '#fff',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '2rem' }}>404</h1>
      <p style={{ margin: 0, opacity: 0.85 }}>{t('notFound.message')}</p>
      <Link to="/" className="btn btn-primary">
        {t('notFound.backHome')}
      </Link>
    </section>
  )
}

export default NotFound
