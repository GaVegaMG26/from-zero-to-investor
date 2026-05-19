import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, getLast6Months, getMonthKey } from '../utils/formatters';
import { calcTrafficLight, calcFinancialScore } from '../utils/calculations';
import Modal, { FormField, ModalFooter } from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

function TrafficLightWidget({ color }) {
  const lights = ['red', 'yellow', 'green'];
  const labels = { red: '🔴 High Risk', yellow: '🟡 Building', green: '🟢 Investor Ready' };
  const desc = {
    red: 'Focus on eliminating high-rate debt and building cash flow',
    yellow: 'Good progress — keep saving and building your emergency fund',
    green: 'You have the foundation to start investing!',
  };
  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #162032 100%)' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>
        INVESTOR TRAFFIC LIGHT
      </h3>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
        <div style={{
          background: '#0F172A', borderRadius: '2rem', padding: '0.75rem 1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.625rem', border: '2px solid #334155',
        }}>
          {lights.map(l => (
            <div
              key={l}
              className={l === color ? `animate-pulse-${l}` : ''}
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: l === color
                  ? l === 'red' ? '#EF4444' : l === 'yellow' ? '#EAB308' : '#10B981'
                  : '#1E293B',
                opacity: l === color ? 1 : 0.25,
                transition: 'all 0.4s',
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
          {labels[color]}
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.5 }}>{desc[color]}</p>
        <Link to="/traffic-light" className="btn btn-primary" style={{ marginTop: '0.875rem', fontSize: '0.8rem' }}>
          View Full Analysis
        </Link>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div className="metric-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.375rem', fontWeight: 800, color: color || 'white', marginBottom: '0.2rem' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.75rem' }}>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#94A3B8' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ margin: '0.125rem 0', fontSize: '0.875rem', color: p.fill }}>
          {p.name}: {formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { transactions, debts, fundEntries, fundConfig, goals, portfolio, tlInputs, settings } = useApp();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { setTransactions, categories } = useApp();
  const currency = settings.currency || 'USD';

  const [quickForm, setQuickForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '', category: 'Other', type: 'expense', amount: '',
  });

  const months = getLast6Months();

  const chartData = useMemo(() => {
    return months.map(m => {
      const mTxns = transactions.filter(t => getMonthKey(t.date) === m.key);
      const income = mTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = mTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return { month: m.label, income, expenses };
    });
  }, [transactions, months]);

  const currentMonth = months[months.length - 1].key;
  const currentTxns = transactions.filter(t => getMonthKey(t.date) === currentMonth);
  const monthIncome = currentTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const monthExpenses = currentTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const netFlow = monthIncome - monthExpenses;

  const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);
  const fundBalance = fundEntries.reduce((s, e) => s + Number(e.amount), 0);
  const idealGoal = (fundConfig.monthlyExpenses || 0) * 6;
  const fundPct = idealGoal > 0 ? Math.min(100, (fundBalance / idealGoal) * 100) : 0;

  const portfolioValue = portfolio.reduce((s, p) => s + (p.currentPrice || p.buyPrice) * p.shares, 0);

  const trafficColor = calcTrafficLight({
    highestRate: Number(tlInputs.highestRate) || 0,
    netFlow: Number(tlInputs.income) - Number(tlInputs.expenses),
    fundMonths: Number(tlInputs.fundMonths) || 0,
    savingsRate: tlInputs.income > 0 ? ((tlInputs.income - tlInputs.expenses) / tlInputs.income) * 100 : 0,
  });

  const urgentGoals = goals
    .filter(g => Number(g.current) < Number(g.target))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 3);

  const highPriorityDebt = debts.sort((a, b) => b.annualRate - a.annualRate)[0];

  function handleQuickAdd(e) {
    e.preventDefault();
    if (!quickForm.description || !quickForm.amount) return;
    const newTxn = { ...quickForm, id: Date.now(), amount: Number(quickForm.amount) };
    setTransactions(prev => [newTxn, ...prev]);
    setShowQuickAdd(false);
    setQuickForm({ date: new Date().toISOString().slice(0, 10), description: '', category: 'Other', type: 'expense', amount: '' });
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your financial snapshot at a glance</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowQuickAdd(true)}>
          + Quick Add
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
        <MetricCard
          label="Monthly Net Flow" icon="💰"
          value={formatCurrency(netFlow, currency)}
          color={netFlow >= 0 ? '#10B981' : '#EF4444'}
          sub={netFlow >= 0 ? 'Positive flow ✓' : 'Spending exceeds income'}
        />
        <MetricCard
          label="Total Debt" icon="💳"
          value={formatCurrency(totalDebt, currency)}
          color={totalDebt > 0 ? '#f87171' : '#10B981'}
          sub={`${debts.length} active debt${debts.length !== 1 ? 's' : ''}`}
        />
        <MetricCard
          label="Emergency Fund" icon="🛡️"
          value={`${fundPct.toFixed(0)}%`}
          color={fundPct >= 100 ? '#10B981' : fundPct >= 50 ? '#fbbf24' : '#f87171'}
          sub={`${formatCurrency(fundBalance, currency)} saved`}
        />
        <MetricCard
          label="Portfolio Value" icon="📈"
          value={formatCurrency(portfolioValue, currency)}
          color="#10B981"
          sub={`${portfolio.length} position${portfolio.length !== 1 ? 's' : ''}`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 340px)', gap: '1rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Chart */}
          <div className="card-flat">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>
              INCOME VS EXPENSES — LAST 6 MONTHS
            </h3>
            {transactions.length === 0 ? (
              <EmptyState icon="📊" title="No transactions yet" description="Add your first income or expense to see the chart" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Goals */}
          <div className="card-flat">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>URGENT GOALS</h3>
              <Link to="/goals" style={{ fontSize: '0.75rem', color: '#10B981', textDecoration: 'none' }}>View all →</Link>
            </div>
            {urgentGoals.length === 0 ? (
              <EmptyState icon="🎯" title="No goals yet" description="Add financial goals to track your progress" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {urgentGoals.map(g => {
                  const pct = Math.min(100, (Number(g.current) / Number(g.target)) * 100);
                  return (
                    <div key={g.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>{g.name}</span>
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="progress-track" style={{ height: '6px' }}>
                        <div className="progress-fill" style={{
                          width: `${pct}%`, height: '6px',
                          background: pct >= 75 ? '#10B981' : pct >= 40 ? '#EAB308' : '#EF4444',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#475569' }}>{formatCurrency(g.current, currency)}</span>
                        <span style={{ fontSize: '0.7rem', color: '#475569' }}>{formatCurrency(g.target, currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TrafficLightWidget color={trafficColor} />

          {/* Top debt */}
          <div className="card-flat">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>PRIORITY DEBT</h3>
              <Link to="/debts" style={{ fontSize: '0.75rem', color: '#10B981', textDecoration: 'none' }}>View all →</Link>
            </div>
            {!highPriorityDebt ? (
              <EmptyState icon="🎉" title="No debts!" description="Great job staying debt-free" />
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white', marginBottom: '0.25rem' }}>{highPriorityDebt.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Balance</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f87171' }}>{formatCurrency(highPriorityDebt.balance, currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Interest Rate</span>
                  <span className={`badge ${highPriorityDebt.annualRate > 30 ? 'badge-red' : highPriorityDebt.annualRate > 15 ? 'badge-yellow' : 'badge-green'}`}>
                    {highPriorityDebt.annualRate}% APR
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showQuickAdd && (
        <Modal title="Quick Add Transaction" onClose={() => setShowQuickAdd(false)}>
          <form onSubmit={handleQuickAdd}>
            <FormField label="Date">
              <input type="date" className="input-field" value={quickForm.date}
                onChange={e => setQuickForm(p => ({ ...p, date: e.target.value }))} required />
            </FormField>
            <FormField label="Description">
              <input className="input-field" placeholder="e.g. Salary, Groceries..." value={quickForm.description}
                onChange={e => setQuickForm(p => ({ ...p, description: e.target.value }))} required />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FormField label="Type">
                <select className="select-field" value={quickForm.type} onChange={e => setQuickForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </FormField>
              <FormField label="Category">
                <select className="select-field" value={quickForm.category} onChange={e => setQuickForm(p => ({ ...p, category: e.target.value }))}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Amount">
              <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0" value={quickForm.amount}
                onChange={e => setQuickForm(p => ({ ...p, amount: e.target.value }))} required />
            </FormField>
            <ModalFooter>
              <button type="button" className="btn btn-secondary" onClick={() => setShowQuickAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Transaction</button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
}
