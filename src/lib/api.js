// Small helper for talking to the Python backend.
// The React app never sees any Supabase keys. It only holds the signed-in
// user's short-lived access token, which the backend checks on every request.

const TOKEN_KEY = 'truce_session'

export function getSession() {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (session.expiresAt && Date.now() > session.expiresAt) {
      sessionStorage.removeItem(TOKEN_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function saveSession({ access_token, expires_in, email }) {
  const session = {
    token: access_token,
    email,
    expiresAt: Date.now() + (expires_in || 3600) * 1000,
  }
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session))
  } catch {
    /* storage unavailable, the user will just be asked to sign in again */
  }
  return session
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* nothing to clear */
  }
}

function readError(body, status) {
  if (!body) return `Something went wrong (${status}). Please try again.`
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail) && body.detail.length) {
    // FastAPI validation errors come back as a list
    return body.detail[0].msg.replace(/^Value error, /, '')
  }
  return `Something went wrong (${status}). Please try again.`
}

export async function api(path, { method = 'GET', body } = {}) {
  const session = getSession()
  const headers = { 'Content-Type': 'application/json' }
  if (session) headers.Authorization = `Bearer ${session.token}`

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.")
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (res.status === 401 && session) {
    clearSession()
    window.location.assign('/?expired=1')
  }
  if (!res.ok) {
    const err = new Error(readError(data, res.status))
    err.status = res.status
    throw err
  }
  return data
}
