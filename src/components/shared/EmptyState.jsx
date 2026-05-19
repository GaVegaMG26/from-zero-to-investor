export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '3rem 1rem', textAlign: 'center',
      gap: '0.75rem',
    }}>
      <div style={{ fontSize: '3rem', lineHeight: 1 }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#E2E8F0' }}>{title}</h3>
      {description && <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B', maxWidth: '300px' }}>{description}</p>}
      {action && <div style={{ marginTop: '0.5rem' }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '2rem', textAlign: 'center', gap: '0.75rem',
    }}>
      <div style={{ fontSize: '2.5rem' }}>⚠️</div>
      <p style={{ margin: 0, color: '#f87171', fontSize: '0.875rem' }}>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button>
      )}
    </div>
  );
}
