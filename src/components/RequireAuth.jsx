import { Navigate } from 'react-router-dom'
import { getSession } from '../lib/api'

// Wraps every screen after login. No session means straight back to the login screen.
function RequireAuth({ children }) {
  if (!getSession()) return <Navigate to="/" replace />
  return children
}

export default RequireAuth
