import { useEffect } from 'react';

export default function Modal({ title, onClose, children, size = 'md' }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const maxWidths = { sm: '380px', md: '480px', lg: '600px', xl: '720px' };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: maxWidths[size] || maxWidths.md }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.25rem 0' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0.25rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: '1rem 1.25rem 1.25rem' }}>{children}</div>
      </div>
    </div>
  );
}

export function FormField({ label, children, error }) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</p>}
    </div>
  );
}

export function ModalFooter({ children }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #334155', marginTop: '1rem' }}>
      {children}
    </div>
  );
}
