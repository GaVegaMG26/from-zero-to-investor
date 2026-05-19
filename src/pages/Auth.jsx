import { useState } from 'react';
import { registerUser, loginUser, getUsers } from '../utils/auth';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const { login } = useAuth();
  const hasUsers = Object.keys(getUsers()).length > 0;
  const [mode, setMode] = useState(hasUsers ? 'login' : 'register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (password !== confirm) throw new Error('Las contraseñas no coinciden');
        await registerUser(username, password);
      } else {
        await loginUser(username, password);
      }
      login(username.trim().toLowerCase());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', background: 'radial-gradient(circle at 30% 20%, rgba(16,185,129,0.08), transparent 50%), #0F172A',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📈</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
            From Zero <span style={{ color: '#10B981' }}>to Investor</span>
          </h1>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
            Tu camino financiero empieza aquí
          </p>
        </div>

        <div className="card animate-fade-in" style={{ padding: '1.75rem' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', background: '#0F172A', padding: '0.25rem', borderRadius: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: 'none',
                background: mode === 'login' ? '#10B981' : 'transparent',
                color: mode === 'login' ? 'white' : '#94A3B8',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: 'none',
                background: mode === 'register' ? '#10B981' : 'transparent',
                color: mode === 'register' ? 'white' : '#94A3B8',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '0.875rem' }}>
              <label className="label">Usuario</label>
              <input
                className="input-field"
                placeholder="tu_usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div style={{ marginBottom: mode === 'register' ? '0.875rem' : '1.25rem' }}>
              <label className="label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="label">Confirmar Contraseña</label>
                <input
                  className="input-field"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f87171' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
              {loading ? '⏳ Procesando...' : mode === 'login' ? '🔓 Entrar' : '✨ Crear Cuenta'}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#94A3B8', lineHeight: 1.5 }}>
              ⚠️ <strong style={{ color: '#fbbf24' }}>Importante:</strong> tus datos se guardan solo en este navegador. <strong>No uses una contraseña real</strong> que uses en otros sitios — esto es solo para separar perfiles.
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', color: '#475569' }}>
          Educational use only · Not financial advice
        </p>
      </div>
    </div>
  );
}
