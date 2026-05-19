import { useState } from 'react';
import { useApp } from '../context/AppContext';

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'MXN', label: 'MXN — Mexican Peso ($)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'BRL', label: 'BRL — Brazilian Real (R$)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export default function Settings() {
  const { settings, setSettings, clearAllData, transactions, debts, fundEntries, goals, portfolio, watchlist } = useApp();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [saved, setSaved] = useState(false);

  function updateSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      transactions: JSON.parse(localStorage.getItem('fzti_transactions') || '[]'),
      debts: JSON.parse(localStorage.getItem('fzti_debts') || '[]'),
      fund_entries: JSON.parse(localStorage.getItem('fzti_fund_entries') || '[]'),
      fund_config: JSON.parse(localStorage.getItem('fzti_fund_config') || '{}'),
      goals: JSON.parse(localStorage.getItem('fzti_goals') || '[]'),
      traffic_light_history: JSON.parse(localStorage.getItem('fzti_traffic_light_history') || '[]'),
      portfolio: JSON.parse(localStorage.getItem('fzti_portfolio') || '[]'),
      watchlist: JSON.parse(localStorage.getItem('fzti_watchlist') || '[]'),
      settings: JSON.parse(localStorage.getItem('fzti_settings') || '{}'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `from-zero-to-investor-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const keys = ['transactions', 'debts', 'fund_entries', 'fund_config', 'goals', 'traffic_light_history', 'portfolio', 'watchlist', 'settings'];
        keys.forEach(k => {
          if (data[k] !== undefined) {
            localStorage.setItem(`fzti_${k}`, JSON.stringify(data[k]));
          }
        });
        setImportStatus('✅ Data imported successfully! Please refresh the page.');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setImportStatus('❌ Invalid file format. Please use a valid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const totalItems = transactions.length + debts.length + fundEntries.length + goals.length + portfolio.length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your app, API keys, and preferences</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
        {/* API Key */}
        <div className="card-flat">
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>🔑 Finnhub API Key</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748B' }}>
            Required for stock data. Free at{' '}
            <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" style={{ color: '#10B981' }}>
              finnhub.io/register
            </a>{' '}
            — 60 calls/min, no credit card.
          </p>
          <div style={{ position: 'relative' }}>
            <input
              className="input-field"
              type={showApiKey ? 'text' : 'password'}
              placeholder="Enter your Finnhub API key..."
              value={settings.apiKey || ''}
              onChange={e => updateSetting('apiKey', e.target.value)}
              style={{ paddingRight: '3rem' }}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '1rem' }}
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
          </div>
          {settings.apiKey && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '0.75rem', color: '#10B981' }}>API key is set</span>
            </div>
          )}
        </div>

        {/* Currency */}
        <div className="card-flat">
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>💱 Currency</h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#64748B' }}>Choose how amounts are displayed throughout the app</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => updateSetting('currency', c.code)}
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${settings.currency === c.code ? '#10B981' : '#334155'}`,
                  background: settings.currency === c.code ? 'rgba(16,185,129,0.1)' : '#0F172A',
                  color: settings.currency === c.code ? '#10B981' : '#94A3B8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Management */}
        <div className="card-flat">
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>📦 Data Management</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748B' }}>
            {totalItems} items stored locally · All data stays on your device
          </p>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={exportData}>
              📥 Export JSON
            </button>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              📤 Import JSON
              <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
            </label>
            <button
              className="btn btn-danger"
              onClick={() => setShowClearConfirm(true)}
            >
              🗑️ Clear All Data
            </button>
          </div>
          {importStatus && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: importStatus.startsWith('✅') ? '#10B981' : '#f87171' }}>
              {importStatus}
            </p>
          )}
        </div>

        {/* App Info */}
        <div className="card-flat" style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#10B981' }}>📈 From Zero to Investor</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {[
              ['Version', '1.0.0'],
              ['Data Storage', 'Local (localStorage only)'],
              ['Backend', 'None — fully client-side'],
              ['Stock Data', 'Finnhub API (free tier)'],
              ['Framework', 'React 18 + Vite + Tailwind CSS v4'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '0.3rem', borderBottom: '1px solid #1E293B' }}>
                <span style={{ color: '#64748B' }}>{k}</span>
                <span style={{ color: '#94A3B8' }}>{v}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.7rem', color: '#475569', lineHeight: 1.6 }}>
            Educational tool only. Not financial advice. Always consult a qualified financial advisor before making investment decisions.
          </p>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowClearConfirm(false)}>
          <div className="modal-box" style={{ maxWidth: '400px' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700, color: '#f87171' }}>Clear All Data?</h3>
              <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.6 }}>
                This will permanently delete all {totalItems} items including transactions, debts, goals, and portfolio data. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setShowClearConfirm(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => { clearAllData(); setShowClearConfirm(false); }}>
                  Yes, Clear Everything
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
