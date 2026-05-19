import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal, { FormField, ModalFooter } from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

const GOAL_TYPES = ['Savings', 'Debt Payoff', 'Investment', 'Asset', 'Other'];
const PRIORITIES = ['High', 'Medium', 'Low'];

function goalStatus(goal) {
  const pct = Number(goal.current) / Number(goal.target);
  if (pct >= 1) return { label: '✅ Completed', color: '#10B981', bg: 'rgba(16,185,129,0.1)' };
  const now = new Date();
  const deadline = new Date(goal.deadline);
  const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (pct < 0.1 && daysLeft < 180) return { label: '🔴 Starting', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' };
  const remaining = Number(goal.target) - Number(goal.current);
  const monthsLeft = daysLeft / 30;
  const needed = remaining / Math.max(1, monthsLeft);
  if (daysLeft < 30 && pct < 0.9) return { label: '🔴 Starting', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' };
  if (pct >= 0.5) return { label: '🟢 On Track', color: '#10B981', bg: 'rgba(16,185,129,0.1)' };
  if (pct >= 0.25) return { label: '🟡 At Risk', color: '#EAB308', bg: 'rgba(234,179,8,0.1)' };
  return { label: '🔴 Starting', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' };
}

const priorityColors = { High: '#EF4444', Medium: '#EAB308', Low: '#10B981' };
const progressColors = (pct) => pct >= 75 ? '#10B981' : pct >= 40 ? '#EAB308' : pct >= 10 ? '#F97316' : '#EF4444';

const emptyForm = () => ({
  name: '', type: 'Savings', target: '', current: '', deadline: '',
  monthlyContribution: '', priority: 'Medium', notes: '',
});

function GoalCard({ goal, onEdit, onDelete, currency }) {
  const pct = Math.min(100, (Number(goal.current) / Number(goal.target)) * 100);
  const remaining = Math.max(0, Number(goal.target) - Number(goal.current));
  const status = goalStatus(goal);
  const now = new Date();
  const deadline = new Date(goal.deadline);
  const monthsLeft = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24 * 30)));
  const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : 0;

  return (
    <div className="card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>{goal.name}</h3>
            <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{goal.type}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: priorityColors[goal.priority] || '#94A3B8', background: `${priorityColors[goal.priority]}20`, padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>
              {goal.priority}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', display: 'inline-block', background: status.bg, color: status.color, fontWeight: 600 }}>
            {status.label}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(goal)}>✏️</button>
          <button className="btn btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={() => onDelete(goal.id)}>🗑️</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.875rem' }}>
        {[
          { label: 'Target', value: formatCurrency(goal.target, currency) },
          { label: 'Saved', value: formatCurrency(goal.current, currency), color: '#10B981' },
          { label: 'Remaining', value: formatCurrency(remaining, currency), color: '#f87171' },
        ].map(item => (
          <div key={item.label} style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
            <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>{item.label}</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: item.color || 'white' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Progress</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: progressColors(pct) }}>{pct.toFixed(1)}%</span>
        </div>
        <div className="progress-track" style={{ height: '8px' }}>
          <div className="progress-fill" style={{ width: `${pct}%`, height: '8px', background: progressColors(pct) }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B' }}>
        {goal.deadline && <span>📅 {formatDate(goal.deadline)} ({monthsLeft}mo left)</span>}
        {monthlyNeeded > 0 && pct < 100 && <span>📆 {formatCurrency(monthlyNeeded, currency)}/mo needed</span>}
      </div>
    </div>
  );
}

export default function Goals() {
  const { goals, setGoals, settings } = useApp();
  const currency = settings.currency || 'USD';
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());

  function openAdd() { setEditItem(null); setForm(emptyForm()); setShowModal(true); }
  function openEdit(g) {
    setEditItem(g);
    setForm({ ...g, target: String(g.target), current: String(g.current), monthlyContribution: String(g.monthlyContribution || '') });
    setShowModal(true);
  }
  function handleDelete(id) {
    if (confirm('Delete this goal?')) setGoals(prev => prev.filter(g => g.id !== id));
  }
  function handleSubmit(e) {
    e.preventDefault();
    const item = { ...form, id: editItem?.id || Date.now(), target: Number(form.target), current: Number(form.current), monthlyContribution: Number(form.monthlyContribution) || 0 };
    if (editItem) setGoals(prev => prev.map(g => g.id === editItem.id ? item : g));
    else setGoals(prev => [...prev, item]);
    setShowModal(false);
  }

  const sorted = [...goals].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return (order[a.priority] || 1) - (order[b.priority] || 1);
  });

  const totalTarget = goals.reduce((s, g) => s + Number(g.target), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.current), 0);
  const completed = goals.filter(g => Number(g.current) >= Number(g.target)).length;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Financial Goals</h1>
          <p className="page-subtitle">Set targets, track progress, achieve freedom</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Goal</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Saved', value: formatCurrency(totalSaved, currency), color: '#10B981' },
          { label: 'Total Target', value: formatCurrency(totalTarget, currency), color: 'white' },
          { label: 'Goals', value: `${goals.length} total`, color: 'white' },
          { label: 'Completed', value: `${completed} / ${goals.length}`, color: '#10B981' },
        ].map(c => (
          <div key={c.label} className="card-flat">
            <div className="label">{c.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {goals.length === 0 ? (
        <EmptyState icon="🎯" title="No goals yet" description="Create your first financial goal and start your journey" action={
          <button className="btn btn-primary" onClick={openAdd}>Create First Goal</button>
        } />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
          {sorted.map(g => (
            <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={handleDelete} currency={currency} />
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editItem ? 'Edit Goal' : 'Add Goal'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <FormField label="Goal Name">
              <input className="input-field" placeholder="e.g. House Down Payment" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FormField label="Type">
                <select className="select-field" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {GOAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Priority">
                <select className="select-field" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  {PRIORITIES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                </select>
              </FormField>
              <FormField label="Target Amount">
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0" value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} required />
              </FormField>
              <FormField label="Current Amount">
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0" value={form.current} onChange={e => setForm(p => ({ ...p, current: e.target.value }))} required />
              </FormField>
              <FormField label="Deadline">
                <input type="date" className="input-field" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </FormField>
              <FormField label="Monthly Contribution">
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0" value={form.monthlyContribution} onChange={e => setForm(p => ({ ...p, monthlyContribution: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Notes (optional)">
              <input className="input-field" placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </FormField>
            <ModalFooter>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Goal'}</button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
}
