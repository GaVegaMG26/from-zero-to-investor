import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'MXN', label: 'MXN — Peso Mexicano' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'BRL', label: 'BRL — Real Brasileño' },
  { code: 'GBP', label: 'GBP — Libra Esterlina' },
];

const STEPS = [
  { id: 'welcome', title: '¡Bienvenido!', icon: '👋' },
  { id: 'currency', title: 'Tu Moneda', icon: '💱' },
  { id: 'income', title: 'Tus Ingresos', icon: '💵' },
  { id: 'expenses', title: 'Tus Gastos', icon: '💸' },
  { id: 'fund', title: 'Fondo de Emergencia', icon: '🛡️' },
  { id: 'debt', title: 'Deuda', icon: '💳' },
  { id: 'done', title: '¡Listo!', icon: '🎉' },
];

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const { setTlInputs, setFundConfig, settings, setSettings } = useApp();

  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    currency: 'USD',
    income: '',
    expenses: '',
    fundMonths: '',
    highestRate: '',
  });

  function next() { setStep(s => Math.min(s + 1, STEPS.length - 1)); }
  function prev() { setStep(s => Math.max(0, s - 1)); }

  function finish() {
    setSettings(prev => ({ ...prev, currency: data.currency }));
    setTlInputs({
      income: Number(data.income) || 0,
      expenses: Number(data.expenses) || 0,
      fundMonths: Number(data.fundMonths) || 0,
      highestRate: Number(data.highestRate) || 0,
    });
    setFundConfig({ monthlyExpenses: Number(data.expenses) || 0 });
    completeOnboarding();
  }

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  // Validation
  const canProceed = (() => {
    switch (currentStep.id) {
      case 'income': return Number(data.income) > 0;
      case 'expenses': return Number(data.expenses) >= 0;
      case 'fund': return data.fundMonths !== '';
      case 'debt': return data.highestRate !== '';
      default: return true;
    }
  })();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', background: 'radial-gradient(circle at 70% 30%, rgba(16,185,129,0.08), transparent 50%), #0F172A',
    }}>
      <div style={{ width: '100%', maxWidth: '500px' }}>
        {/* Progress bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
              Paso {step + 1} de {STEPS.length}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="progress-track" style={{ height: '6px' }}>
            <div className="progress-fill" style={{ width: `${progress}%`, height: '6px', background: '#10B981' }} />
          </div>
        </div>

        <div className="card animate-fade-in" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{currentStep.icon}</div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
              {currentStep.title}
            </h2>
          </div>

          {/* Welcome */}
          {currentStep.id === 'welcome' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1rem', color: '#E2E8F0', lineHeight: 1.6, marginBottom: '1rem' }}>
                Hola <strong style={{ color: '#10B981' }}>@{user}</strong>, vamos a conocer tu situación financiera.
              </p>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.6 }}>
                Te haremos 5 preguntas rápidas para personalizar tu experiencia. Todo se guarda solo en tu navegador.
              </p>
            </div>
          )}

          {/* Currency */}
          {currentStep.id === 'currency' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', textAlign: 'center', marginBottom: '1.25rem' }}>
                ¿En qué moneda manejas tu dinero?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {CURRENCIES.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setData(d => ({ ...d, currency: c.code }))}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: '0.5rem',
                      border: `2px solid ${data.currency === c.code ? '#10B981' : '#334155'}`,
                      background: data.currency === c.code ? 'rgba(16,185,129,0.1)' : '#0F172A',
                      color: data.currency === c.code ? '#10B981' : '#E2E8F0',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    {data.currency === c.code ? '✓ ' : ''}{c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Income */}
          {currentStep.id === 'income' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', textAlign: 'center', marginBottom: '1.25rem' }}>
                ¿Cuánto ganas en total al mes?<br />
                <span style={{ fontSize: '0.75rem' }}>(Sueldo + otros ingresos, ya descontando impuestos)</span>
              </p>
              <input
                type="number"
                className="input-field"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={data.income}
                onChange={e => setData(d => ({ ...d, income: e.target.value }))}
                style={{ fontSize: '1.5rem', textAlign: 'center', padding: '1rem' }}
                autoFocus
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#475569', textAlign: 'center' }}>
                {data.currency} por mes
              </p>
            </div>
          )}

          {/* Expenses */}
          {currentStep.id === 'expenses' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', textAlign: 'center', marginBottom: '1.25rem' }}>
                ¿Cuánto gastas en total al mes?<br />
                <span style={{ fontSize: '0.75rem' }}>(Renta, comida, transporte, suscripciones, etc.)</span>
              </p>
              <input
                type="number"
                className="input-field"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={data.expenses}
                onChange={e => setData(d => ({ ...d, expenses: e.target.value }))}
                style={{ fontSize: '1.5rem', textAlign: 'center', padding: '1rem' }}
                autoFocus
              />
              {data.income && data.expenses && (
                <div style={{ marginTop: '0.75rem', textAlign: 'center', padding: '0.5rem', background: '#0F172A', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Flujo neto mensual: </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: (data.income - data.expenses) >= 0 ? '#10B981' : '#EF4444' }}>
                    {(data.income - data.expenses).toFixed(2)} {data.currency}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Fund */}
          {currentStep.id === 'fund' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', textAlign: 'center', marginBottom: '1.25rem' }}>
                ¿Tu fondo de emergencia te cubre cuántos meses de gastos?<br />
                <span style={{ fontSize: '0.75rem' }}>Si no tienes nada, pon 0</span>
              </p>
              <input
                type="number"
                className="input-field"
                placeholder="0"
                step="0.1"
                min="0"
                value={data.fundMonths}
                onChange={e => setData(d => ({ ...d, fundMonths: e.target.value }))}
                style={{ fontSize: '1.5rem', textAlign: 'center', padding: '1rem' }}
                autoFocus
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#475569', textAlign: 'center' }}>
                meses de gastos cubiertos
              </p>
            </div>
          )}

          {/* Debt */}
          {currentStep.id === 'debt' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#94A3B8', textAlign: 'center', marginBottom: '1.25rem' }}>
                ¿Cuál es la tasa de interés MÁS ALTA entre tus deudas?<br />
                <span style={{ fontSize: '0.75rem' }}>Si no tienes deudas, pon 0. Si tienes tarjeta de crédito, su APR.</span>
              </p>
              <input
                type="number"
                className="input-field"
                placeholder="0"
                step="0.01"
                min="0"
                max="200"
                value={data.highestRate}
                onChange={e => setData(d => ({ ...d, highestRate: e.target.value }))}
                style={{ fontSize: '1.5rem', textAlign: 'center', padding: '1rem' }}
                autoFocus
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#475569', textAlign: 'center' }}>
                % anual (APR)
              </p>
            </div>
          )}

          {/* Done */}
          {currentStep.id === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1rem', color: '#E2E8F0', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                ¡Todo listo! Hemos creado tu perfil financiero.
              </p>
              <div style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748B' }}>Moneda:</span><span style={{ color: 'white' }}>{data.currency}</span>
                  <span style={{ color: '#64748B' }}>Ingresos:</span><span style={{ color: '#10B981' }}>{data.income} {data.currency}</span>
                  <span style={{ color: '#64748B' }}>Gastos:</span><span style={{ color: '#f87171' }}>{data.expenses} {data.currency}</span>
                  <span style={{ color: '#64748B' }}>Fondo:</span><span style={{ color: 'white' }}>{data.fundMonths} meses</span>
                  <span style={{ color: '#64748B' }}>Deuda max:</span><span style={{ color: 'white' }}>{data.highestRate}%</span>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.6 }}>
                Puedes cambiar estos valores cuando quieras desde el módulo <strong style={{ color: '#10B981' }}>Investor Traffic Light</strong>.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.75rem' }}>
            {step > 0 && step < STEPS.length - 1 && (
              <button type="button" className="btn btn-secondary" onClick={prev} style={{ flex: '0 0 auto' }}>
                ← Atrás
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={next}
                disabled={!canProceed}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {step === 0 ? 'Empezar →' : 'Siguiente →'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={finish}
                style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}
              >
                🚀 Ir al Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
