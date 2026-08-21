import { useState } from 'react'
import { api } from '../api'
import { useApp } from '../context/AppContext'

export default function AuthScreen() {
  const { setUser } = useApp()
  const [mode, setMode]       = useState('signin')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const switchMode = (m) => { setMode(m); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        await api.signup(name.trim(), email.trim(), password)
      }
      const data = await api.login(email.trim(), password)
      if (!data.user_id) throw new Error(data.message || 'Login failed')
      const displayName = mode === 'signup' ? name.trim() : email.split('@')[0]
      setUser({ user_id: data.user_id, name: displayName })
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      background: 'var(--bg)',
    }}>
      {/* Wordmark */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '52px',
          color: 'var(--text)',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}>
          IRON LOG
        </div>
        <div style={{
          color: 'var(--faint)',
          fontSize: '13px',
          marginTop: '8px',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.04em',
        }}>
          TRACK YOUR IRON
        </div>
        {/* Decorative barbell line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
          <div style={{ width: '10px', height: '10px', background: 'var(--accent)', borderRadius: '2px' }} />
          <div style={{ width: '60px', height: '3px', background: 'var(--border)', borderRadius: '2px' }} />
          <div style={{ width: '4px', height: '18px', background: 'var(--faint)', borderRadius: '1px' }} />
          <div style={{ width: '60px', height: '3px', background: 'var(--border)', borderRadius: '2px' }} />
          <div style={{ width: '10px', height: '10px', background: 'var(--accent)', borderRadius: '2px' }} />
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{
        display: 'flex',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '3px',
        marginBottom: '28px',
        width: '100%',
        maxWidth: '360px',
      }}>
        {[['signin', 'Sign In'], ['signup', 'Sign Up']].map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: mode === m ? 'var(--raised)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--faint)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        {mode === 'signup' && (
          <div>
            <div className="label">Name</div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
              autoFocus
            />
          </div>
        )}

        <div>
          <div className="label">Email</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus={mode === 'signin'}
          />
        </div>

        <div>
          <div className="label">Password</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>

        {error && (
          <div className="error-text" role="alert">{error}</div>
        )}

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
          {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
