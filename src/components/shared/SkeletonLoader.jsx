export function Skeleton({ width = '100%', height = '1rem', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: '0.375rem' }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card-flat" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Skeleton height="0.75rem" width="40%" />
      <Skeleton height="1.75rem" width="60%" />
      <Skeleton height="0.625rem" width="30%" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '0.875rem 1rem' }}>
          <Skeleton height="0.875rem" width={i === 0 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 200 }) {
  return (
    <div className="skeleton" style={{ width: '100%', height, borderRadius: '0.5rem' }} />
  );
}

export default function SkeletonLoader({ rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
