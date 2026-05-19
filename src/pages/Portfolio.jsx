import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { fetchQuote } from '../utils/finnhub';
import { formatCurrency, formatPercent } from '../utils/formatters';
import Modal, { FormField, ModalFooter } from '../components/shared/Modal';
import EmptyState from '../components/shared/EmptyState';

const COLORS = ['#10B981','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1'];

function isMarketOpen() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const h = et.getHours(), m = et.getMinutes();
  const mins = h * 60 + m;
  return day >= 1 && day <= 5 && mins >= 570 && mins < 960; // 9:30am - 4:00pm ET
}

const emptyForm = () => ({
  ticker: '', shares: '', buyPrice: '', date: new Date().toISOString().slice(0, 10), notes: '',
});

export default function Portfolio() {
  const { portfolio, setPortfolio, settings } = useApp();
  const currency = settings.currency || 'USD';
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [refreshing, setRefreshing] = useState(false);

  const totalInvested = portfolio.reduce((s, p) => s + p.buyPrice * p.shares, 0);
  const totalValue = portfolio.reduce((s, p) => s + (p.currentPrice || p.buyPrice) * p.shares, 0);
  const totalPnL = totalValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const best = portfolio.length > 0 ? portfolio.reduce((b, p) => {
    const bPnL = (b.currentPrice || b.buyPrice) * b.shares - b.buyPrice * b.shares;
    const pPnL = (p.currentPrice || p.buyPrice) * p.shares - p.buyPrice * p.shares;
    return pPnL > bPnL ? p : b;
  }) : null;

  const worst = portfolio.length > 0 ? portfolio.reduce((b, p) => {
    const bPnL = (b.currentPrice || b.buyPrice) * b.shares - b.buyPrice * b.shares;
    const pPnL = (p.currentPrice || p.buyPrice) * p.shares - p.buyPrice * p.shares;
    return pPnL < bPnL ? p : b;
  }) : null;

  const refreshPrices = useCallback(async () => {
    if (!settings.apiKey || portfolio.length === 0) return;
    setRefreshing(true);
    try {
      const updated = await Promise.all(
        portfolio.map(async p => {
          try {
            const q = await fetchQuote(p.ticker, settings.apiKey);
            return { ...p, currentPrice: q.c || p.currentPrice };
          } catch {
            return p;
          }
        })
      );
      setPortfolio(updated);
    } catch {}
    setRefreshing(false);
  }, [portfolio, settings.apiKey, setPortfolio]);

  useEffect(() => {
    if (!isMarketOpen() || !settings.apiKey) return;
    refreshPrices();
    const interval = setInterval(refreshPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.apiKey]);

  function openAdd() { setEditItem(null); setForm(emptyForm()); setShowModal(true); }
  function openEdit(p) {
    setEditItem(p);
    setForm({ ticker: p.ticker, shares: String(p.shares), buyPrice: String(p.buyPrice), date: p.date || '', notes: p.notes || '' });
    setShowModal(true);
  }
  function handleDelete(id) {
    if (confirm('Remove this position?')) setPortfolio(prev => prev.filter(p => p.id !== id));
  }
  function handleSubmit(e) {
    e.preventDefault();
    const item = {
      ...form,
      id: editItem?.id || Date.now(),
      ticker: form.ticker.toUpperCase(),
      name: editItem?.name || form.ticker.toUpperCase(),
      shares: Number(form.shares),
      buyPrice: Number(form.buyPrice),
      currentPrice: editItem?.currentPrice || Number(form.buyPrice),
      signal: editItem?.signal || 'HOLD',
    };
    if (editItem) setPortfolio(prev => prev.map(p => p.id === editItem.id ? item : p));
    else setPortfolio(prev => [...prev, item]);
    setShowModal(false);
  }

  const allocationData = portfolio.map((p, i) => ({
    name: p.ticker,
    value: (p.currentPrice || p.buyPrice) * p.shares,
    color: COLORS[i % COLORS.length],
  }));

  const signalColors = { BUY: '#10B981', HOLD: '#EAB308', SELL: '#EF4444' };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.625rem' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8' }}>{payload[0].name}</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>{formatCurrency(payload[0].value, currency)}</p>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">My Portfolio</h1>
          <p className="page-subtitle">Track your investment positions and performance</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={refreshPrices} disabled={refreshing || !settings.apiKey}>
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh Prices'}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Position</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card-flat">
          <div className="label">Total Invested</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'white' }}>{formatCurrency(totalInvested, currency)}</div>
        </div>
        <div className="card-flat">
          <div className="label">Current Value</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#10B981' }}>{formatCurrency(totalValue, currency)}</div>
        </div>
        <div className="card-flat">
          <div className="label">Total P&L</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: totalPnL >= 0 ? '#10B981' : '#EF4444' }}>
            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: totalPnLPct >= 0 ? '#10B981' : '#EF4444' }}>
            {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%
          </div>
        </div>
        <div className="card-flat">
          <div className="label">Best Performer</div>
          {best ? (
            <>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{best.ticker}</div>
              <div style={{ fontSize: '0.75rem', color: '#10B981' }}>
                +{formatCurrency((best.currentPrice || best.buyPrice) * best.shares - best.buyPrice * best.shares, currency)}
              </div>
            </>
          ) : <div style={{ color: '#64748B' }}>—</div>}
        </div>
        <div className="card-flat">
          <div className="label">Worst Performer</div>
          {worst && worst !== best ? (
            <>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{worst.ticker}</div>
              <div style={{ fontSize: '0.75rem', color: '#EF4444' }}>
                {formatCurrency((worst.currentPrice || worst.buyPrice) * worst.shares - worst.buyPrice * worst.shares, currency)}
              </div>
            </>
          ) : <div style={{ color: '#64748B' }}>—</div>}
        </div>
      </div>

      {portfolio.length === 0 ? (
        <EmptyState icon="💼" title="No positions yet" description="Add your first stock position to start tracking your portfolio" action={
          <button className="btn btn-primary" onClick={openAdd}>Add First Position</button>
        } />
      ) : (
        <>
          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="card-flat">
              <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8' }}>ALLOCATION</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80}>
                    {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {allocationData.map((item, i) => {
                  const pct = totalValue > 0 ? (item.value / totalValue * 100).toFixed(1) : 0;
                  return (
                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.75rem', color: '#E2E8F0' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Positions table */}
            <div className="card-flat" style={{ overflow: 'hidden' }}>
              <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8' }}>POSITIONS</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {['Ticker', 'Shares', 'Avg Buy', 'Current', 'Invested', 'Value', 'P&L', 'Signal', ''].map(h => (
                        <th key={h} style={{ padding: '0.625rem 0.75rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(p => {
                      const invested = p.buyPrice * p.shares;
                      const value = (p.currentPrice || p.buyPrice) * p.shares;
                      const pnl = value - invested;
                      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #1E293B' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '0.75rem', fontWeight: 700, color: 'white', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {p.logo && <img src={p.logo} alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'white', padding: '2px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />}
                              {p.ticker}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94A3B8' }}>{p.shares}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94A3B8' }}>{formatCurrency(p.buyPrice, currency)}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'white' }}>{formatCurrency(p.currentPrice || p.buyPrice, currency)}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94A3B8' }}>{formatCurrency(invested, currency)}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: '#10B981' }}>{formatCurrency(value, currency)}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: pnl >= 0 ? '#10B981' : '#EF4444', whiteSpace: 'nowrap' }}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, currency)}<br />
                            <span style={{ fontSize: '0.7rem' }}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%</span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: signalColors[p.signal] || '#94A3B8', background: `${signalColors[p.signal] || '#64748B'}20`, padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>
                              {p.signal || 'HOLD'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={() => handleDelete(p.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {isMarketOpen() && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.5rem', padding: '0.625rem 1rem', marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.75rem', color: '#10B981' }}>Market Open — prices refresh every 5 minutes</span>
            </div>
          )}
        </>
      )}

      {showModal && (
        <Modal title={editItem ? 'Edit Position' : 'Add Position'} onClose={() => setShowModal(false)} size="sm">
          <form onSubmit={handleSubmit}>
            <FormField label="Ticker Symbol">
              <input className="input-field" placeholder="e.g. AAPL" value={form.ticker}
                onChange={e => setForm(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} required disabled={!!editItem} />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <FormField label="Shares">
                <input type="number" className="input-field" placeholder="0" step="0.001" min="0.001"
                  value={form.shares} onChange={e => setForm(p => ({ ...p, shares: e.target.value }))} required />
              </FormField>
              <FormField label="Buy Price">
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0.01"
                  value={form.buyPrice} onChange={e => setForm(p => ({ ...p, buyPrice: e.target.value }))} required />
              </FormField>
            </div>
            <FormField label="Date Purchased">
              <input type="date" className="input-field" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </FormField>
            <FormField label="Notes (optional)">
              <input className="input-field" placeholder="Any notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </FormField>
            <ModalFooter>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editItem ? 'Save' : 'Add Position'}</button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
}
