import { useState, useRef, useCallback } from 'react'

const FREQUENCIES = [
  { value: 'weekly',     label: 'Weekly',      multiplier: 52  },
  { value: 'biweekly',  label: 'Bi-Weekly',   multiplier: 26  },
  { value: 'semimonthly', label: 'Semi-Monthly', multiplier: 24 },
  { value: 'monthly',   label: 'Monthly',     multiplier: 12  },
]

function parsePaystubText(text) {
  const parsed = {}
  const t = text.toUpperCase()

  const find = (patterns) => {
    for (const pattern of patterns) {
      const m = t.match(pattern)
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''))
        if (!isNaN(val)) return val
      }
    }
    return null
  }

  parsed.grossPay = find([
    /GROSS\s+(?:PAY|EARNINGS)[^\d]+([\d,]+\.?\d*)/,
    /TOTAL\s+GROSS[^\d]+([\d,]+\.?\d*)/,
    /GROSS\s+WAGES[^\d]+([\d,]+\.?\d*)/,
  ])

  parsed.netPay = find([
    /NET\s+PAY[^\d]+([\d,]+\.?\d*)/,
    /TAKE[\s-]?HOME[^\d]+([\d,]+\.?\d*)/,
    /NET\s+WAGES[^\d]+([\d,]+\.?\d*)/,
  ])

  parsed.federal = find([
    /FED(?:ERAL)?\s+(?:INCOME\s+)?TAX[^\d]+([\d,]+\.?\d*)/,
    /FEDERAL\s+W\/H[^\d]+([\d,]+\.?\d*)/,
  ])

  parsed.state = find([
    /STATE\s+(?:INCOME\s+)?TAX[^\d]+([\d,]+\.?\d*)/,
    /STATE\s+W\/H[^\d]+([\d,]+\.?\d*)/,
  ])

  parsed.socialSecurity = find([
    /SOC(?:IAL)?\s+SEC(?:URITY)?[^\d]+([\d,]+\.?\d*)/,
    /OASDI[^\d]+([\d,]+\.?\d*)/,
    /SS\s+TAX[^\d]+([\d,]+\.?\d*)/,
  ])

  parsed.medicare = find([
    /MEDICARE[^\d]+([\d,]+\.?\d*)/,
    /MED(?:ICARE)?\s+TAX[^\d]+([\d,]+\.?\d*)/,
  ])

  parsed.retirement401k = find([
    /401\(K\)[^\d]+([\d,]+\.?\d*)/,
    /401K[^\d]+([\d,]+\.?\d*)/,
    /RETIREMENT[^\d]+([\d,]+\.?\d*)/,
  ])

  parsed.healthInsurance = find([
    /HEALTH\s+(?:INS(?:URANCE)?)[^\d]+([\d,]+\.?\d*)/,
    /MEDICAL\s+(?:INS(?:URANCE)?)[^\d]+([\d,]+\.?\d*)/,
    /DENTAL\s+&\s+MEDICAL[^\d]+([\d,]+\.?\d*)/,
  ])

  // Try to find employer name
  const empMatch = t.match(/(?:EMPLOYER|COMPANY|FROM)[:\s]+([A-Z][A-Z\s]+?)(?:\n|TAX|INC|LLC|CORP)/)
  if (empMatch) parsed.employer = empMatch[1].trim()

  return parsed
}

