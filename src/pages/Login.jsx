import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PanelCard from '../components/PanelCard'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import FormMessage from '../components/FormMessage'
import { api, getSession, saveSession } from '../lib/api'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const goToNextScreen = async () => {
    const me = await api('/me')
    navigate(me.house ? '/house' : '/create-house', { replace: true })
  }

  // Already signed in? Skip the login screen.
  useEffect(() => {
    if (getSession()) goToNextScreen().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Passwords need at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const session = await api(mode === 'signup' ? '/auth/signup' : '/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      saveSession(session)
      setPassword('')
      await goToNextScreen()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError('')
  }

  return (
    <div className="login-page">
      <PanelCard>
        <h1 className="login-wordmark">truce</h1>
        <p className="login-tagline">one set of rules. everybody voted for.</p>
        {params.get('expired') && !error && (
          <FormMessage tone="info">Your session ended, please sign in again.</FormMessage>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          <FormInput
            label="email"
            type="email"
            placeholder="you@house.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="email"
            autoComplete="email"
            required
          />
          <FormInput
            label="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            name="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
          <FormMessage>{error}</FormMessage>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? 'One moment…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </PrimaryButton>
        </form>
        <p className="login-switch">
          {mode === 'signin' ? 'New to truce?' : 'Already have an account?'}{' '}
          <button type="button" className="login-switch-button" onClick={switchMode}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </PanelCard>
    </div>
  )
}

export default Login
