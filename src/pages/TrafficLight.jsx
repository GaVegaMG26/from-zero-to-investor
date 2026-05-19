import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { useApp } from '../context/AppContext';
import { calcTrafficLight, calcFinancialScore } from '../utils/calculations';
import { formatCurrency } from '../utils/formatters';

const ZONES = {
  red: {
    name: '🔴 High Risk Zone',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    message: (inputs) => {
      const reasons = [];
      if (Number(inputs.highestRate) > 15) reasons.push(`high-interest debt at ${inputs.highestRate}% APR`);
      if (Number(inputs.income) - Number(inputs.expenses) < 0) reasons.push('monthly expenses exceed income');
      if (Number(inputs.fundMonths) === 0) reasons.push('no emergency fund');
      return `You're in the Red Zone due to ${reasons.join(', ')}. Focus on stabilizing your finances before considering investments.`;
    },
    actions: [
      '🚨 Stop all non-essential spending immediately',
      '💳 Contact lenders to negotiate lower interest rates',
      '💰 Build any emergency cushion — even $500 helps',
      '📊 Create a strict zero-based budget',
      '🏃 Consider additional income sources (freelance, part-time)',
    ],
  },
  yellow: {
    name: '🟡 Building Zone',
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.3)',
    message: (inputs) => {
      const reasons = [];
      if (Number(inputs.fundMonths) < 3) reasons.push(`emergency fund covers only ${inputs.fundMonths} month(s)`);
      const sr = inputs.income > 0 ? ((inputs.income - inputs.expenses) / inputs.income * 100).toFixed(1) : 0;
      if (Number(sr) < 15) reasons.push(`savings rate of ${sr}% (target: 15%+)`);
      return `You're making progress! Still working on: ${reasons.join(' and ')}. You're close to investor-ready status.`;
    },
    actions: [
      '🏦 Automate transfers to emergency fund every payday',
      '📈 Aim to increase savings rate to 15%+',
      '💳 Continue paying off remaining debt aggressively',
      '📚 Learn about index funds while you build your fund',
      '🎯 Set a specific date to reach 3-month fund goal',
    ],
  },
  green: {
    name: '🟢 Investor Ready!',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.3)',
    message: () => 'Congratulations! You have a positive cash flow, manageable debt, a solid emergency fund, and a healthy savings rate. You have the financial foundation to start building long-term wealth through investing.',
    actions: [
      '📈 Start with low-cost index funds (S&P 500 ETFs)',
      '💼 Maximize tax-advantaged accounts (401k, IRA)',
      '🔄 Keep investing consistently regardless of market',
      '📊 Research individual stocks with our Stock Analyzer',
      '🎯 Define your investment risk tolerance and time horizon',
    ],
  },
};