export default function PaystubUpload({ income, setIncome, onNext }) {
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseMsg, setParseMsg] = useState('')
  const [mode, setMode] = useState('upload') // 'upload' | 'manual'
  const [localIncome, setLocalIncome] = useState(income)
  const [frequency, setFrequency] = useState(income.payFrequency || 'biweekly')
  const fileRef = useRef()

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setParsing(true)
    setParseMsg('Reading file…')

    try {
      const text = await file.text()
      setParseMsg('Extracting income data…')
      const parsed = parsePaystubText(text)
      const freq = FREQUENCIES.find(f => f.value === frequency) || FREQUENCIES[1]

      const toMonthly = (val) => val ? +(val * (freq.multiplier / 12)).toFixed(2) : 0

      const updated = {
        ...localIncome,
        grossMonthly: parsed.grossPay ? toMonthly(parsed.grossPay) : localIncome.grossMonthly,
        netMonthly:   parsed.netPay   ? toMonthly(parsed.netPay)   : localIncome.netMonthly,
        federal:      parsed.federal  ? toMonthly(parsed.federal)  : localIncome.federal,
        state:        parsed.state    ? toMonthly(parsed.state)    : localIncome.state,
        socialSecurity: parsed.socialSecurity ? toMonthly(parsed.socialSecurity) : localIncome.socialSecurity,
        medicare:     parsed.medicare ? toMonthly(parsed.medicare) : localIncome.medicare,
        retirement401k: parsed.retirement401k ? toMonthly(parsed.retirement401k) : localIncome.retirement401k,
        healthInsurance: parsed.healthInsurance ? toMonthly(parsed.healthInsurance) : localIncome.healthInsurance,
        payFrequency: frequency,
        employer: parsed.employer || localIncome.employer,
      }

      setLocalIncome(updated)
      setIncome(updated)
      setParseMsg(`✓ Parsed successfully${parsed.grossPay ? ` — Gross: $${toMonthly(parsed.grossPay).toLocaleString()}/mo` : ''}`)
      setMode('manual')
    } catch {
      setParseMsg('Could not auto-parse. Please enter values manually below.')
      setMode('manual')
    } finally {
      setParsing(false)
    }
  }, [frequency, localIncome, setIncome])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (field, value) => {
    const num = parseFloat(value) || 0
    const updated = { ...localIncome, [field]: num }

    // Auto-calculate net if gross changes
    if (field === 'grossMonthly') {
      const totalDed =
        (updated.federal + updated.state + updated.socialSecurity +
         updated.medicare + updated.retirement401k + updated.healthInsurance +
         updated.otherDeductions)
      if (totalDed > 0) updated.netMonthly = Math.max(0, num - totalDed)
    }

    // Recalculate net from deductions
    if (['federal','state','socialSecurity','medicare','retirement401k','healthInsurance','otherDeductions'].includes(field)) {
      const totalDed =
        updated.federal + updated.state + updated.socialSecurity +
        updated.medicare + updated.retirement401k + updated.healthInsurance +
        updated.otherDeductions
      if (updated.grossMonthly > 0) {
        updated.netMonthly = Math.max(0, updated.grossMonthly - totalDed)
      }
    }

    setLocalIncome(updated)
  }

  const handleSave = () => {
    setIncome({ ...localIncome, payFrequency: frequency })
    onNext()
  }

  const fmt = (n) => n ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''

  const totalDeductions = (localIncome.federal || 0) + (localIncome.state || 0) +
    (localIncome.socialSecurity || 0) + (localIncome.medicare || 0) +
    (localIncome.retirement401k || 0) + (localIncome.healthInsurance || 0) +
    (localIncome.otherDeductions || 0)

  const effectiveRate = localIncome.grossMonthly > 0
    ? ((totalDeductions / localIncome.grossMonthly) * 100).toFixed(1)
    : 0

  return (
    <div>
      <div className="section-title">📄 Paystub Information</div>
      <div className="section-sub">Upload your paystub to auto-fill, or enter your income details manually.</div>

      <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
        {/* Upload Zone */}
        <div className="card">
          <div className="card-title">Upload Paystub</div>

          <div
            className={`upload-zone${dragOver ? ' drag-over' : ''}`}
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="upload-zone-icon">📎</div>
            <h3>Drop your paystub here</h3>
            <p>PDF or text files — click or drag to upload</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.text"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          {parsing && (
            <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--blue)', fontSize: 14 }}>
              ⏳ {parseMsg}
            </div>
          )}
          {!parsing && parseMsg && (
            <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 13,
              color: parseMsg.startsWith('✓') ? 'var(--green)' : 'var(--amber)' }}>
              {parseMsg}
            </div>
          )}

          <div className="divider" />
          <div style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.6 }}>
            <strong>Supported formats:</strong> PDF, plain text<br />
            Your data stays on your device and is never uploaded to any server.
          </div>
        </div>

        {/* Pay Frequency */}
        <div className="card">
          <div className="card-title">Pay Frequency</div>
          <div className="form-group">
            <label className="form-label">How often are you paid?</label>
            <select
              className="form-input"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {FREQUENCIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Employer Name (optional)</label>
            <input
              className="form-input"
              type="text"
              value={localIncome.employer}
              onChange={(e) => setLocalIncome({ ...localIncome, employer: e.target.value })}
              placeholder="e.g. Acme Corporation"
            />
          </div>

          {localIncome.grossMonthly > 0 && (
            <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: 16, marginTop: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600, marginBottom: 8 }}>Monthly Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span>Gross Pay</span>
                <strong>${localIncome.grossMonthly.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span>Total Deductions</span>
                <strong style={{ color: 'var(--red)' }}>-${totalDeductions.toLocaleString()}</strong>
              </div>
              <div style={{ borderTop: '1px solid rgba(37,99,235,0.2)', marginTop: 8, paddingTop: 8,
                display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
                <span>Net Take-Home</span>
                <span style={{ color: 'var(--green)' }}>${localIncome.netMonthly.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                Effective deduction rate: {effectiveRate}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Income Details <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--gray-500)' }}>(per pay period — auto-converted to monthly)</span></div>

        <div className="grid-2">
          {/* Earnings */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Earnings</div>
            <div className="form-group">
              <label className="form-label">Gross Pay</label>
              <div className="form-input-prefix">
                <span>$</span>
                <input className="form-input" type="number" min="0" step="0.01"
                  value={localIncome.grossMonthly || ''}
                  onChange={(e) => handleChange('grossMonthly', e.target.value)}
                  placeholder="0.00" />
              </div>
              <div className="helper-text">Enter monthly gross income</div>
            </div>
            <div className="form-group">
              <label className="form-label">Net Take-Home Pay</label>
              <div className="form-input-prefix">
                <span>$</span>
                <input className="form-input" type="number" min="0" step="0.01"
                  value={localIncome.netMonthly || ''}
                  onChange={(e) => handleChange('netMonthly', e.target.value)}
                  placeholder="0.00" />
              </div>
              <div className="helper-text">Auto-calculated from deductions, or enter manually</div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deductions (monthly)</div>
            {[
              { field: 'federal',         label: 'Federal Income Tax' },
              { field: 'state',           label: 'State Income Tax' },
              { field: 'socialSecurity',  label: 'Social Security (6.2%)' },
              { field: 'medicare',        label: 'Medicare (1.45%)' },
              { field: 'retirement401k',  label: '401(k) Contribution' },
              { field: 'healthInsurance', label: 'Health Insurance' },
              { field: 'otherDeductions', label: 'Other Deductions' },
            ].map(({ field, label }) => (
              <div className="form-group" key={field} style={{ marginBottom: 10 }}>
                <label className="form-label">{label}</label>
                <div className="form-input-prefix">
                  <span>$</span>
                  <input className="form-input" type="number" min="0" step="0.01"
                    value={localIncome[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={!localIncome.netMonthly && !localIncome.grossMonthly}>
          Continue to Monthly Bills →
        </button>
      </div>
    </div>
  )
}
