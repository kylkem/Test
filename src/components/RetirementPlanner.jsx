import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Area, AreaChart
} from 'recharts'

const fmt = (n) => `$${Math.round(n).toLocaleString()}`
const fmtK = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(2)}M` : `$${(n/1000).toFixed(0)}K`

function computeRetirement(data) {
  const {
    currentAge, retirementAge, currentSavings, monthlyContribution,
    expectedReturn, inflationRate, desiredIncome, socialSecurityEstimate
  } = data

  const years = retirementAge - currentAge
  const monthlyRate = (expectedReturn / 100) / 12
  const realReturn = ((1 + expectedReturn/100) / (1 + inflationRate/100)) - 1

  // Future value of current savings
  const fvCurrentSavings = currentSavings * Math.pow(1 + expectedReturn/100, years)

  // Future value of monthly contributions (annuity)
  const fvContributions = monthlyRate > 0
    ? monthlyContribution * ((Math.pow(1 + monthlyRate, years * 12) - 1) / monthlyRate)
    : monthlyContribution * years * 12

  const totalAtRetirement = fvCurrentSavings + fvContributions

  // How much needed for retirement
  // Using 4% withdrawal rule
  const annualExpenses = desiredIncome - socialSecurityEstimate
  const nestedEgg25x = annualExpenses * 25  // 4% rule
  const nestedEgg33x = annualExpenses * 33  // 3% rule (more conservative)

  // Inflation-adjusted desired income today → at retirement
  const inflationAdjustedIncome = desiredIncome * Math.pow(1 + inflationRate/100, years)
  const inflationAdjustedSS = socialSecurityEstimate * Math.pow(1 + inflationRate/100, years)
  const inflationAdjustedNeeded = (inflationAdjustedIncome - inflationAdjustedSS) * 25

  // Years savings will last (at retirement)
  const annualWithdrawal = annualExpenses
  const portfolioReturnInRetirement = expectedReturn / 100
  const yearsMoneyLasts = totalAtRetirement > 0 && annualWithdrawal > 0
    ? Math.log(1 - (totalAtRetirement * portfolioReturnInRetirement) / annualWithdrawal) /
      Math.log(1 + portfolioReturnInRetirement) * -1
    : 0

  // Required monthly contribution to hit target
  const gap = inflationAdjustedNeeded - fvCurrentSavings
  const requiredContribution = gap > 0 && monthlyRate > 0
    ? gap / ((Math.pow(1 + monthlyRate, years * 12) - 1) / monthlyRate)
    : 0

  // Year-by-year projection
  const projection = []
  let balance = currentSavings
  for (let age = currentAge; age <= Math.max(retirementAge + 30, currentAge + 1); age++) {
    if (age < retirementAge) {
      // Accumulation phase
      balance = balance * (1 + expectedReturn/100) + monthlyContribution * 12
    } else {
      // Distribution phase
      balance = balance * (1 + portfolioReturnInRetirement) - annualExpenses
      balance = Math.max(0, balance)
    }
    projection.push({
      age,
      balance: Math.round(balance),
      target: Math.round(inflationAdjustedNeeded),
      phase: age < retirementAge ? 'Accumulation' : 'Retirement',
    })
  }

  const onTrack = totalAtRetirement >= inflationAdjustedNeeded
  const fundedPct = inflationAdjustedNeeded > 0
    ? Math.min(200, (totalAtRetirement / inflationAdjustedNeeded) * 100)
    : 0

  return {
    years,
    totalAtRetirement,
    nestedEgg25x,
    nestedEgg33x,
    inflationAdjustedNeeded,
    inflationAdjustedIncome,
    yearsMoneyLasts,
    requiredContribution: Math.max(0, requiredContribution),
    projection,
    onTrack,
    fundedPct,
    shortfall: Math.max(0, inflationAdjustedNeeded - totalAtRetirement),
    surplus:   Math.max(0, totalAtRetirement - inflationAdjustedNeeded),
  }
}

function Slider({ label, value, min, max, step, unit = '', onChange, format }) {
  return (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
        <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 15 }}>
          {format ? format(value) : `${value}${unit}`}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
        <span>{format ? format(min) : `${min}${unit}`}</span>
        <span>{format ? format(max) : `${max}${unit}`}</span>
      </div>
    </div>
  )
}

export default function RetirementPlanner({ data, setData, income }) {
  const [scenario, setScenario] = useState('base')

  const result = useMemo(() => computeRetirement(data), [data])

  const scenarios = useMemo(() => ({
    conservative: computeRetirement({ ...data, expectedReturn: 5, inflationRate: 3.5 }),
    base:         computeRetirement(data),
    optimistic:   computeRetirement({ ...data, expectedReturn: 9, inflationRate: 2.5 }),
  }), [data])

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))

  const scenarioColors = { conservative: '#dc2626', base: '#2563eb', optimistic: '#16a34a' }

  // Combine all scenarios into one chart dataset
  const chartData = result.projection.map(point => ({
    age: point.age,
    base: point.balance,
    conservative: scenarios.conservative.projection.find(p => p.age === point.age)?.balance || 0,
    optimistic:   scenarios.optimistic.projection.find(p => p.age === point.age)?.balance || 0,
    target: point.target,
  }))

  const currentContribution = income.retirement401k || 0
  const contribPct = income.grossMonthly > 0
    ? ((currentContribution / income.grossMonthly) * 100).toFixed(1)
    : 0

  return (
    <div>
      <div className="section-title">🎯 Retirement Planner</div>
      <div className="section-sub">Model your retirement savings, project growth, and find your target nest egg.</div>

      {/* Key metrics */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-label">Projected Nest Egg</div>
          <div className={`metric-value ${result.onTrack ? 'metric-good' : 'metric-bad'}`}>
            {fmtK(result.totalAtRetirement)}
          </div>
          <div className="metric-sub">at age {data.retirementAge}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Target Needed</div>
          <div className="metric-value">{fmtK(result.inflationAdjustedNeeded)}</div>
          <div className="metric-sub">inflation adjusted (4% rule)</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Funded</div>
          <div className={`metric-value ${result.fundedPct >= 100 ? 'metric-good' : result.fundedPct >= 75 ? 'metric-warn' : 'metric-bad'}`}>
            {result.fundedPct.toFixed(0)}%
          </div>
          <div className="metric-sub">{result.onTrack ? `+${fmtK(result.surplus)} surplus` : `${fmtK(result.shortfall)} shortfall`}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Savings Last</div>
          <div className={`metric-value ${result.yearsMoneyLasts > 30 ? 'metric-good' : result.yearsMoneyLasts > 20 ? 'metric-warn' : 'metric-bad'}`}>
            {result.yearsMoneyLasts > 99 ? '99+' : Math.round(result.yearsMoneyLasts)} yrs
          </div>
          <div className="metric-sub">from retirement</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, marginBottom: 24, alignItems: 'start' }}>
        {/* Controls */}
        <div className="card">
          <div className="card-title">⚙️ Your Numbers</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Slider label="Current Age" value={data.currentAge} min={18} max={70} step={1} unit=" yrs"
              onChange={(v) => update('currentAge', v)} />
            <Slider label="Retirement Age" value={data.retirementAge} min={50} max={80} step={1} unit=" yrs"
              onChange={(v) => update('retirementAge', v)} />
          </div>

          <Slider label="Current Retirement Savings" value={data.currentSavings} min={0} max={2000000} step={1000}
            format={fmtK} onChange={(v) => update('currentSavings', v)} />

          <Slider label="Monthly Contribution" value={data.monthlyContribution} min={0} max={5000} step={50}
            format={(v) => `$${v.toLocaleString()}/mo`} onChange={(v) => update('monthlyContribution', v)} />

          {currentContribution > 0 && (
            <div style={{ fontSize: 12, color: 'var(--blue)', background: 'var(--blue-light)', borderRadius: 6, padding: '6px 10px', marginBottom: 12 }}>
              Your current 401(k) contribution: {fmt(currentContribution)}/mo ({contribPct}% of gross)
            </div>
          )}

          <Slider label="Expected Annual Return" value={data.expectedReturn} min={3} max={12} step={0.5} unit="%"
            onChange={(v) => update('expectedReturn', v)} />
          <Slider label="Inflation Rate" value={data.inflationRate} min={1} max={6} step={0.25} unit="%"
            onChange={(v) => update('inflationRate', v)} />

          <div className="divider" />
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-600)', marginBottom: 10 }}>Retirement Income Goal</div>

          <Slider label="Annual Income Desired (today's $)" value={data.desiredIncome} min={20000} max={200000} step={1000}
            format={(v) => `$${v.toLocaleString()}/yr`} onChange={(v) => update('desiredIncome', v)} />
          <Slider label="Expected Social Security (annual)" value={data.socialSecurityEstimate} min={0} max={50000} step={500}
            format={(v) => `$${v.toLocaleString()}/yr`} onChange={(v) => update('socialSecurityEstimate', v)} />
        </div>

        {/* Analysis */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">📊 Retirement Analysis</div>

            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Progress to Target</span>
                <span style={{ fontWeight: 700 }}>{result.fundedPct.toFixed(1)}%</span>
              </div>
              <div className="progress-bar-bg" style={{ height: 12 }}>
                <div className="progress-bar-fill" style={{
                  width: `${Math.min(100, result.fundedPct)}%`,
                  background: result.fundedPct >= 100 ? 'var(--green)' : result.fundedPct >= 75 ? 'var(--amber)' : 'var(--red)'
                }} />
              </div>
            </div>

            <table className="data-table" style={{ fontSize: 13 }}>
              <tbody>
                <tr>
                  <td>Years to Retirement</td>
                  <td style={{ fontWeight: 700 }}>{result.years} years</td>
                </tr>
                <tr>
                  <td>Projected at Retirement</td>
                  <td style={{ fontWeight: 700, color: 'var(--blue)' }}>{fmtK(result.totalAtRetirement)}</td>
                </tr>
                <tr>
                  <td>Inflation-Adjusted Target</td>
                  <td style={{ fontWeight: 700 }}>{fmtK(result.inflationAdjustedNeeded)}</td>
                </tr>
                <tr>
                  <td>Annual Withdrawal Needed</td>
                  <td style={{ fontWeight: 700 }}>{fmt(data.desiredIncome - data.socialSecurityEstimate)}</td>
                </tr>
                <tr>
                  <td>Inflation-Adj. Income at Ret.</td>
                  <td style={{ fontWeight: 700 }}>{fmt(result.inflationAdjustedIncome)}/yr</td>
                </tr>
                <tr>
                  <td>Portfolio Duration</td>
                  <td style={{ fontWeight: 700, color: result.yearsMoneyLasts > 30 ? 'var(--green)' : 'var(--red)' }}>
                    {result.yearsMoneyLasts > 99 ? '99+' : Math.round(result.yearsMoneyLasts)} years
                  </td>
                </tr>
                {!result.onTrack && (
                  <tr>
                    <td>Required Monthly Contribution</td>
                    <td style={{ fontWeight: 700, color: 'var(--red)' }}>{fmt(result.requiredContribution)}/mo</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Insights */}
          <div className="card">
            <div className="card-title">💡 Retirement Insights</div>

            {result.onTrack ? (
              <div className="insight-card green">
                <h4>✅ On Track for Retirement</h4>
                <p>Great news! You're projected to have a {fmtK(result.surplus)} surplus above your target. Consider increasing contributions for a more comfortable retirement.</p>
              </div>
            ) : (
              <div className="insight-card red">
                <h4>⚠️ Retirement Gap Detected</h4>
                <p>You need to increase contributions by {fmt(result.requiredContribution - data.monthlyContribution)}/mo (to {fmt(result.requiredContribution)}/mo total) to meet your target. Small increases today compound significantly over time.</p>
              </div>
            )}

            {data.retirement401k > 0 && income.grossMonthly > 0 && parseFloat(contribPct) < 6 && (
              <div className="insight-card amber">
                <h4>💰 Capture Full Employer Match</h4>
                <p>Many employers match up to 6% of salary. Increasing to {fmt(income.grossMonthly * 0.06)}/mo ({fmt(income.grossMonthly * 0.06 * 12)}/yr) could get you free money via employer match.</p>
              </div>
            )}

            {data.currentAge < 50 && (
              <div className="insight-card blue">
                <h4>📈 Time is Your Superpower</h4>
                <p>With {result.years} years to retirement, compound interest is your greatest ally. Every $100 more per month now could be worth {fmt(100 * Math.pow(1 + data.expectedReturn/100, result.years))} at retirement.</p>
              </div>
            )}

            {data.currentAge >= 50 && (
              <div className="insight-card purple">
                <h4>🎯 Catch-Up Contributions Available</h4>
                <p>At 50+, you can contribute an extra $7,500/yr to your 401(k) ($1,000 extra to IRA). These catch-up contributions provide significant tax advantages.</p>
              </div>
            )}

            <div className="insight-card green">
              <h4>🏦 Diversification Strategy</h4>
              <p>Consider the bucket strategy: 1-2 years in cash, 3-10 years in bonds, remainder in stocks. At retirement, gradually shift 80%+ equities toward a 60/40 or 40/60 mix.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Comparison Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">📈 Portfolio Growth Projection — 3 Scenarios</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(scenarios).map(([key, s]) => (
            <div key={key} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 13,
              background: scenarioColors[key] + '15', border: `1px solid ${scenarioColors[key]}40`
            }}>
              <span style={{ fontWeight: 600, color: scenarioColors[key], textTransform: 'capitalize' }}>{key}</span>
              <span style={{ color: 'var(--gray-500)', marginLeft: 8 }}>
                {key === 'conservative' ? `${data.expectedReturn - 2}% return` :
                 key === 'base' ? `${data.expectedReturn}% return` :
                 `${data.expectedReturn + 2}% return`}
              </span>
              <span style={{ marginLeft: 8, fontWeight: 700, color: scenarioColors[key] }}>
                → {fmtK(s.totalAtRetirement)}
              </span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              {Object.entries(scenarioColors).map(([key, color]) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis dataKey="age" tick={{ fontSize: 12 }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtK} />
            <Tooltip
              formatter={(v, name) => [fmtK(v), name.charAt(0).toUpperCase() + name.slice(1)]}
              labelFormatter={(v) => `Age ${v}`}
            />
            <ReferenceLine x={data.retirementAge} stroke="var(--gray-400)" strokeDasharray="6 3"
              label={{ value: 'Retire', position: 'top', fontSize: 11, fill: 'var(--gray-500)' }} />
            <Area type="monotone" dataKey="optimistic"   name="Optimistic"   stroke={scenarioColors.optimistic}   fill={`url(#grad-optimistic)`}   strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="base"          name="Base"          stroke={scenarioColors.base}          fill={`url(#grad-base)`}          strokeWidth={2.5} dot={false} />
            <Area type="monotone" dataKey="conservative"  name="Conservative"  stroke={scenarioColors.conservative}  fill={`url(#grad-conservative)`}  strokeWidth={2} dot={false} />
            <Line  type="monotone" dataKey="target"       name="Target"        stroke="var(--amber)" strokeDasharray="8 4" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Milestones & Quick Actions */}
      <div className="grid-2" style={{ gap: 24 }}>
        <div className="card">
          <div className="card-title">🏆 Retirement Milestones</div>
          {[
            { label: '1x Salary Saved', age: 30,  target: income.grossMonthly * 12,      desc: 'By age 30' },
            { label: '3x Salary Saved', age: 40,  target: income.grossMonthly * 12 * 3,  desc: 'By age 40' },
            { label: '6x Salary Saved', age: 50,  target: income.grossMonthly * 12 * 6,  desc: 'By age 50' },
            { label: '8x Salary Saved', age: 60,  target: income.grossMonthly * 12 * 8,  desc: 'By age 60' },
            { label: '10x Salary Saved',age: 67,  target: income.grossMonthly * 12 * 10, desc: 'By retirement' },
          ].map(ms => {
            const projAtAge = result.projection.find(p => p.age === ms.age)?.balance || 0
            const pct = ms.target > 0 ? Math.min(100, (data.currentSavings / ms.target) * 100) : 0
            const achieved = data.currentSavings >= ms.target
            return (
              <div key={ms.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
                padding: '10px 12px', background: achieved ? 'var(--green-light)' : 'var(--gray-50)', borderRadius: 8 }}>
                <span style={{ fontSize: 18 }}>{achieved ? '✅' : '⭕'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ms.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{ms.desc} • Target: {fmtK(ms.target)}</div>
                  <div className="progress-bar-bg" style={{ marginTop: 4, height: 4 }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: achieved ? 'var(--green)' : 'var(--blue)' }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: achieved ? 'var(--green)' : 'var(--gray-500)' }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="card-title">🧮 2026 Contribution Limits</div>
          {[
            { label: '401(k) / 403(b)',        limit: 23500, catchUp: 7500,  current: (data.monthlyContribution * 12) },
            { label: 'Traditional / Roth IRA', limit: 7000,  catchUp: 1000,  current: 0 },
            { label: 'HSA (family)',            limit: 8300,  catchUp: 1000,  current: 0 },
          ].map(acc => {
            const pct = Math.min(100, (acc.current / acc.limit) * 100)
            return (
              <div key={acc.label} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{acc.label}</span>
                  <span style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                    limit: {fmt(acc.limit)} {data.currentAge >= 50 ? `(+${fmt(acc.catchUp)} catch-up)` : ''}
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--blue)' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 3 }}>
                  {fmt(acc.current)}/yr contributed • {fmt(Math.max(0, acc.limit - acc.current))} remaining room
                </div>
              </div>
            )
          })}

          <div className="divider" />
          <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6 }}>
            <strong>Social Security:</strong> Full retirement age is 67 for those born after 1960.
            Claiming at 62 reduces benefits ~30%. Waiting until 70 increases by ~32%.
          </div>
        </div>
      </div>
    </div>
  )
}
