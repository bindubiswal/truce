import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import PanelCard from '../components/PanelCard'
import PrimaryButton from '../components/PrimaryButton'
import FormMessage from '../components/FormMessage'
import { api } from '../lib/api'
import './Confirmation.css'

function formatCategoryList(categories) {
  if (!categories || categories.length === 0) return ''
  if (categories.length === 1) return categories[0]
  if (categories.length === 2) return `${categories[0]} & ${categories[1]}`
  return `${categories.slice(0, -1).join(', ')} & ${categories[categories.length - 1]}`
}

function Confirmation() {
  const navigate = useNavigate()
  const { ruleId } = useParams()
  const [rule, setRule] = useState(null)
  const [error, setError] = useState('')

  // The rule is read back from Supabase, so this screen proves the save worked.
  useEffect(() => {
    api(`/rules/${ruleId}`)
      .then(setRule)
      .catch((err) => setError(err.message))
  }, [ruleId])

  const categoryLabel = rule ? formatCategoryList(rule.categories) : ''

  return (
    <div className="confirmation-page">
      <AppHeader />
      <PanelCard title="rule posted">
        {error && <FormMessage>{error}</FormMessage>}
        {!rule && !error && <p className="loading-line">Loading your rule…</p>}
        {rule && (
          <>
            <div className="confirmation-icon">✓</div>
            <p className="confirmation-message">
              Your <strong>{categoryLabel}</strong> rule is live, housemates can now vote.
            </p>
            <p className="confirmation-vote-info">
              {rule.votes_needed} of {rule.housemate_count} housemates need to agree · {rule.agree_count} so far
            </p>
            <div className="confirmation-summary">
              <p className="summary-rule">"{rule.text}"</p>
              <p className="summary-categories">{rule.categories.join(' · ')}</p>
            </div>
          </>
        )}
        <PrimaryButton onClick={() => navigate('/house')}>See House Rules</PrimaryButton>
        <button type="button" className="text-link confirmation-again" onClick={() => navigate('/propose-rule')}>
          Propose another rule
        </button>
      </PanelCard>
    </div>
  )
}

export default Confirmation
