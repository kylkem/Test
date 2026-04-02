import { useState } from 'react'

function toMonthly(amount, frequency) {
  const factors = { weekly: 52/12, monthly: 1, quarterly: 1/3, annual: 1/12 }
  return (parseFloat(amount) || 0) * (factors[frequency] || 1)
}

const PRIORITY_COLORS = { high: 'red', medium: 'amber', low: 'blue' }
const PRIORITY_LABELS = { high: '🔴 High', medium: '🟡 Medium', low: '🔵 Low' }
const GOAL_ICONS = ['🏠','🚗','✈️','🎓','💍','🏖️','💻','📱','🏦','💰','🏥','👶','🎯','🌟']

const blank = () => ({
  id: Date.now(),
  name: '',
  targetAmount: '',
  currentAmount: '',
  targetDate: '',
  priority: 'medium',
  icon: '🎯',
})

export default function SavingsGoals({ goals, setGoals, income, bills }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank())

  const totalBills = bills.reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0)
  const surplus = (income.netMonthly || 0) - totalBills
  const availableForGoals = Math.max(0, surplus)

  const openAdd = () => { setForm(blank()); setEditing('new') }
  const openEdit = (g) => { setForm({ ...g }); setEditing(g.id) }

  const saveForm = () => {
    if (!form.name || !form.targetAmount) return
    if (editing === 'new') setGoals([...goals, { ...form, id: Date.now() }])
    else setGoals(goals.map(g => g.id === editing ? form : g))
    setEditing(null)
  }

  const deleteGoal = (id) => setGoals(goals.filter(g => g.id !== id))

  const getMonthsLeft = (goal) => {
    if (!goal.targetDate) return null
    const now = new Date()
    const target = new Date(goal.targetDate)
    const diff = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
    return Math.max(0, diff)
  }

  const getRequiredMonthly = (goal) => {
    const remaining = (parseFloat(goal.targetAmount) || 0) - (parseFloat(goal.currentAmount) || 0)
    const months = getMonthsLeft(goal)
    if (!months || months === 0) return remaining > 0 ? remaining : 0
    return remaining > 0 ? remaining / months : 0
  }

  const getPct = (goal) => {
    const t = parseFloat(goal.targetAmount) || 0
    const c = parseFloat(goal.currentAmount) || 0
    return t > 0 ? Math.min(100, (c / t) * 100) : 0
  }

  const fmt = (n) => `$${Math.round(n).toLocaleString()}`
  const totalGoalTarget = goals.reduce((s, g) => s + (parseFloat(g.targetAmount) || 0), 0)
  const totalGoalCurrent = goals.reduce((s, g) => s + (parseFloat(g.currentAmount) || 0), 0)
  const totalRequiredMonthly = goals.reduce((s, g) => s + getRequiredMonthly(g), 0)

  return (
    <div>
      <div className="section-title">🏦 Savings Goals</div>
      <div className="section-sub">Track your savings targets with timelines and required monthly contributions.</div>

      {/* Overview */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-label">Total Goal Amount</div>
          <div className="metric-value">{fmt(totalGoalTarget)}</div>
          <div className="metric-sub">across {goals.length} goals</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Saved</div>
          <div className="metric-value metric-good">{fmt(totalGoalCurrent)}</div>
          <div className="metric-sub">{totalGoalTarget > 0 ? ((totalGoalCurrent/totalGoalTarget)*100).toFixed(1) : 0}% overall</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Monthly Needed</div>
          <div className={`metric-value ${totalRequiredMonthly > availableForGoals ? 'metric-bad' : 'metric-good'}`}>
            {fmt(totalRequiredMonthly)}
          </div>
          <div className="metric-sub">to meet all deadlines</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Available Surplus</div>
          <div className={`metric-value ${availableForGoals <= 0 ? 'metric-bad' : availableForGoals >= totalRequiredMonthly ? 'metric-good' : 'metric-warn'}`}>
            {fmt(availableForGoals)}
          </div>
          <div className="metric-sub">after all expenses</div>
        </div>
      </div>

      {totalRequiredMonthly > availableForGoals && availableForGoals > 0 && (
        <div className="insight-card amber" style={{ marginBottom: 20 }}>
          <h4>⚠️ Goals May Be Underfunded</h4>
          <p>
            You need {fmt(totalRequiredMonthly)}/mo for all goals but only have {fmt(availableForGoals)}/mo surplus.
            Shortfall: {fmt(totalRequiredMonthly - availableForGoals)}/mo. Consider extending deadlines or prioritizing high-priority goals first.
          </p>
        </div>
      )}

      {totalRequiredMonthly <= availableForGoals && goals.length > 0 && (
        <div className="insight-card green" style={{ marginBottom: 20 }}>
          <h4>✅ On Track to Meet All Goals</h4>
          <p>
            Your {fmt(availableForGoals)}/mo surplus covers all goal contributions ({fmt(totalRequiredMonthly)}/mo needed).
            After goals: {fmt(availableForGoals - totalRequiredMonthly)}/mo remaining.
          </p>
        </div>
      )}

      {/* Add / Edit Form */}
      {editing && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--blue)', background: 'var(--blue-light)' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: 'var(--blue)' }}>
            {editing === 'new' ? '➕ New Savings Goal' : '✏️ Edit Goal'}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Goal Name</label>
              <input className="form-input" type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Emergency Fund, Vacation..." />
            </div>
            <div className="form-group">
              <label className="form-label">Icon</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {GOAL_ICONS.map(icon => (
                  <button key={icon}
                    style={{
                      fontSize: 20, padding: 4, border: form.icon === icon ? '2px solid var(--blue)' : '1px solid var(--gray-200)',
                      borderRadius: 6, cursor: 'pointer', background: form.icon === icon ? 'white' : 'transparent'
                    }}
                    onClick={() => setForm({ ...form, icon })}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Target Amount</label>
              <div className="form-input-prefix">
                <span>$</span>
                <input className="form-input" type="number" min="0" step="100"
                  value={form.targetAmount}
                  onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                  placeholder="0" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Current Amount Saved</label>
              <div className="form-input-prefix">
                <span>$</span>
                <input className="form-input" type="number" min="0" step="100"
                  value={form.currentAmount}
                  onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                  placeholder="0" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Target Date</label>
              <input className="form-input" type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="high">High — Critical Goal</option>
                <option value="medium">Medium — Important</option>
                <option value="low">Low — Nice to Have</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveForm}>Save Goal</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      <div className="grid-2" style={{ gap: 20, marginBottom: 24 }}>
        {goals.map(goal => {
          const pct = getPct(goal)
          const months = getMonthsLeft(goal)
          const required = getRequiredMonthly(goal)
          const remaining = (parseFloat(goal.targetAmount) || 0) - (parseFloat(goal.currentAmount) || 0)
          const colorKey = PRIORITY_COLORS[goal.priority] || 'blue'
          const colors = {
            red:    { fill: 'var(--red)',    bg: 'var(--red-light)'    },
            amber:  { fill: 'var(--amber)',  bg: 'var(--amber-light)'  },
            blue:   { fill: 'var(--blue)',   bg: 'var(--blue-light)'   },
            green:  { fill: 'var(--green)',  bg: 'var(--green-light)'  },
          }
          const c = colors[colorKey]

          return (
            <div key={goal.id} className="card" style={{ borderTop: `4px solid ${c.fill}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{goal.icon || '🎯'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{goal.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{PRIORITY_LABELS[goal.priority]}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(goal)}>✏️</button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteGoal(goal.id)}>🗑️</button>
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--gray-500)' }}>Progress</span>
                  <span style={{ fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: 10 }}>
                  <div className="progress-bar-fill"
                    style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : c.fill }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
                  <span>${parseFloat(goal.currentAmount||0).toLocaleString()} saved</span>
                  <span>${parseFloat(goal.targetAmount||0).toLocaleString()} goal</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2 }}>STILL NEEDED</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(Math.max(0, remaining))}</div>
                </div>
                <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2 }}>MONTHLY NEEDED</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: c.fill }}>{fmt(required)}/mo</div>
                </div>
                {months !== null && (
                  <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2 }}>TIME LEFT</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {months === 0 ? 'Due now' : `${months} months`}
                    </div>
                  </div>
                )}
                {goal.targetDate && (
                  <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 2 }}>TARGET DATE</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                )}
              </div>

              {pct >= 100 && (
                <div style={{ marginTop: 12, textAlign: 'center', padding: '8px', background: 'var(--green-light)', borderRadius: 8,
                  color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>
                  🎉 Goal Achieved!
                </div>
              )}
            </div>
          )
        })}

        {/* Add new goal card */}
        <div
          onClick={openAdd}
          style={{
            border: '2px dashed var(--gray-300)', borderRadius: 12, padding: 32,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--gray-400)', transition: 'all 0.2s', minHeight: 200
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)' }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--gray-300)'; e.currentTarget.style.color = 'var(--gray-400)' }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>+</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Add Savings Goal</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Set a target with a timeline</div>
        </div>
      </div>

      {/* Allocation Recommendation */}
      {goals.length > 0 && availableForGoals > 0 && (
        <div className="card">
          <div className="card-title">📐 Suggested Monthly Allocation</div>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
            Based on your {fmt(availableForGoals)}/mo surplus, here's how to distribute across goals by priority:
          </p>
          {goals
            .slice()
            .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
            .map(goal => {
              const required = getRequiredMonthly(goal)
              const pct = getPct(goal)
              return (
                <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8 }}>
                  <span style={{ fontSize: 20 }}>{goal.icon || '🎯'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{goal.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{pct.toFixed(0)}% complete</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--blue)' }}>{fmt(required)}/mo</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>required</div>
                  </div>
                  <span className={`badge badge-${PRIORITY_COLORS[goal.priority] === 'red' ? 'red' : PRIORITY_COLORS[goal.priority] === 'amber' ? 'amber' : 'blue'}`}>
                    {goal.priority}
                  </span>
                </div>
              )
            })}
          <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: 12, paddingTop: 12,
            display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Total Required</span>
            <span style={{ color: totalRequiredMonthly > availableForGoals ? 'var(--red)' : 'var(--green)' }}>
              {fmt(totalRequiredMonthly)}/mo
              {totalRequiredMonthly > availableForGoals
                ? ` (${fmt(totalRequiredMonthly - availableForGoals)} over budget)`
                : ` ✓ within budget`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
