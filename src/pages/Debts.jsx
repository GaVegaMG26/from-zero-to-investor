import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { calcMonthsToPayoff, calcTotalInterest, calcDebtFreeDate } from '../utils/calculations';
import Modal, { FormField, ModalFooter } from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

const emptyForm = () => ({
  kind: 'loan', // 'loan' | 'credit_card'
  name: '', lender: '',
  // Loan fields
  balance: '', annualRate: '', minPayment: '', actualPayment: '', startBalance: '',
  // Credit card extra fields
  creditLimit: '', currentSpend: '', statementDate: '', dueDate: '',
});

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function nextDueDate(dueDateStr) {
  if (!dueDateStr) return null;
  const target = new Date(dueDateStr + 'T23:59:59');
  const now = new Date();
  while (target < now) target.setMonth(target.getMonth() + 1);
  return target;
}

function CreditCardRecommendations({ debt, currency }) {
  const limit = Number(debt.creditLimit) || 0;
  const spend = Number(debt.currentSpend ?? debt.balance) || 0;
  const minPay = Number(debt.minPayment) || 0;
  const rate = Number(debt.annualRate) || 0;
  const utilization = limit > 0 ? (spend / limit) * 100 : 0;

  const nextDue = nextDueDate(debt.dueDate);
  const daysLeft = nextDue ? Math.ceil((nextDue - new Date()) / (1000 * 60 * 60 * 24)) : null;

  // Months to pay off if only paying minimum
  const monthsMin = calcMonthsToPayoff(spend, rate, minPay);
  const interestMin = calcTotalInterest(spend, rate, minPay);

  const recommendations = [];

  // Days until due
  if (daysLeft !== null) {
    if (daysLeft <= 3) {
      recommendations.push({
        icon: '🚨', color: '#EF4444',
        title: `¡Solo ${daysLeft} día${daysLeft !== 1 ? 's' : ''} para pagar!`,
        text: `Tu fecha límite es ${nextDue.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}. Paga AL MENOS el mínimo (${formatCurrency(minPay, currency)}) HOY para evitar cargos por mora y daño a tu score.`,
      });
    } else if (daysLeft <= 7) {
      recommendations.push({
        icon: '⏰', color: '#EAB308',
        title: `${daysLeft} días para tu fecha límite`,
        text: `Programa el pago esta semana. Si pagas el total (${formatCurrency(spend, currency)}) NO pagarás intereses.`,
      });
    } else {
      recommendations.push({
        icon: '📅', color: '#10B981',
        title: `${daysLeft} días para tu fecha límite`,
        text: `Fecha de pago: ${nextDue.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}. Aún tienes tiempo de planear.`,
      });
    }
  }

  // Pay full vs min
  if (spend > 0) {
    recommendations.push({
      icon: '💰', color: '#10B981',
      title: `Paga total para evitar intereses`,
      text: `Pagando ${formatCurrency(spend, currency)} ANTES de la fecha límite, NO te cobrarán intereses. ¡Esta es siempre la mejor opción si puedes!`,
    });
  }

  // Min payment trap
  if (minPay > 0 && rate > 0 && isFinite(monthsMin) && monthsMin > 12) {
    recommendations.push({
      icon: '⚠️', color: '#EF4444',
      title: `Trampa del pago mínimo`,
      text: `Si solo pagas el mínimo (${formatCurrency(minPay, currency)}/mes), tardarás ${monthsMin} meses (${(monthsMin/12).toFixed(1)} años) y pagarás ${formatCurrency(interestMin, currency)} de SOLO INTERESES.`,
    });
  }

  // Suggested aggressive payment
  if (spend > 0 && rate > 0) {
    const targetMonths = 6;
    const aggressivePayment = Math.ceil(spend / targetMonths + (spend * (rate/12/100)));
    if (aggressivePayment > minPay) {
      const months6 = calcMonthsToPayoff(spend, rate, aggressivePayment);
      const interest6 = calcTotalInterest(spend, rate, aggressivePayment);
      recommendations.push({
        icon: '🎯', color: '#3B82F6',
        title: `Plan agresivo: pagar en 6 meses`,
        text: `Si pagas ${formatCurrency(aggressivePayment, currency)}/mes, sales en ${months6} meses con solo ${formatCurrency(interest6, currency)} en intereses.`,
      });
    }
  }

  // Utilization warning
  if (utilization >= 80) {
    recommendations.push({
      icon: '📉', color: '#EF4444',
      title: `Utilización muy alta: ${utilization.toFixed(0)}%`,
      text: `Estás usando ${utilization.toFixed(0)}% de tu límite. Esto daña tu score crediticio. Trata de mantenerla por debajo del 30%.`,
    });
  } else if (utilization >= 30) {
    recommendations.push({
      icon: '🟡', color: '#EAB308',
      title: `Utilización: ${utilization.toFixed(0)}%`,
      text: `Estás usando ${utilization.toFixed(0)}% de tu límite. Lo ideal es mantenerla por debajo del 30% para un buen score.`,
    });
  } else if (utilization > 0) {
    recommendations.push({
      icon: '✅', color: '#10B981',
      title: `Utilización saludable: ${utilization.toFixed(0)}%`,
      text: `Estás usando ${utilization.toFixed(0)}% de tu límite — esto es muy bueno para tu score crediticio.`,
    });
  }

  return (
    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
        💡 Recomendaciones
      </div>
      {recommendations.map((r, i) => (
        <div key={i} style={{ background: '#0F172A', borderLeft: `3px solid ${r.color}`, borderRadius: '0.375rem', padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.875rem' }}>{r.icon}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: r.color }}>{r.title}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.5 }}>{r.text}</p>
        </div>
      ))}
    </div>
  );
}

function DebtCard({ debt, onEdit, onDelete, currency }) {
  const isCard = debt.kind === 'credit_card';
  const balance = Number(isCard ? (debt.currentSpend ?? debt.balance) : debt.balance);
  const rate = Number(debt.annualRate);
  const actual = Number(debt.actualPayment || debt.minPayment);
  const minPay = Number(debt.minPayment);
  const startBal = Number(debt.startBalance) || balance;
  const limit = Number(debt.creditLimit) || 0;

  const months = calcMonthsToPayoff(balance, rate, actual);
  const totalInterest = calcTotalInterest(balance, rate, actual);
  const debtFreeDate = calcDebtFreeDate(balance, rate, actual);
  const pctPaid = startBal > 0 ? Math.min(100, ((startBal - balance) / startBal) * 100) : 0;
  const utilization = limit > 0 ? (balance / limit) * 100 : 0;

  const rateColor = rate > 30 ? '#EF4444' : rate > 15 ? '#EAB308' : '#10B981';
  const rateLabel = rate > 30 ? '🔴 Muy Alta' : rate > 15 ? '🟡 Alta' : '🟢 Manejable';

  return (
    <div className="card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>{debt.name}</h3>
            <span className="badge" style={{ fontSize: '0.65rem', background: isCard ? 'rgba(139,92,246,0.15)' : 'rgba(100,116,139,0.15)', color: isCard ? '#a78bfa' : '#94A3B8', border: `1px solid ${isCard ? 'rgba(139,92,246,0.3)' : 'rgba(100,116,139,0.3)'}` }}>
              {isCard ? '💳 Tarjeta' : '💰 Préstamo'}
            </span>
          </div>
          {debt.lender && <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>{debt.lender}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <span className="badge" style={{ background: `${rateColor}20`, color: rateColor, border: `1px solid ${rateColor}40`, fontSize: '0.7rem' }}>{rateLabel}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(debt)}>✏️</button>
          <button className="btn btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={() => onDelete(debt.id)}>🗑️</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
          <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>{isCard ? 'Saldo Gastado' : 'Saldo Actual'}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f87171' }}>{formatCurrency(balance, currency)}</div>
        </div>
        <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
          <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Tasa APR</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{rate}%</div>
        </div>
        <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
          <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Pago Mínimo</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{formatCurrency(minPay, currency)}</div>
        </div>

        {isCard && limit > 0 && (
          <>
            <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Límite</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{formatCurrency(limit, currency)}</div>
            </div>
            <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Disponible</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10B981' }}>{formatCurrency(Math.max(0, limit - balance), currency)}</div>
            </div>
            <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Utilización</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: utilization > 80 ? '#f87171' : utilization > 30 ? '#fbbf24' : '#10B981' }}>{utilization.toFixed(0)}%</div>
            </div>
          </>
        )}

        {!isCard && (
          <>
            <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Pago Real</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10B981' }}>{formatCurrency(actual, currency)}</div>
            </div>
            <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Meses a Pagar</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isFinite(months) ? 'white' : '#f87171' }}>{isFinite(months) ? months : '∞'}</div>
            </div>
            <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Interés Total</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f87171' }}>{isFinite(totalInterest) ? formatCurrency(totalInterest, currency) : '∞'}</div>
            </div>
          </>
        )}
      </div>

      {!isCard && debtFreeDate && (
        <p style={{ margin: '0 0 0.625rem', fontSize: '0.8rem', color: '#94A3B8' }}>
          📅 Libre de deuda: <strong style={{ color: '#10B981' }}>{debtFreeDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</strong>
        </p>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{isCard ? 'Utilización del límite' : 'Progreso pagado'}</span>
          <span style={{ fontSize: '0.75rem', color: isCard ? (utilization > 80 ? '#f87171' : utilization > 30 ? '#fbbf24' : '#10B981') : '#10B981', fontWeight: 600 }}>
            {isCard ? `${utilization.toFixed(0)}%` : `${pctPaid.toFixed(1)}%`}
          </span>
        </div>
        <div className="progress-track" style={{ height: '8px' }}>
          <div className="progress-fill" style={{
            width: `${isCard ? Math.min(100, utilization) : pctPaid}%`,
            height: '8px',
            background: isCard ? (utilization > 80 ? '#EF4444' : utilization > 30 ? '#EAB308' : '#10B981') : '#10B981',
          }} />
        </div>
      </div>

      {isCard && <CreditCardRecommendations debt={debt} currency={currency} />}
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

  function openEdit(d) {
    setEditItem(d);
    setForm({
      kind: d.kind || 'loan',
      name: d.name, lender: d.lender || '',
      balance: String(d.balance ?? ''),
      annualRate: String(d.annualRate ?? ''),
      minPayment: String(d.minPayment ?? ''),
      actualPayment: String(d.actualPayment ?? d.minPayment ?? ''),
      startBalance: String(d.startBalance ?? d.balance ?? ''),
      creditLimit: String(d.creditLimit ?? ''),
      currentSpend: String(d.currentSpend ?? d.balance ?? ''),
      statementDate: d.statementDate || '',
      dueDate: d.dueDate || '',
    });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const isCard = form.kind === 'credit_card';
    const balance = isCard ? Number(form.currentSpend) : Number(form.balance);
    const item = {
      id: editItem?.id || Date.now(),
      kind: form.kind,
      name: form.name,
      lender: form.lender,
      balance,
      annualRate: Number(form.annualRate),
      minPayment: Number(form.minPayment),
      actualPayment: Number(form.actualPayment || form.minPayment),
      startBalance: Number(form.startBalance || balance),
      ...(isCard && {
        creditLimit: Number(form.creditLimit),
        currentSpend: Number(form.currentSpend),
        statementDate: form.statementDate,
        dueDate: form.dueDate,
      }),
    };
    if (editItem) setDebts(prev => prev.map(d => d.id === editItem.id ? item : d));
    else setDebts(prev => [...prev, item]);
    setShowModal(false);
  }

  function handleDelete(id) {
    if (confirm('¿Eliminar esta deuda?')) setDebts(prev => prev.filter(d => d.id !== id));
  }

  const sorted = useMemo(() => {
    const copy = [...debts];
    if (sortMode === 'avalanche') return copy.sort((a, b) => Number(b.annualRate) - Number(a.annualRate));
    return copy.sort((a, b) => Number(a.balance) - Number(b.balance));
  }, [debts, sortMode]);

  const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);
  const totalMonthly = debts.reduce((s, d) => s + Number(d.actualPayment || d.minPayment || 0), 0);
  const cardCount = debts.filter(d => d.kind === 'credit_card').length;

  const latestDebtFree = useMemo(() => {
    const dates = debts.map(d => calcDebtFreeDate(Number(d.balance), Number(d.annualRate), Number(d.actualPayment || d.minPayment))).filter(Boolean);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }, [debts]);

  const isCard = form.kind === 'credit_card';

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Mis Deudas</h1>
          <p className="page-subtitle">Préstamos y tarjetas de crédito — paga estratégicamente</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Agregar Deuda</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card-flat">
          <div className="label">Deuda Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>{formatCurrency(totalDebt, currency)}</div>
        </div>
        <div className="card-flat">
          <div className="label">Pagos Mensuales</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{formatCurrency(totalMonthly, currency)}</div>
        </div>
        <div className="card-flat">
          <div className="label">Tarjetas / Préstamos</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{cardCount} / {debts.length - cardCount}</div>
        </div>
        <div className="card-flat">
          <div className="label">Libre de Deuda</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10B981' }}>
            {latestDebtFree ? latestDebtFree.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) : '—'}
          </div>
        </div>
      </div>

      {debts.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className={`btn ${sortMode === 'avalanche' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSortMode('avalanche')}>
            🏔️ Avalanche (Mayor Tasa)
          </button>
          <button className={`btn ${sortMode === 'snowball' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSortMode('snowball')}>
            ⛄ Snowball (Menor Saldo)
          </button>
        </div>
      )}

      {debts.length === 0 ? (
        <EmptyState icon="🎉" title="Sin deudas registradas" description="Agrega tu primer préstamo o tarjeta de crédito" action={
          <button className="btn btn-primary" onClick={openAdd}>Agregar Primera Deuda</button>
        } />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1rem' }}>
          {sorted.map(d => (
            <DebtCard key={d.id} debt={d} onEdit={openEdit} onDelete={handleDelete} currency={currency} />
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editItem ? 'Editar Deuda' : 'Agregar Deuda'} onClose={() => setShowModal(false)} size="lg">
          <form onSubmit={handleSubmit}>
            {/* Type selector */}
            <FormField label="Tipo de Deuda">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button type="button" onClick={() => setForm(p => ({ ...p, kind: 'loan' }))}
                  style={{
                    padding: '0.875rem', borderRadius: '0.5rem',
                    border: `2px solid ${form.kind === 'loan' ? '#10B981' : '#334155'}`,
                    background: form.kind === 'loan' ? 'rgba(16,185,129,0.1)' : '#0F172A',
                    color: form.kind === 'loan' ? '#10B981' : '#94A3B8',
                    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  }}>
                  💰 Préstamo / Crédito
                </button>
                <button type="button" onClick={() => setForm(p => ({ ...p, kind: 'credit_card' }))}
                  style={{
                    padding: '0.875rem', borderRadius: '0.5rem',
                    border: `2px solid ${form.kind === 'credit_card' ? '#10B981' : '#334155'}`,
                    background: form.kind === 'credit_card' ? 'rgba(16,185,129,0.1)' : '#0F172A',
                    color: form.kind === 'credit_card' ? '#10B981' : '#94A3B8',
                    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  }}>
                  💳 Tarjeta de Crédito
                </button>
              </div>
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FormField label="Nombre">
                <input className="input-field" placeholder={isCard ? 'e.g. Visa BBVA' : 'e.g. Préstamo auto'}
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </FormField>
              <FormField label="Banco / Lender">
                <input className="input-field" placeholder="e.g. BBVA, Banamex..." value={form.lender}
                  onChange={e => setForm(p => ({ ...p, lender: e.target.value }))} />
              </FormField>
            </div>

            {isCard ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <FormField label="Límite de Crédito">
                    <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0"
                      value={form.creditLimit} onChange={e => setForm(p => ({ ...p, creditLimit: e.target.value }))} required />
                  </FormField>
                  <FormField label="Cuánto has Gastado">
                    <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0"
                      value={form.currentSpend} onChange={e => setForm(p => ({ ...p, currentSpend: e.target.value }))} required />
                  </FormField>
                  <FormField label="Tasa Anual (APR %)">
                    <input type="number" className="input-field" placeholder="e.g. 36" step="0.01" min="0"
                      value={form.annualRate} onChange={e => setForm(p => ({ ...p, annualRate: e.target.value }))} required />
                  </FormField>
                  <FormField label="Pago Mínimo">
                    <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0"
                      value={form.minPayment} onChange={e => setForm(p => ({ ...p, minPayment: e.target.value }))} required />
                  </FormField>
                  <FormField label="Fecha de Corte">
                    <input type="date" className="input-field" value={form.statementDate}
                      onChange={e => setForm(p => ({ ...p, statementDate: e.target.value }))} />
                  </FormField>
                  <FormField label="Fecha Límite de Pago">
                    <input type="date" className="input-field" value={form.dueDate}
                      onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} required />
                  </FormField>
                </div>
                <FormField label="Pago que vas a hacer (opcional)">
                  <input type="number" className="input-field" placeholder="Si pagas más que el mínimo" step="0.01" min="0"
                    value={form.actualPayment} onChange={e => setForm(p => ({ ...p, actualPayment: e.target.value }))} />
                </FormField>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <FormField label="Saldo Actual">
                    <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0"
                      value={form.balance} onChange={e => setForm(p => ({ ...p, balance: e.target.value }))} required />
                  </FormField>
                  <FormField label="Saldo Original">
                    <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0"
                      value={form.startBalance} onChange={e => setForm(p => ({ ...p, startBalance: e.target.value }))} />
                  </FormField>
                  <FormField label="Tasa Anual (APR %)">
                    <input type="number" className="input-field" placeholder="e.g. 12.5" step="0.01" min="0"
                      value={form.annualRate} onChange={e => setForm(p => ({ ...p, annualRate: e.target.value }))} required />
                  </FormField>
                  <FormField label="Pago Mínimo">
                    <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0"
                      value={form.minPayment} onChange={e => setForm(p => ({ ...p, minPayment: e.target.value }))} required />
                  </FormField>
                </div>
                <FormField label="Pago Mensual Real">
                  <input type="number" className="input-field" placeholder="Cuánto pagas cada mes" step="0.01" min="0"
                    value={form.actualPayment} onChange={e => setForm(p => ({ ...p, actualPayment: e.target.value }))} required />
                </FormField>
              </>
            )}

            <ModalFooter>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editItem ? 'Guardar' : 'Agregar'}</button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
}