function ScoreGauge({ score }) {
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#EAB308' : '#EF4444';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg width="140" height="80" viewBox="0 0 140 80">
          <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
          <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 188} 188`} style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', bottom: 0, width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 900, color }}>{score}</span>
          <span style={{ fontSize: '0.875rem', color: '#64748B' }}>/100</span>
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>Financial Health Score</div>
    </div>
  );
}

export default function TrafficLight() {
  const { tlInputs, setTlInputs, tlHistory, setTlHistory, settings } = useApp();
  const currency = settings.currency || 'USD';
  const [form, setForm] = useState({ ...tlInputs });
  const [saved, setSaved] = useState(false);

  const income = Number(form.income) || 0;
  const expenses = Number(form.expenses) || 0;
  const highestRate = Number(form.highestRate) || 0;
  const fundMonths = Number(form.fundMonths) || 0;

  const netFlow = income - expenses;
  const savingsRate = income > 0 ? (netFlow / income) * 100 : 0;
  const color = calcTrafficLight({ highestRate, netFlow, fundMonths, savingsRate });
  const score = calcFinancialScore({ savingsRate, fundMonths, highestRate, netFlow });

  const zone = ZONES[color];
  const historyChartData = tlHistory.slice(-12).map(h => ({
    date: h.date.slice(0, 7),
    color: h.color,
    score: h.score,
  }));
  const zoneColors = { red: '#EF4444', yellow: '#EAB308', green: '#10B981' };

  function handleSave() {
    const entry = {
      date: new Date().toISOString(),
      color, score, income: Number(form.income), expenses: Number(form.expenses),
      highestRate: Number(form.highestRate), fundMonths: Number(form.fundMonths),
    };
    setTlInputs({ ...form });
    setTlHistory(prev => {
      const today = entry.date.slice(0, 7);
      const filtered = prev.filter(h => h.date.slice(0, 7) !== today);
      return [...filtered, entry].slice(-24);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const indicators = [
    { label: 'Net Cash Flow', value: formatCurrency(netFlow, currency), sub: netFlow >= 0 ? 'Positive ✓' : 'Negative ✗', color: netFlow >= 0 ? '#10B981' : '#EF4444', pass: netFlow >= 0 },
    { label: 'Savings Rate', value: `${savingsRate.toFixed(1)}%`, sub: savingsRate >= 15 ? 'On target ✓' : 'Below 15% target', color: savingsRate >= 15 ? '#10B981' : savingsRate >= 5 ? '#EAB308' : '#EF4444', pass: savingsRate >= 15 },
    { label: 'Emergency Fund', value: `${fundMonths} months`, sub: fundMonths >= 3 ? 'Covered ✓' : 'Below 3 months', color: fundMonths >= 3 ? '#10B981' : '#EAB308', pass: fundMonths >= 3 },
    { label: 'Highest Debt Rate', value: `${highestRate}%`, sub: highestRate <= 15 ? 'Manageable ✓' : 'High rate!', color: highestRate <= 15 ? '#10B981' : highestRate <= 30 ? '#EAB308' : '#EF4444', pass: highestRate <= 15 },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Investor Traffic Light</h1>
        <p className="page-subtitle">Your real-time readiness to invest — updated every month</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>
        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-flat">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>YOUR MONTHLY NUMBERS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label className="label">Monthly Income</label>
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0"
                  value={form.income} onChange={e => setForm(p => ({ ...p, income: e.target.value }))} />
              </div>
              <div>
                <label className="label">Monthly Expenses</label>
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0"
                  value={form.expenses} onChange={e => setForm(p => ({ ...p, expenses: e.target.value }))} />
              </div>
              <div>
                <label className="label">Highest Debt Rate (%)</label>
                <input type="number" className="input-field" placeholder="e.g. 24.99" step="0.01" min="0" max="200"
                  value={form.highestRate} onChange={e => setForm(p => ({ ...p, highestRate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Emergency Fund (months)</label>
                <input type="number" className="input-field" placeholder="e.g. 2.5" step="0.1" min="0"
                  value={form.fundMonths} onChange={e => setForm(p => ({ ...p, fundMonths: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '1rem', padding: '0.75rem', background: '#0F172A', borderRadius: '0.5rem' }}>
              <div>
                <div className="label">Net Flow</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: netFlow >= 0 ? '#10B981' : '#EF4444' }}>{formatCurrency(netFlow, currency)}</div>
              </div>
              <div>
                <div className="label">Savings Rate</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: savingsRate >= 15 ? '#10B981' : savingsRate >= 5 ? '#EAB308' : '#EF4444' }}>{savingsRate.toFixed(1)}%</div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={handleSave}>
              {saved ? '✓ Saved!' : '💾 Save & Update Status'}
            </button>
          </div>

          {/* Indicators */}
          <div className="card-flat">
            <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>HEALTH INDICATORS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {indicators.map(ind => (
                <div key={ind.label} style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.75rem', border: `1px solid ${ind.pass ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  <div className="label">{ind.label}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: ind.color }}>{ind.value}</div>
                  <div style={{ fontSize: '0.7rem', color: ind.color, marginTop: '0.125rem' }}>{ind.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Zone info */}
          <div style={{ background: zone.bg, border: `1px solid ${zone.border}`, borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.625rem', fontSize: '1rem', fontWeight: 700, color: zone.color }}>{zone.name}</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.6 }}>
              {typeof zone.message === 'function' ? zone.message({ income, expenses, highestRate, fundMonths }) : zone.message}
            </p>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: zone.color, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Plan:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {zone.actions.map((action, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: '#E2E8F0' }}>{action}</div>
                ))}
              </div>
            </div>
            {color === 'green' && (
              <Link to="/stock-analyzer" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                📈 Analyze Your First Stock →
              </Link>
            )}
          </div>
        </div>

        {/* Traffic Light */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', minWidth: '200px' }}>
          <div style={{
            background: '#0D1526', borderRadius: '2rem', padding: '1.25rem',
            border: '3px solid #334155', display: 'flex', flexDirection: 'column',
            gap: '1rem', alignItems: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}>
            {['red', 'yellow', 'green'].map(l => (
              <div key={l}
                className={l === color ? `animate-pulse-${l}` : ''}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: l === color ? zoneColors[l] : '#0F172A',
                  border: `2px solid ${l === color ? zoneColors[l] : '#1E293B'}`,
                  opacity: l === color ? 1 : 0.2,
                  transition: 'all 0.5s',
                }}
              />
            ))}
          </div>
          <ScoreGauge score={score} />
        </div>
      </div>

      {/* History chart */}
      {historyChartData.length > 1 && (
        <div className="card-flat" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>HEALTH SCORE HISTORY</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={historyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '0.5rem' }} labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#10B981' }} />
              <Bar dataKey="score" name="Score" radius={[4,4,0,0]} maxBarSize={40}>
                {historyChartData.map((entry, i) => (
                  <Cell key={i} fill={zoneColors[entry.color] || '#10B981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
