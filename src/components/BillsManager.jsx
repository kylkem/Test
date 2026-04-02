import { useState } from 'react'

const CATEGORIES = [
  { value: 'housing',       label: 'Housing',        icon: '🏠' },
  { value: 'utilities',     label: 'Utilities',      icon: '💡' },
  { value: 'food',          label: 'Food & Dining',  icon: '🍽️' },
  { value: 'transport',     label: 'Transportation', icon: '🚗' },
  { value: 'insurance',     label: 'Insurance',      icon: '🛡️' },
  { value: 'health',        label: 'Health',         icon: '❤️' },
  { value: 'entertainment', label: 'Entertainment',  icon: '🎬' },
  { value: 'education',     label: 'Education',      icon: '📚' },
  { value: 'personal',      label: 'Personal Care',  icon: '💆' },
  { value: 'debt',          label: 'Debt Payments',  icon: '💳' },
  { value: 'subscriptions', label: 'Subscriptions',  icon: '📱' },
  { value: 'other',         label: 'Other',          icon: '📦' },
]

const FREQUENCIES = [
  { value: 'weekly',   label: 'Weekly',   factor: 52/12  },
  { value: 'monthly',  label: 'Monthly',  factor: 1      },
  { value: 'quarterly',label: 'Quarterly',factor: 1/3    },
  { value: 'annual',   label: 'Annual',   factor: 1/12   },
]

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

const blank = () => ({
  id: Date.now(),
  name: '',
  category: 'other',
  amount: '',
  frequency: 'monthly',
  essential: false,
})

function toMonthly(amount, frequency) {
  const f = FREQUENCIES.find(f => f.value === frequency)
  return (parseFloat(amount) || 0) * (f ? f.factor : 1)
}

export default function BillsManager({ bills, setBills, onNext }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blank())
  const [filter, setFilter] = useState('all')

  const totalMonthly = bills.reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0)
  const essentialTotal = bills.filter(b => b.essential).reduce((s, b) => s + toMonthly(b.amount, b.frequency), 0)

  const catMap = {}
  bills.forEach(b => {
    const m = toMonthly(b.amount, b.frequency)
    catMap[b.category] = (catMap[b.category] || 0) + m
  })

  const openAdd = () => {
    setForm(blank())
    setEditing('new')
  }

  const openEdit = (bill) => {
    setForm({ ...bill })
    setEditing(bill.id)
  }

  const saveForm = () => {
    if (!form.name || !form.amount) return
    if (editing === 'new') {
      setBills([...bills, { ...form, id: Date.now() }])
    } else {
      setBills(bills.map(b => b.id === editing ? form : b))
    }
    setEditing(null)
  }

  const deleteBill = (id) => {
    setBills(bills.filter(b => b.id !== id))
  }

  const toggleEssential = (id) => {
    setBills(bills.map(b => b.id === id ? { ...b, essential: !b.essential } : b))
  }

  const filtered = filter === 'all' ? bills : bills.filter(b => b.category === filter)
  const getCatInfo = (val) => CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1]

  return (
    <div>
      <div className="section-title">🧾 Monthly Bills & Expenses</div>
      <div className="section-sub">Add all your recurring expenses. Mark essentials to get accurate discretionary spending analysis.</div>

      {/* Summary row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-label">Total Monthly</div>
          <div className="metric-value metric-bad">${totalMonthly.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
          <div className="metric-sub">{bills.length} expenses</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Essential Bills</div>
          <div className="metric-value">${essentialTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
          <div className="metric-sub">{bills.filter(b => b.essential).length} items</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Discretionary</div>
          <div className="metric-value metric-warn">${(totalMonthly - essentialTotal).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
          <div className="metric-sub">{bills.filter(b => !b.essential).length} items</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Top Category</div>
          <div className="metric-value" style={{ fontSize: 18 }}>
            {Object.entries(catMap).length > 0
              ? getCatInfo(Object.entries(catMap).sort((a,b) => b[1]-a[1])[0][0]).icon + ' ' +
                getCatInfo(Object.entries(catMap).sort((a,b) => b[1]-a[1])[0][0]).label
              : '—'}
          </div>
          <div className="metric-sub">
            {Object.entries(catMap).length > 0
              ? `$${Object.entries(catMap).sort((a,b) => b[1]-a[1])[0][1].toFixed(0)}/mo`
              : ''}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        {/* Bills table */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Your Expenses</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="form-input"
                style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Expense</button>
            </div>
          </div>

          {editing && (
            <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14, color: 'var(--blue)' }}>
                {editing === 'new' ? '➕ New Expense' : '✏️ Edit Expense'}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Netflix" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <div className="form-input-prefix">
                    <span>$</span>
                    <input className="form-input" type="number" min="0" step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="0.00" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select className="form-input" value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <input type="checkbox" id="essential-check"
                  checked={form.essential}
                  onChange={(e) => setForm({ ...form, essential: e.target.checked })} />
                <label htmlFor="essential-check" style={{ fontSize: 14, cursor: 'pointer' }}>
                  Mark as essential (housing, utilities, insurance, etc.)
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={saveForm}>Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Frequency</th>
                  <th>Monthly</th>
                  <th>Type</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>No expenses yet — add one above!</td></tr>
                )}
                {filtered.map(bill => {
                  const cat = getCatInfo(bill.category)
                  const monthly = toMonthly(bill.amount, bill.frequency)
                  return (
                    <tr key={bill.id}>
                      <td style={{ fontWeight: 500 }}>{bill.name}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: CAT_COLORS[bill.category] || '#6b7280',
                            display: 'inline-block'
                          }} />
                          {cat.icon} {cat.label}
                        </span>
                      </td>
                      <td>${parseFloat(bill.amount || 0).toFixed(2)}</td>
                      <td style={{ textTransform: 'capitalize' }}>{bill.frequency}</td>
                      <td style={{ fontWeight: 600 }}>${monthly.toFixed(2)}</td>
                      <td>
                        <button
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: bill.essential ? 'var(--green-light)' : 'var(--gray-100)',
                            color: bill.essential ? 'var(--green)' : 'var(--gray-500)', fontWeight: 500 }}
                          onClick={() => toggleEssential(bill.id)}
                        >
                          {bill.essential ? '✓ Essential' : 'Discretionary'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(bill)} title="Edit">✏️</button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteBill(bill.id)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {bills.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700, background: 'var(--gray-50)' }}>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '12px 14px' }}>Total Monthly:</td>
                    <td style={{ padding: '12px 14px', color: 'var(--red)' }}>${totalMonthly.toFixed(2)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button className="btn btn-primary" onClick={onNext}>
          View Budget Analysis →
        </button>
      </div>
    </div>
  )
}
