import { Link, useNavigate } from 'react-router-dom'
import { SearchX, Home, ArrowLeft } from 'lucide-react'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="container" style={{ padding: '6rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-card" style={{ padding: '3.5rem 3rem', textAlign: 'center', maxWidth: '520px', width: '100%' }}>
        {/* Icon */}
        <div style={{
          background: 'rgba(37, 99, 235, 0.1)',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          color: 'var(--primary)'
        }}>
          <SearchX size={40} />
        </div>

        {/* 404 Heading */}
        <h1 style={{
          fontSize: '5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--primary), var(--accent-purple, #8b5cf6))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: '0.75rem'
        }}>
          404
        </h1>

        {/* Messages */}
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Page not found
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            textDecoration: 'none'
          }}>
            <Home size={18} />
            Go Home
          </Link>

          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
