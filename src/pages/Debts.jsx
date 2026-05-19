import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calcMonthsToPayoff, calcTotalInterest, calcDebtFreeDate } from '../utils/calculations';
import Modal, { FormField, ModalFooter } from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

const emptyForm = () => ({
  name: '', lender: '', balance: '', annualRate: '',
  minPayment: '', actualPayment: '', startBalance: '',
});

function DebtCard({ debt, onEdit, onDelete, currency }) {
  const balance = Number(debt.balance);
  const rate = Number(debt.annualRate);
  const actual = Number(debt.actualPayment);
  const minPay = Number(debt.minPayment);
  const startBal = Number(debt.startBalance) || balance;

  const months = calcMonthsToPayoff(balance, rate, actual);
  const totalInterest = calcTotalInterest(balance, rate, actual);
  const debtFreeDate = calcDebtFreeDate(balance, rate, actual);
  const pctPaid = startBal > 0 ? Math.min(100, ((startBal - balance) / startBal) * 100) : 0;
  const extra = actual - minPay;

  const rateColor = rate > 30 ? '#EF4444' : rate > 15 ? '#EAB308' : '#10B981';
  const rateLabel = rate > 30 ? '🔴 Very High' : rate > 15 ? '🟡 High' : '🟢 Manageable';

  return (
    <div className="card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>{debt.name}</h3>
          {debt.lender && <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>{debt.lender}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <span className="badge" style={{ background: `${rateColor}20`, color: rateColor, border: `1px solid ${rateColor}40`, fontSize: '0.7rem' }}>{rateLabel}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(debt)}>✏️</button>
          <button className="btn btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={() => onDelete(debt.id)}>🗑️</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem', marginBottom: '0.875rem' }}>
        {[
          { label: 'Balance', value: formatCurrency(balance, currency), color: '#f87171' },
          { label: 'Annual Rate', value: `${rate}%` },
          { label: 'Monthly Rate', value: `${(rate / 12).toFixed(3)}%` },
          { label: 'Min Payment', value: formatCurrency(minPay, currency) },
          { label: 'Actual Payment', value: formatCurrency(actual, currency), color: '#10B981' },
          { label: 'Extra vs Min', value: formatCurrency(extra, currency), color: extra > 0 ? '#10B981' : '#94A3B8' },
        ].map(item => (
          <div key={item.label} style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.625rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{item.label}</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: item.color || 'white' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.875rem' }}>
        <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.625rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Months to Pay Off</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: isFinite(months) ? 'white' : '#f87171' }}>
            {isFinite(months) ? months : '∞'}
          </div>
        </div>
        <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.625rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Total Interest</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#f87171' }}>
            {isFinite(totalInterest) ? formatCurrency(totalInterest, currency) : '∞'}
          </div>
        </div>
      </div>

      {debtFreeDate && (
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#94A3B8' }}>
          📅 Debt-free by <strong style={{ color: '#10B981' }}>{debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        </p>
      )}

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Progress paid off</span>
          <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>{pctPaid.toFixed(1)}%</span>
        </div>
        <div className="progress-track" style={{ height: '8px' }}>
          <div className="progress-fill" style={{ width: `${pctPaid}%`, height: '8px', background: '#10B981' }} />
        </div>
      </div>
    </div>
  );
}

export default function Debts() {
  const { debts, setDebts, settings } = useApp();
  const currency = settings.currency || 'USD';
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [sortMode, setSortMode] = useState('avalanche');

  function openAdd() { setEditItem(null); setForm(emptyForm()); setShowModal(true); }
  function openEdit(d) { setEditItem(d); setForm({ ...d, balance: String(d.balance), annualRate: String(d.annualRate), minPayment: String(d.minPayment), actualPayment: String(d.actualPayment), startBalance: String(d.startBalance || d.balance) }); setShowModal(true); }

  function handleSubmit(e) {
    e.preventDefault();
    const item = {
      ...form,
      id: editItem?.id || Date.now(),
      balance: Number(form.balance),
      annualRate: Number(form.annualRate),
      minPayment: Number(form.minPayment),
      actualPayment: Number(form.actualPayment || form.minPayment),
      startBalance: Number(form.startBalance || form.balance),
    };
    if (editItem) {
      setDebts(prev => prev.map(d => d.id === editItem.id ? item : d));
    } else {
      setDebts(prev => [...prev, item]);
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    if (confirm('Delete this debt?')) setDebts(prev => prev.filter(d => d.id !== id));
  }

  const sorted = useMemo(() => {
    const copy = [...debts];
    if (sortMode === 'avalanche') return copy.sort((a, b) => Number(b.annualRate) - Number(a.annualRate));
    return copy.sort((a, b) => Number(a.balance) - Number(b.balance));
  }, [debts, sortMode]);

  const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);
  const totalMonthly = debts.reduce((s, d) => s + Number(d.actualPayment), 0);

  const latestDebtFree = useMemo(() => {
    const dates = debts.map(d => calcDebtFreeDate(Number(d.balance), Number(d.annualRate), Number(d.actualPayment))).filter(Boolean);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }, [debts]);

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">My Debts</h1>
          <p className="page-subtitle">Track and eliminate your debt strategically</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Debt</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card-flat">
          <div className="label">Total Debt</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>{formatCurrency(totalDebt, currency)}</div>
        </div>
        <div className="card-flat">
          <div className="label">Monthly Payments</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{formatCurrency(totalMonthly, currency)}</div>
        </div>
        <div className="card-flat">
          <div className="label">Projected Debt-Free</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10B981' }}>
            {latestDebtFree ? latestDebtFree.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
          </div>
        </div>
        <div className="card-flat">
          <div className="label">Number of Debts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{debts.length}</div>
        </div>
      </div>

      {/* Sort toggle */}
      {debts.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className={`btn ${sortMode === 'avalanche' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSortMode('avalanche')}>
            🏔️ Avalanche (Highest Rate)
          </button>
          <button className={`btn ${sortMode === 'snowball' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSortMode('snowball')}>
            ⛄ Snowball (Lowest Balance)
          </button>
        </div>
      )}

      {debts.length === 0 ? (
        <EmptyState icon="🎉" title="No debts tracked" description="Add your first debt to start your payoff journey" action={
          <button className="btn btn-primary" onClick={openAdd}>Add First Debt</button>
        } />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
          {sorted.map(d => (
            <DebtCard key={d.id} debt={d} onEdit={openEdit} onDelete={handleDelete} currency={currency} />
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editItem ? 'Edit Debt' : 'Add Debt'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FormField label="Debt Name">
                <input className="input-field" placeholder="e.g. Credit Card" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </FormField>
              <FormField label="Lender">
                <input className="input-field" placeholder="e.g. Chase" value={form.lender} onChange={e => setForm(p => ({ ...p, lender: e.target.value }))} />
              </FormField>
              <FormField label="Current Balance">
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0" value={form.balance} onChange={e => setForm(p => ({ ...p, balance: e.target.value }))} required />
              </FormField>
              <FormField label="Original Balance">
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0" value={form.startBalance} onChange={e => setForm(p => ({ ...p, startBalance: e.target.value }))} />
              </FormField>
              <FormField label="Annual Rate (%)">
                <input type="number" className="input-field" placeholder="e.g. 24.99" step="0.01" min="0" value={form.annualRate} onChange={e => setForm(p => ({ ...p, annualRate: e.target.value }))} required />
              </FormField>
              <FormField label="Min Payment">
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0" value={form.minPayment} onChange={e => setForm(p => ({ ...p, minPayment: e.target.value }))} required />
              </FormField>
            </div>
            <FormField label="Actual Monthly Payment">
              <input type="number" className="input-field" placeholder="How much you actually pay" step="0.01" min="0" value={form.actualPayment} onChange={e => setForm(p => ({ ...p, actualPayment: e.target.value }))} required />
            </FormField>
            <ModalFooter>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Debt'}</button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
}
