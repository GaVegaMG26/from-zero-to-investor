import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal, { FormField, ModalFooter } from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

function CircularProgress({ pct, size = 180, strokeWidth = 14 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, pct) / 100) * circ;
  const color = pct >= 100 ? '#10B981' : pct >= 50 ? '#EAB308' : '#EF4444';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E293B" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

export default function EmergencyFund() {
  const { fundEntries, setFundEntries, fundConfig, setFundConfig, settings } = useApp();
  const currency = settings.currency || 'USD';

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [configForm, setConfigForm] = useState({ monthlyExpenses: String(fundConfig.monthlyExpenses || '') });
  const [entryForm, setEntryForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: '', note: '' });

  const monthlyExp = Number(fundConfig.monthlyExpenses) || 0;
  const minGoal = monthlyExp * 3;
  const idealGoal = monthlyExp * 6;
  const balance = fundEntries.reduce((s, e) => s + Number(e.amount), 0);

  const pctOfIdeal = idealGoal > 0 ? Math.min(100, (balance / idealGoal) * 100) : 0;
  const pctOfMin = minGoal > 0 ? Math.min(100, (balance / minGoal) * 100) : 0;
  const monthsCovered = monthlyExp > 0 ? balance / monthlyExp : 0;

  let status, statusColor, statusIcon;
  if (balance === 0) { status = 'No fund yet — start today'; statusColor = '#64748B'; statusIcon = '⬜'; }
  else if (balance >= idealGoal) { status = 'Full fund — you\'re protected'; statusColor = '#10B981'; statusIcon = '🟢'; }
  else if (balance >= minGoal) { status = 'Minimum reached — aim for 6 months'; statusColor = '#EAB308'; statusIcon = '🟡'; }
  else { status = 'Building — keep going'; statusColor = '#EF4444'; statusIcon = '🔴'; }

  // Monthly contribution average
  const recentEntries = [...fundEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const monthlyAvg = useMemo(() => {
    if (recentEntries.length < 2) return Number(recentEntries[0]?.amount) || 0;
    const months = new Set(recentEntries.map(e => e.date.slice(0, 7)));
    const total = recentEntries.reduce((s, e) => s + Number(e.amount), 0);
    return total / months.size;
  }, [recentEntries]);

  const remaining = Math.max(0, idealGoal - balance);
  const monthsToComplete = monthlyAvg > 0 ? Math.ceil(remaining / monthlyAvg) : null;
  const completionDate = monthsToComplete ? (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToComplete);
    return d;
  })() : null;

  // Chart data
  const chartData = useMemo(() => {
    let running = 0;
    return recentEntries.map(e => {
      running += Number(e.amount);
      return { date: e.date, balance: running };
    });
  }, [recentEntries]);

  function handleConfig(e) {
    e.preventDefault();
    setFundConfig({ monthlyExpenses: Number(configForm.monthlyExpenses) });
    setShowConfigModal(false);
  }

  function handleAddEntry(e) {
    e.preventDefault();
    const entry = { ...entryForm, id: Date.now(), amount: Number(entryForm.amount) };
    setFundEntries(prev => [...prev, entry]);
    setEntryForm({ date: new Date().toISOString().slice(0, 10), amount: '', note: '' });
    setShowAddModal(false);
  }

  function handleDeleteEntry(id) {
    if (confirm('Remove this entry?')) setFundEntries(prev => prev.filter(e => e.id !== id));
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.625rem' }}>
        <p style={{ margin: 0, color: '#10B981', fontWeight: 600 }}>{formatCurrency(payload[0].value, currency)}</p>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Emergency Fund</h1>
          <p className="page-subtitle">Your financial safety net — 3 to 6 months of expenses</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => { setConfigForm({ monthlyExpenses: String(fundConfig.monthlyExpenses || '') }); setShowConfigModal(true); }}>
            ⚙️ Set Expenses
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Contribution</button>
        </div>
      </div>

      {monthlyExp === 0 && (
        <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>💡</span>
          <div>
            <p style={{ margin: 0, color: '#fbbf24', fontWeight: 600, fontSize: '0.875rem' }}>Set your monthly expenses first</p>
            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.8rem' }}>This calculates your 3-month and 6-month fund targets</p>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowConfigModal(true)}>Set Now</button>
        </div>
      )}

      {/* Main stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress pct={pctOfIdeal} size={200} strokeWidth={16} />
          <div style={{ position: 'absolute', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>{pctOfIdeal.toFixed(0)}%</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>of ideal goal</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Current Balance</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10B981' }}>{formatCurrency(balance, currency)}</div>
            <div style={{ fontSize: '0.875rem', color: statusColor, marginTop: '0.25rem' }}>{statusIcon} {status}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <div className="label">Minimum Goal (3mo)</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: balance >= minGoal ? '#10B981' : 'white' }}>{formatCurrency(minGoal, currency)}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.125rem' }}>{pctOfMin.toFixed(0)}% reached</div>
            </div>
            <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <div className="label">Ideal Goal (6mo)</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: balance >= idealGoal ? '#10B981' : 'white' }}>{formatCurrency(idealGoal, currency)}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.125rem' }}>Target</div>
            </div>
          </div>
          {completionDate && remaining > 0 && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#94A3B8' }}>
                At your current pace, you'll reach the ideal goal by{' '}
                <strong style={{ color: '#10B981' }}>
                  {completionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </strong>{' '}
                ({monthsToComplete} months)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card-flat" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8' }}>BALANCE GROWTH OVER TIME</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="balance" stroke="#10B981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Contributions list */}
      <div className="card-flat">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>CONTRIBUTIONS</h3>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{fundEntries.length} entries</span>
        </div>
        {fundEntries.length === 0 ? (
          <EmptyState icon="💰" title="No contributions yet" description="Add your first contribution to start building your safety net" action={
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>Add First Contribution</button>
          } />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {[...fundEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', background: '#0F172A', borderRadius: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10B981' }}>+{formatCurrency(e.amount, currency)}</div>
                  {e.note && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{e.note}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{formatDate(e.date)}</span>
                  <button className="btn btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={() => handleDeleteEntry(e.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfigModal && (
        <Modal title="Set Monthly Expenses" onClose={() => setShowConfigModal(false)} size="sm">
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#94A3B8' }}>
            Enter your average monthly expenses. This will calculate your 3-month (minimum) and 6-month (ideal) emergency fund targets.
          </p>
          <form onSubmit={handleConfig}>
            <FormField label="Monthly Expenses">
              <input type="number" className="input-field" placeholder="e.g. 2500.00" step="0.01" min="0"
                value={configForm.monthlyExpenses} onChange={e => setConfigForm({ monthlyExpenses: e.target.value })} required />
            </FormField>
            <ModalFooter>
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {showAddModal && (
        <Modal title="Add Contribution" onClose={() => setShowAddModal(false)} size="sm">
          <form onSubmit={handleAddEntry}>
            <FormField label="Date">
              <input type="date" className="input-field" value={entryForm.date} onChange={e => setEntryForm(p => ({ ...p, date: e.target.value }))} required />
            </FormField>
            <FormField label="Amount">
              <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0.01"
                value={entryForm.amount} onChange={e => setEntryForm(p => ({ ...p, amount: e.target.value }))} required />
            </FormField>
            <FormField label="Note (optional)">
              <input className="input-field" placeholder="e.g. Monthly transfer" value={entryForm.note}
                onChange={e => setEntryForm(p => ({ ...p, note: e.target.value }))} />
            </FormField>
            <ModalFooter>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Contribution</button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
}
