import { useNavigate, Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { clearSession, getSession } from '../lib/api'
import './AppHeader.css'

function AppHeader() {
  const navigate = useNavigate()
  const session = getSession()

  const signOut = () => {
    clearSession()
    navigate('/', { replace: true })
  }

  return (
    <header className="app-header">
      <Link to="/house" className="app-header-wordmark">truce</Link>
      <div className="app-header-right">
        {session && <span className="app-header-email" title={session.email}>{session.email}</span>}
        <button type="button" className="app-header-signout" onClick={signOut} aria-label="Sign out">
          <LogOut size={16} strokeWidth={2.25} />
        </button>
      </div>
    </header>
  )
}

export default AppHeader
