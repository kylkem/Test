import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line
} from 'recharts'

const CAT_COLORS = {
  housing:       '#2563eb',
  utilities:     '#7c3aed',
  food:          '#d97706',
  transport:     '#0891b2',
  insurance:     '#059669',
  health:        '#dc2626',
  entertainment: '#db2777',
  education:     '#9333ea',
  personal:      '#f59e0b',
  debt:          '#ef4444',
  subscriptions: '#6366f1',
  other:         '#6b7280',
}

const CAT_LABELS = {
  housing:'Housing', utilities:'Utilities', food:'Food & Dining',
  transport:'Transport', insurance:'Insurance', health:'Health',
  entertainment:'Entertainment', education:'Education',
  personal:'Personal', debt:'Debt', subscriptions:'Subscriptions', other:'Other',
}

function toMonthly(amount, frequency) {
  const factors = { weekly: 52/12, monthly: 1, quarterly: 1/3, annual: 1/12 }
  return (parseFloat(amount) || 0) * (factors[frequency] || 1)
}

const fmt = (n) => `$${Math.round(n).toLocaleString()}`
const fmtPct = (n) => `${n.toFixed(1)}%`

function ScoreBar({ label, value, max, color = 'var(--blue)', detail }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--gray-500)' }}>{detail}</span>
      </div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function BudgetHealth({ pct }) {
  let score, label, color
  if (pct <= 50) { score = 95; label = 'Excellent'; color = 'var(--green)' }
  else if (pct <= 65) { score = 80; label = 'Good'; color = 'var(--green)' }
  else if (pct <= 75) { score = 65; label = 'Fair'; color = 'var(--amber)' }
  else if (pct <= 85) { score = 45; label = 'Tight'; color = 'var(--amber)' }
  else { score = 20; label = 'Critical'; color = 'var(--red)' }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        border: `8px solid ${color}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 10px',
        background: color + '15'
      }}>
        <div style={{ fontSize: 26, fontWeight: 800, color }}>{score}</div>
        <div style={{ fontSize: 10, color }}>/ 100</div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Budget Health Score</div>
    </div>
  )
}

export default function BudgetDashboard({ income, bills, savingsGoals }) {
  const analysis = useMemo(() => {
    const totalBills = bills.reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0)
    const net = income.netMonthly || 0
    const gross = income.grossMonthly || 0
    const remaining = net - totalBills
    const spendingPct = net > 0 ? (totalBills / net) * 100 : 0

    // By category
    const catTotals = {}
    bills.forEach(b => {
      const m = toMonthly(b.amount, b.frequency)
      catTotals[b.category] = (catTotals[b.category] || 0) + m
    })

    const pieData = Object.entries(catTotals).map(([k, v]) => ({
      name: CAT_LABELS[k] || k, value: Math.round(v), color: CAT_COLORS[k] || '#999'
    })).sort((a, b) => b.value - a.value)

    // 50/30/20 rule analysis
    const essentials = bills.filter(b => b.essential).reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0)
    const discretionary = totalBills - essentials

    // Savings rate
    const savingsRate = net > 0 ? (remaining / net) * 100 : 0

    // Projections (12 months)
    const monthlyProjections = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2026, i).toLocaleString('default', { month: 'short' }),
      expenses: Math.round(totalBills),
      income: Math.round(net),
      savings: Math.round(Math.max(0, remaining)),
    }))

    // Insights
    const insights = []

    if (savingsRate < 10 && net > 0) {
      insights.push({
        type: 'red',
        title: 'Low Savings Rate',
        body: `You're saving ${fmtPct(savingsRate)} of take-home pay. Aim for at least 20% — consider cutting discretionary spending by ${fmt(Math.max(0, net * 0.2 - remaining))}/mo.`
      })
    } else if (savingsRate >= 20) {
      insights.push({
        type: 'green',
        title: 'Excellent Savings Rate',
        body: `You're saving ${fmtPct(savingsRate)} of income (${fmt(remaining)}/mo) — well above the recommended 20%. Keep it up!`
      })
    }

    if (essentials > net * 0.5 && net > 0) {
      insights.push({
        type: 'amber',
        title: 'Essential Costs are High',
        body: `Essential bills use ${fmtPct((essentials/net)*100)} of income. The 50/30/20 rule recommends keeping essentials under 50%.`
      })
    }

    const housing = catTotals['housing'] || 0
    if (housing > net * 0.3 && net > 0) {
      insights.push({
        type: 'amber',
        title: 'Housing Costs Elevated',
        body: `Housing is ${fmtPct((housing/net)*100)} of take-home. Financial experts recommend staying under 30%.`
      })
    }

    const entertainment = (catTotals['entertainment'] || 0) + (catTotals['subscriptions'] || 0)
    if (entertainment > net * 0.1 && net > 0) {
      insights.push({
        type: 'blue',
        title: 'Entertainment Savings Opportunity',
        body: `You spend ${fmt(entertainment)}/mo on entertainment & subscriptions. Trimming to ${fmt(net * 0.05)} saves ${fmt(entertainment - net * 0.05)}/mo (${fmt((entertainment - net * 0.05) * 12)}/yr).`
      })
    }

    if (remaining < 0) {
      insights.push({
        type: 'red',
        title: 'Spending Exceeds Income!',
        body: `You're spending ${fmt(Math.abs(remaining))} more than you earn each month. Immediate action needed — review discretionary expenses.`
      })
    }

    if (net > 0 && !(income.retirement401k > 0)) {
      insights.push({
        type: 'purple',
        title: 'No Retirement Contribution Detected',
        body: `Consider contributing at least 6% of gross pay to a 401(k) to capture any employer match. That's ${fmt(gross * 0.06)}/mo.`
      })
    }

    return {
      totalBills, net, gross, remaining, spendingPct,
      catTotals, pieData, essentials, discretionary,
      savingsRate, monthlyProjections, insights,
    }
  }, [income, bills])

  const noIncome = !income.netMonthly && !income.grossMonthly

  if (noIncome) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 60, marginBottom: 16 }}>📊</div>
        <h3>No Income Data Yet</h3>
        <p>Enter your paystub information first to see your budget analysis.</p>
      </div>
    )
  }

  const { totalBills, net, remaining, spendingPct, pieData, essentials, discretionary, savingsRate, monthlyProjections, insights, catTotals } = analysis

  return (
    <div>
      <div className="section-title">📊 Budget Analysis</div>
      <div className="section-sub">Your complete financial picture with personalized guidance.</div>

      {/* Top metrics */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-label">Monthly Income</div>
          <div className="metric-value metric-good">{fmt(net)}</div>
          <div className="metric-sub">take-home pay</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Expenses</div>
          <div className="metric-value metric-bad">{fmt(totalBills)}</div>
          <div className="metric-sub">{fmtPct(spendingPct)} of income</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Monthly Surplus</div>
          <div className={`metric-value ${remaining >= 0 ? 'metric-good' : 'metric-bad'}`}>
            {remaining >= 0 ? '+' : ''}{fmt(remaining)}
          </div>
          <div className="metric-sub">{fmtPct(Math.abs(savingsRate))} savings rate</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Annual Surplus</div>
          <div className={`metric-value ${remaining >= 0 ? 'metric-good' : 'metric-bad'}`}>
            {remaining >= 0 ? '+' : ''}{fmt(remaining * 12)}
          </div>
          <div className="metric-sub">if maintained</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
        {/* Health + 50/30/20 */}
        <div className="card">
          <div className="card-title">Budget Health</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <BudgetHealth pct={spendingPct} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 12 }}>50/30/20 Rule Analysis</div>
              <ScoreBar
                label="Needs (Essential)"
                value={essentials} max={net}
                color={essentials/net > 0.5 ? 'var(--red)' : 'var(--green)'}
                detail={`${fmt(essentials)} · ${fmtPct(net>0?(essentials/net)*100:0)} (target ≤50%)`}
              />
              <ScoreBar
                label="Wants (Discretionary)"
                value={discretionary} max={net}
                color={discretionary/net > 0.3 ? 'var(--amber)' : 'var(--blue)'}
                detail={`${fmt(discretionary)} · ${fmtPct(net>0?(discretionary/net)*100:0)} (target ≤30%)`}
              />
              <ScoreBar
                label="Savings & Debt"
                value={Math.max(0, remaining)} max={net}
                color={remaining/net >= 0.2 ? 'var(--green)' : 'var(--amber)'}
                detail={`${fmt(Math.max(0,remaining))} · ${fmtPct(Math.max(0,savingsRate))} (target ≥20%)`}
              />
            </div>
          </div>
        </div>

        {/* Spending by category pie */}
        <div className="card">
          <div className="card-title">Spending by Category</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="35%" cy="50%" outerRadius={85} paddingAngle={2}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Legend iconType="circle" iconSize={8} layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>Add expenses to see the chart.</p></div>
          )}
        </div>
      </div>

      {/* Monthly income vs expenses chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">12-Month Projection</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyProjections} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="income"   name="Income"   fill="#2563eb" radius={[4,4,0,0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[4,4,0,0]} />
            <Bar dataKey="savings"  name="Savings"  fill="#16a34a" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">💡 Personalized Insights</div>
          {insights.length === 0 ? (
            <div style={{ color: 'var(--gray-400)', fontSize: 14 }}>Your budget looks balanced!</div>
          ) : insights.map((ins, i) => (
            <div key={i} className={`insight-card ${ins.type}`}>
              <h4>{ins.title}</h4>
              <p>{ins.body}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">📋 Category Breakdown</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Monthly</th>
                <th>% of Income</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(catTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => (
                  <tr key={cat}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: CAT_COLORS[cat], display: 'inline-block', flexShrink: 0
                      }} />
                      {CAT_LABELS[cat] || cat}
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmt(amt)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar-bg" style={{ width: 60, height: 6 }}>
                          <div className="progress-bar-fill" style={{
                            width: `${Math.min(100, (amt/net)*100)}%`,
                            background: CAT_COLORS[cat]
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                          {fmtPct(net>0?(amt/net)*100:0)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Savings opportunities */}
      <div className="card">
        <div className="card-title">🚀 Savings Opportunities</div>
        <div className="grid-3">
          {[
            {
              title: 'Cancel Unused Subscriptions',
              icon: '📱',
              saving: Math.round((catTotals['subscriptions'] || 0) * 0.3),
              tip: 'Review subscriptions — average household wastes 30% on unused services.',
              color: 'var(--purple)'
            },
            {
              title: 'Meal Planning',
              icon: '🍽️',
              saving: Math.round((catTotals['food'] || 0) * 0.2),
              tip: 'Meal prep and grocery planning typically cuts food costs by 20%.',
              color: 'var(--amber)'
            },
            {
              title: 'Energy Efficiency',
              icon: '⚡',
              saving: Math.round((catTotals['utilities'] || 0) * 0.15),
              tip: 'Smart thermostats and LED lighting can cut utility bills by 15%.',
              color: 'var(--blue)'
            },
            {
              title: 'Refinance High-Interest Debt',
              icon: '💳',
              saving: Math.round((catTotals['debt'] || 0) * 0.25),
              tip: 'Balance transfers or debt consolidation can cut interest costs by 25%+.',
              color: 'var(--red)'
            },
            {
              title: 'Automate Savings',
              icon: '🏦',
              saving: Math.round(net * 0.01),
              tip: 'Automating just 1% more per month to a HYSA adds up significantly over time.',
              color: 'var(--green)'
            },
            {
              title: 'Increase 401(k) by 1%',
              icon: '📈',
              saving: Math.round((income.grossMonthly || 0) * 0.01),
              tip: 'Every 1% increase in 401(k) contribution is tax-deferred savings + potential employer match.',
              color: 'var(--green)'
            },
          ].filter(op => op.saving > 0).map((op, i) => (
            <div key={i} style={{
              border: `1px solid ${op.color}30`,
              borderRadius: 10, padding: 16,
              background: op.color + '08'
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{op.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{op.title}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: op.color, marginBottom: 6 }}>
                +{fmt(op.saving)}/mo
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.5 }}>{op.tip}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 8 }}>
                {fmt(op.saving * 12)}/year · {fmt(op.saving * 60)} in 5 years
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
