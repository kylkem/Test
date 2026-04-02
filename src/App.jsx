import { useState } from 'react'
import PaystubUpload from './components/PaystubUpload'
import BillsManager from './components/BillsManager'
import BudgetDashboard from './components/BudgetDashboard'
import RetirementPlanner from './components/RetirementPlanner'
import SavingsGoals from './components/SavingsGoals'

const TABS = [
  { id: 'paystub',    label: 'Paystub',        icon: '📄' },
  { id: 'bills',      label: 'Monthly Bills',  icon: '🧾' },
  { id: 'dashboard',  label: 'Budget Analysis',icon: '📊' },
  { id: 'savings',    label: 'Savings Goals',  icon: '🏦' },
  { id: 'retirement', label: 'Retirement',     icon: '🎯' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('paystub')

  const [income, setIncome] = useState({
    grossMonthly: 0,
    netMonthly: 0,
    federal: 0,
    state: 0,
    socialSecurity: 0,
    medicare: 0,
    retirement401k: 0,
    healthInsurance: 0,
    otherDeductions: 0,
    payFrequency: 'biweekly',
    employer: '',
  })

  const [bills, setBills] = useState([
    { id: 1, name: 'Rent / Mortgage',    category: 'housing',       amount: 1500, frequency: 'monthly', essential: true  },
    { id: 2, name: 'Electricity',        category: 'utilities',     amount: 120,  frequency: 'monthly', essential: true  },
    { id: 3, name: 'Groceries',          category: 'food',          amount: 400,  frequency: 'monthly', essential: true  },
    { id: 4, name: 'Car Payment',        category: 'transport',     amount: 350,  frequency: 'monthly', essential: true  },
    { id: 5, name: 'Car Insurance',      category: 'insurance',     amount: 150,  frequency: 'monthly', essential: true  },
    { id: 6, name: 'Internet',           category: 'utilities',     amount: 70,   frequency: 'monthly', essential: true  },
    { id: 7, name: 'Streaming Services', category: 'entertainment', amount: 45,   frequency: 'monthly', essential: false },
    { id: 8, name: 'Gym Membership',     category: 'health',        amount: 40,   frequency: 'monthly', essential: false },
  ])

  const [savingsGoals, setSavingsGoals] = useState([
    { id: 1, name: 'Emergency Fund', targetAmount: 15000, currentAmount: 3000, targetDate: '2025-12-31', priority: 'high'   },
    { id: 2, name: 'Vacation',       targetAmount: 3000,  currentAmount: 500,  targetDate: '2025-07-01', priority: 'medium' },
    { id: 3, name: 'New Car',        targetAmount: 10000, currentAmount: 1000, targetDate: '2026-06-01', priority: 'low'    },
  ])

  const [retirementData, setRetirementData] = useState({
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 25000,
    monthlyContribution: 500,
    expectedReturn: 7,
    inflationRate: 3,
    desiredIncome: 60000,
    socialSecurityEstimate: 18000,
  })

  const fmt = (n) => n > 0 ? `$${n.toLocaleString()}` : '—'

  return (
    <div>
      <header className="app-header">
        <div style={{ fontSize: 32 }}>💰</div>
        <div>
          <h1>BudgetWise</h1>
          <div className="subtitle">Personal Financial Planning &amp; Analysis</div>
        </div>
        {income.netMonthly > 0 && (
          <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 13 }}>
            <div style={{ opacity: 0.7 }}>Monthly Take-Home</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(income.netMonthly)}</div>
          </div>
        )}
      </header>

      <nav className="app-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-content">
        {activeTab === 'paystub' && (
          <PaystubUpload income={income} setIncome={setIncome} onNext={() => setActiveTab('bills')} />
        )}
        {activeTab === 'bills' && (
          <BillsManager bills={bills} setBills={setBills} onNext={() => setActiveTab('dashboard')} />
        )}
        {activeTab === 'dashboard' && (
          <BudgetDashboard income={income} bills={bills} savingsGoals={savingsGoals} />
        )}
        {activeTab === 'savings' && (
          <SavingsGoals goals={savingsGoals} setGoals={setSavingsGoals} income={income} bills={bills} />
        )}
        {activeTab === 'retirement' && (
          <RetirementPlanner data={retirementData} setData={setRetirementData} income={income} />
        )}
      </main>
    </div>
  )
}
