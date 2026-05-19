const CURRENCY_LOCALES = {
  USD: 'en-US',
  MXN: 'es-MX',
  EUR: 'de-DE',
  BRL: 'pt-BR',
  GBP: 'en-GB',
};

export function formatCurrency(amount, currency = 'USD') {
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function formatCompactCurrency(amount, currency = 'USD') {
  const abs = Math.abs(amount ?? 0);
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  if (abs >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatNumber(value, decimals = 2) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPercent(value, decimals = 1) {
  const n = Number(value) || 0;
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

export function formatPercentPlain(value, decimals = 1) {
  return `${(Number(value) || 0).toFixed(decimals)}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

export function formatMonthYear(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + '-01T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

export function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    });
  }
  return months;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
