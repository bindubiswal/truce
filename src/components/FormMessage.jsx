import './FormMessage.css'

// Shows an error or info line under a form. role="alert" lets screen readers announce it.
function FormMessage({ children, tone = 'error' }) {
  if (!children) return null
  return (
    <p className={`form-message form-message-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}

export default FormMessage
