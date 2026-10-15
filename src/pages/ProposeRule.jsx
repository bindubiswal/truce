import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CookingPot, Sofa, Volume2, UserPlus, Plug } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import PanelCard from '../components/PanelCard'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import FormMessage from '../components/FormMessage'
import { api } from '../lib/api'
import './ProposeRule.css'

export const CATEGORIES = [
  { label: 'Kitchen', icon: CookingPot },
  { label: 'Shared Space', icon: Sofa },
  { label: 'Noise', icon: Volume2 },
  { label: 'Guests', icon: UserPlus },
  { label: 'Utilities & Supplies', icon: Plug },
]

const MAX_CHARS = 280

function ProposeRule() {
  const navigate = useNavigate()
  const [ruleText, setRuleText] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handlePost = async (e) => {
    e.preventDefault()
    setError('')
    if (!ruleText.trim()) {
      setError('Write the rule before posting it.')
      return
    }
    if (selectedCategories.length === 0) {
      setError('Pick at least one category.')
      return
    }
    setLoading(true)
    try {
      const rule = await api('/rules', {
        method: 'POST',
        body: { text: ruleText, categories: selectedCategories },
      })
      navigate(`/confirmation/${rule.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="propose-rule-page">
      <AppHeader />
      <PanelCard title="propose a rule">
        <p className="propose-rule-subtext">
          something the house does, not something a person did
        </p>
        <form className="propose-rule-form" onSubmit={handlePost}>
          <div className="textarea-wrapper">
            <FormInput
              as="textarea"
              placeholder="e.g. Dishes get done within 24 hours"
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
              name="ruleText"
              maxLength={MAX_CHARS}
              aria-label="rule"
            />
            <span className={`char-counter ${ruleText.length >= MAX_CHARS ? 'char-counter-full' : ''}`}>
              {ruleText.length} / {MAX_CHARS}
            </span>
          </div>

          <div className="category-section">
            <span className="category-label">category</span>
            <div className="category-tags">
              {CATEGORIES.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className={`category-tag ${selectedCategories.includes(label) ? 'active' : ''}`}
                  onClick={() => toggleCategory(label)}
                  aria-pressed={selectedCategories.includes(label)}
                >
                  <Icon className="category-tag-icon" size={14} strokeWidth={2.5} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <FormMessage>{error}</FormMessage>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? 'Posting…' : 'Post for Vote'}
          </PrimaryButton>
        </form>
        <Link to="/house" className="text-link">See all house rules</Link>
      </PanelCard>
    </div>
  )
}

export default ProposeRule
