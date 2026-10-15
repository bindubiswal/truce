import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import PanelCard from '../components/PanelCard'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import FormMessage from '../components/FormMessage'
import { api } from '../lib/api'
import './CreateHouse.css'

function CreateHouse() {
  const navigate = useNavigate()
  const [houseName, setHouseName] = useState('')
  const [inviteEmails, setInviteEmails] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // People who already belong to a house go straight to it.
  useEffect(() => {
    api('/me')
      .then((me) => { if (me.house) navigate('/house', { replace: true }) })
      .catch(() => {})
  }, [navigate])

  const invited = inviteEmails
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api('/houses', { method: 'POST', body: { name: houseName, invites: invited } })
      navigate('/propose-rule')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-house-page">
      <AppHeader />
      <PanelCard title="new house">
        <form className="create-house-form" onSubmit={handleCreate}>
          <FormInput
            label="house name"
            type="text"
            placeholder="e.g. The Cozy Flat"
            value={houseName}
            onChange={(e) => setHouseName(e.target.value)}
            name="houseName"
            maxLength={60}
            required
          />
          <FormInput
            label="invite housemates"
            type="text"
            placeholder="emails, separated by commas"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            name="inviteEmails"
          />
          <p className="create-house-hint">
            {invited.length > 0
              ? `${invited.length + 1} housemates including you. They join when they sign up with that email.`
              : 'Housemates join when they sign up with the email you invite.'}
          </p>
          <FormMessage>{error}</FormMessage>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create'}
          </PrimaryButton>
        </form>
      </PanelCard>
    </div>
  )
}

export default CreateHouse
