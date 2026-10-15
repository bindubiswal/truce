import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import PanelCard from '../components/PanelCard'
import PrimaryButton from '../components/PrimaryButton'
import FormMessage from '../components/FormMessage'
import { CATEGORIES } from './ProposeRule'
import { api } from '../lib/api'
import './HouseRules.css'

const ICONS = Object.fromEntries(CATEGORIES.map((c) => [c.label, c.icon]))

function RuleCard({ rule, onAgree, busy }) {
  const progress = Math.min(100, Math.round((rule.agree_count / rule.votes_needed) * 100))
  return (
    <article className={`rule-card ${rule.status === 'agreed' ? 'rule-card-agreed' : ''}`}>
      <div className="rule-card-top">
        <span className={`rule-status rule-status-${rule.status}`}>
          {rule.status === 'agreed' ? 'Agreed' : 'Voting'}
        </span>
        <span className="rule-date">
          {new Date(rule.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <p className="rule-text">{rule.text}</p>
      <div className="rule-tags">
        {rule.categories.map((c) => {
          const Icon = ICONS[c]
          return (
            <span key={c} className="rule-tag">
              {Icon && <Icon size={12} strokeWidth={2.5} />} {c}
            </span>
          )
        })}
      </div>
      <div className="rule-progress" aria-label={`${rule.agree_count} of ${rule.votes_needed} votes needed`}>
        <div className="rule-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="rule-card-bottom">
        <span className="rule-count">
          {rule.agree_count} of {rule.votes_needed} needed to agree
        </span>
        {rule.you_agreed ? (
          <span className="rule-agreed-you"><Check size={14} strokeWidth={3} /> You agreed</span>
        ) : (
          <button type="button" className="rule-agree-button" onClick={() => onAgree(rule.id)} disabled={busy}>
            {busy ? 'Saving…' : 'Agree'}
          </button>
        )}
      </div>
    </article>
  )
}

function HouseRules() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    api('/house')
      .then(setData)
      .catch((err) => {
        if (err.status === 404) navigate('/create-house', { replace: true })
        else setError(err.message)
      })
  }, [navigate])

  useEffect(load, [load])

  const agree = async (ruleId) => {
    setBusyId(ruleId)
    setError('')
    try {
      const updated = await api(`/rules/${ruleId}/vote`, { method: 'POST' })
      setData((d) => ({ ...d, rules: d.rules.map((r) => (r.id === ruleId ? updated : r)) }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="house-page">
      <AppHeader />
      <PanelCard title={data ? data.house.name : 'house rules'}>
        {!data && !error && <p className="loading-line">Loading your house…</p>}
        <FormMessage>{error}</FormMessage>
        {data && (
          <>
            <p className="house-members">
              {data.members.length} joined
              {data.pending_invites.length > 0 && ` · ${data.pending_invites.length} invited`}
              {' · '}{data.house.housemate_count} housemates in total
            </p>
            <PrimaryButton onClick={() => navigate('/propose-rule')}>Propose a Rule</PrimaryButton>
            {data.rules.length === 0 ? (
              <p className="house-empty">No rules yet. Propose the first one and get the house talking.</p>
            ) : (
              <div className="rule-list">
                {data.rules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} onAgree={agree} busy={busyId === rule.id} />
                ))}
              </div>
            )}
          </>
        )}
      </PanelCard>
    </div>
  )
}

export default HouseRules
