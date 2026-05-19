import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getLast6Months, getMonthKey, getCurrentMonthKey } from '../utils/formatters';
import Modal, { FormField, ModalFooter } from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

const COLORS = ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1'];

const emptyForm = () => ({
  date: new Date().toISOString().slice(0,10),
  description: '', category: 'Other', type: 'expense', amount: '',
});

export default function Transactions() {
  const { transactions, setTransactions, categories, setCategories, settings } = useApp();
  const currency = settings.currency || 'USD';
  const months = getLast6Months();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [filter, setFilter] = useState({ month: getCurrentMonthKey(), type: 'all', category: 'all' });
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState('');

  function openAdd() { setEditItem(null); setForm(emptyForm()); setShowModal(true); }
  function openEdit(t) { setEditItem(t); setForm({ ...t, amount: String(t.amount) }); setShowModal(true); }

  function handleSubmit(e) {
    e.preventDefault();
    const item = { ...form, amount: Number(form.amount), id: editItem?.id || Date.now() };
    if (editItem) {
      setTransactions(prev => prev.map(t => t.id === editItem.id ? item : t));
    } else {
      setTransactions(prev => [item, ...prev]);
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    if (confirm('Delete this transaction?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  }

  function addCategory() {
    const cat = newCat.trim();
    if (cat && !categories.includes(cat)) {
      setCategories(prev => [...prev, cat]);
    }
    setNewCat('');
  }

  function removeCategory(cat) {
    setCategories(prev => prev.filter(c => c !== cat));
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const monthMatch = !filter.month || getMonthKey(t.date) === filter.month;
      const typeMatch = filter.type === 'all' || t.type === filter.type;
      const catMatch = filter.category === 'all' || t.category === filter.category;
      return monthMatch && typeMatch && catMatch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filter]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const netFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;

  const expenseByCategory = useMemo(() => {
    const bycat = {};
    filtered.filter(t => t.type === 'expense').forEach(t => {
      bycat[t.category] = (bycat[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(bycat).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filtered]);

  const barData = useMemo(() => {
    return months.map(m => {
      const mTxns = transactions.filter(t => getMonthKey(t.date) === m.key);
      return {
        month: m.label,
        income: mTxns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expenses: mTxns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      };
    });
  }, [transactions, months]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.75rem' }}>
        <p style={{ margin: '0 0 0.375rem', fontSize: '0.75rem', color: '#94A3B8' }}>{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ margin: '0.125rem 0', fontSize: '0.8rem', color: p.fill }}>
            {p.name}: {formatCurrency(p.value, currency)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">Income & Expenses</h1>
          <p className="page-subtitle">Track every dollar in and out</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowCatModal(true)}>Manage Categories</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Transaction</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Income', value: formatCurrency(totalIncome, currency), color: '#10B981' },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses, currency), color: '#EF4444' },
          { label: 'Net Flow', value: formatCurrency(netFlow, currency), color: netFlow >= 0 ? '#10B981' : '#EF4444' },
          { label: 'Savings Rate', value: `${savingsRate.toFixed(1)}%`, color: savingsRate >= 20 ? '#10B981' : savingsRate >= 10 ? '#fbbf24' : '#f87171' },
        ].map(c => (
          <div key={c.label} className="card-flat">
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>{c.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card-flat">
          <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8' }}>EXPENSES BY CATEGORY</h3>
          {expenseByCategory.length === 0 ? (
            <EmptyState icon="🍩" title="No expenses" description="Add expenses to see breakdown" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v, currency)} contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '0.5rem' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.5rem' }}>
                {expenseByCategory.slice(0, 5).map((item, i) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontSize: '0.75rem', color: '#E2E8F0' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{formatCurrency(item.value, currency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="card-flat">
          <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8' }}>6-MONTH OVERVIEW</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="income" name="Income" fill="#10B981" radius={[3,3,0,0]} maxBarSize={32} />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[3,3,0,0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select className="select-field" style={{ width: 'auto', flex: '1', minWidth: '140px' }}
          value={filter.month} onChange={e => setFilter(p => ({ ...p, month: e.target.value }))}>
          <option value="">All Months</option>
          {months.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <select className="select-field" style={{ width: 'auto', flex: '1', minWidth: '120px' }}
          value={filter.type} onChange={e => setFilter(p => ({ ...p, type: e.target.value }))}>
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select className="select-field" style={{ width: 'auto', flex: '1', minWidth: '140px' }}
          value={filter.category} onChange={e => setFilter(p => ({ ...p, category: e.target.value }))}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Transactions table */}
      <div className="card-flat" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="📋" title="No transactions found" description="Add a transaction or adjust your filters" action={
            <button className="btn btn-primary btn-sm" onClick={openAdd}>Add Transaction</button>
          } />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Date', 'Description', 'Category', 'Type', 'Amount', ''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #1E293B' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'white', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-gray">{t.category}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${t.type === 'income' ? 'badge-green' : 'badge-red'}`}>
                        {t.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: t.type === 'income' ? '#10B981' : '#f87171', whiteSpace: 'nowrap' }}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} title="Edit">✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t.id)} title="Delete" style={{ color: '#f87171' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <Modal title={editItem ? 'Edit Transaction' : 'Add Transaction'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <FormField label="Date">
              <input type="date" className="input-field" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            </FormField>
            <FormField label="Description">
              <input className="input-field" placeholder="What was this for?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FormField label="Type">
                <select className="select-field" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </FormField>
              <FormField label="Category">
                <select className="select-field" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Amount">
              <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
            </FormField>
            <ModalFooter>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Transaction'}</button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <Modal title="Manage Categories" onClose={() => setShowCatModal(false)}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input className="input-field" placeholder="New category name..." value={newCat} onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())} />
            <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={addCategory}>Add</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
            {categories.map(cat => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#334155', borderRadius: '9999px', padding: '0.25rem 0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#E2E8F0' }}>{cat}</span>
                <button onClick={() => removeCategory(cat)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0, fontSize: '0.75rem', lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
          <ModalFooter>
            <button className="btn btn-primary" onClick={() => setShowCatModal(false)}>Done</button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
