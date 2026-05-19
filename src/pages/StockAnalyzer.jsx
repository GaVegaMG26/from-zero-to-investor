import { useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useApp } from '../context/AppContext';
import { fetchQuote, fetchProfile, fetchMetrics, fetchCandles, fetchNews, getDateRange, getPeriodResolution } from '../utils/finnhub';
import { formatCurrency, formatCompactCurrency, formatDateTime, formatNumber, formatPercent } from '../utils/formatters';
import { calcStockScore, calcRiskScore, calc20DayMA, calcNewsSentiment, getArticleSentiment } from '../utils/calculations';
import { Skeleton, ChartSkeleton } from '../components/shared/SkeletonLoader';
import { ErrorState } from '../components/shared/EmptyState';

const PERIODS = ['1W', '1M', '3M', '6M', '1Y'];

function RiskGauge({ score }) {
  const color = score <= 3 ? '#10B981' : score <= 6 ? '#EAB308' : '#EF4444';
  const label = score <= 3 ? 'Low Risk' : score <= 6 ? 'Medium Risk' : 'High Risk';
  const pct = ((score - 1) / 9) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Risk Score</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color }}>{score}/10 — {label}</span>
      </div>
      <div style={{ position: 'relative', height: '12px', background: 'linear-gradient(90deg, #10B981, #EAB308, #EF4444)', borderRadius: '9999px' }}>
        <div style={{
          position: 'absolute', top: '-3px', left: `calc(${pct}% - 9px)`,
          width: '18px', height: '18px', borderRadius: '50%',
          background: color, border: '3px solid #0F172A',
          transition: 'left 0.5s ease',
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        <span style={{ fontSize: '0.65rem', color: '#10B981' }}>1 Low</span>
        <span style={{ fontSize: '0.65rem', color: '#EF4444' }}>10 High</span>
      </div>
    </div>
  );
}

function SignalBadge({ signal }) {
  const cfg = {
    BUY: { color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', icon: '🟢' },
    HOLD: { color: '#EAB308', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)', icon: '🟡' },
    SELL: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', icon: '🔴' },
  }[signal] || {};
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.75rem 1.5rem', borderRadius: '0.75rem',
      background: cfg.bg, border: `2px solid ${cfg.border}`,
    }}>
      <span style={{ fontSize: '1.5rem' }}>{cfg.icon}</span>
      <span style={{ fontSize: '2rem', fontWeight: 900, color: cfg.color }}>{signal}</span>
    </div>
  );
}

export default function StockAnalyzer() {
  const { settings, recentSearches, addRecentSearch, watchlist, setWatchlist, portfolio, setPortfolio } = useApp();
  const currency = settings.currency || 'USD';
  const apiKey = settings.apiKey || '';

  const [ticker, setTicker] = useState('');
  const [period, setPeriod] = useState('1M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [addToPortfolioForm, setAddToPortfolioForm] = useState(null);
  const [portfolioModal, setPortfolioModal] = useState({ shares: '', buyPrice: '', date: new Date().toISOString().slice(0, 10), notes: '' });

  const fetchAll = useCallback(async (sym) => {
    if (!apiKey) {
      setError('Necesitas tu API key de Finnhub. Ve a Settings y agrégala (gratis en finnhub.io/register).');
      return;
    }
    if (!sym) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const { from, to } = getDateRange(period);
      const resolution = getPeriodResolution(period);
      const newsFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const newsTo = new Date().toISOString().slice(0, 10);

      // Use allSettled — if any one fails (Finnhub free tier doesn't include /candle), the others still work
      const results = await Promise.allSettled([
        fetchQuote(sym, apiKey),
        fetchProfile(sym, apiKey),
        fetchMetrics(sym, apiKey),
        fetchCandles(sym, resolution, from, to, apiKey),
        fetchNews(sym, newsFrom, newsTo, apiKey),
      ]);

      const [qR, pR, mR, cR, nR] = results;
      const quote = qR.status === 'fulfilled' ? qR.value : null;
      const profile = pR.status === 'fulfilled' ? pR.value : null;
      const metrics = mR.status === 'fulfilled' ? mR.value : null;
      const candles = cR.status === 'fulfilled' ? cR.value : null;
      const news = nR.status === 'fulfilled' ? nR.value : [];

      // If even the basic quote fails, show error
      if (!quote || (quote.c === 0 && quote.h === 0 && quote.l === 0)) {
        const reason = qR.status === 'rejected' ? qR.reason : null;
        const status = reason?.response?.status;
        if (status === 401 || status === 403) {
          throw new Error('API key inválida o sin permisos. Verifica tu key en Settings.');
        }
        if (status === 429) {
          throw new Error('Excediste el límite de Finnhub (60 calls/min). Espera 1 minuto.');
        }
        throw new Error(`No se encontraron datos para "${sym}". Verifica el ticker (ej: AAPL, MSFT, TSLA).`);
      }

      // Log partial failures to console for debugging without blocking UI
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const names = ['quote', 'profile', 'metrics', 'candles', 'news'];
          console.warn(`[StockAnalyzer] ${names[i]} failed:`, r.reason?.message || r.reason);
        }
      });

      const m = (metrics && metrics.metric) ? metrics.metric : {};
      const pe = m['peBasicExclExtraTTM'] ?? m['peTTM'] ?? null;
      const eps = m['epsTTM'] ?? null;
      const roe = m['roeTTM'] ?? null;
      const profitMargin = m['netProfitMarginTTM'] ?? null;
      const debtEquity = m['totalDebt/totalEquitySemiAnnual'] ?? m['longTermDebt/equityAnnual'] ?? null;
      const revenueGrowth = m['revenueGrowthTTMYoy'] ?? null;
      const bookValue = m['bookValuePerShareAnnual'] ?? null;
      const weekHigh = m['52WeekHigh'] ?? quote?.h;
      const weekLow = m['52WeekLow'] ?? quote?.l;

      const candleData = candles?.s === 'ok'
        ? candles.t.map((t, i) => ({ time: t, close: candles.c[i], open: candles.o[i], high: candles.h[i], low: candles.l[i], volume: candles.v[i] }))
        : [];

      const ma20 = calc20DayMA(candleData);
      const sentiment = calcNewsSentiment(news?.slice(0, 10) || []);

      const stockScore = calcStockScore({
        pe, profitMargin, debtEquity,
        priceVsMA: ma20 !== null ? quote?.c - ma20 : null,
        newsSentiment: sentiment,
      });

      const riskScore = calcRiskScore({
        pe, profitMargin, debtEquity,
        marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1e6 : null,
      });

      const signal = stockScore >= 4 ? 'BUY' : stockScore >= 1 ? 'HOLD' : 'SELL';
      const timeHorizon = stockScore >= 4 ? 'Long Term (2+ years)' : stockScore >= 1 ? 'Medium Term (6-18 months)' : 'Short Term';

      const reasons = [];
      if (pe !== null) reasons.push(pe < 15 ? `P/E of ${pe?.toFixed(1)} suggests undervalued stock` : pe <= 25 ? `P/E of ${pe?.toFixed(1)} at fair value` : `P/E of ${pe?.toFixed(1)} indicates premium valuation`);
      if (profitMargin !== null) reasons.push(profitMargin > 15 ? `Strong profit margin of ${profitMargin?.toFixed(1)}%` : profitMargin >= 5 ? `Moderate profit margin of ${profitMargin?.toFixed(1)}%` : `Thin profit margin of ${profitMargin?.toFixed(1)}%`);
      if (ma20 !== null) reasons.push(quote?.c > ma20 ? `Price above 20-day MA — uptrend momentum` : `Price below 20-day MA — downtrend caution`);
      if (debtEquity !== null) reasons.push(debtEquity < 0.5 ? `Low leverage ratio (D/E: ${debtEquity?.toFixed(2)})` : debtEquity > 2 ? `High leverage ratio (D/E: ${debtEquity?.toFixed(2)}) — elevated risk` : `Moderate leverage (D/E: ${debtEquity?.toFixed(2)})`);

      const risks = [];
      if (pe !== null && pe > 35) risks.push('High P/E ratio suggests elevated growth expectations');
      if (debtEquity !== null && debtEquity > 2) risks.push('High debt-to-equity ratio increases financial risk');
      if (profitMargin !== null && profitMargin < 5) risks.push('Thin margins leave little room for error');
      if ((profile?.marketCapitalization || 0) * 1e6 < 2e9) risks.push('Small-cap stock has higher volatility');

      setData({
        quote, profile, metrics: { pe, eps, roe, profitMargin, debtEquity, revenueGrowth, bookValue, weekHigh, weekLow },
        candleData, ma20, news: news?.slice(0, 6) || [],
        stockScore, riskScore, signal, timeHorizon, reasons: reasons.slice(0, 4), risks: risks.slice(0, 2),
        sentiment,
      });
      addRecentSearch(sym);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  }, [apiKey, period, addRecentSearch]);

  function handleSearch(e) {
    e.preventDefault();
    if (!ticker.trim()) return;
    fetchAll(ticker.trim().toUpperCase());
  }

  function addToWatchlist() {
    const sym = data?.profile?.ticker || ticker.toUpperCase();
    if (!watchlist.find(w => w === sym)) setWatchlist(prev => [...prev, sym]);
  }

  function handleAddToPortfolio() {
    if (!portfolioModal.shares || !portfolioModal.buyPrice) return;
    const sym = data?.profile?.ticker || ticker.toUpperCase();
    const entry = {
      id: Date.now(),
      ticker: sym,
      name: data?.profile?.name || sym,
      logo: data?.profile?.logo || '',
      shares: Number(portfolioModal.shares),
      buyPrice: Number(portfolioModal.buyPrice),
      currentPrice: data?.quote?.c || Number(portfolioModal.buyPrice),
      date: portfolioModal.date,
      notes: portfolioModal.notes,
      signal: data?.signal || 'HOLD',
    };
    setPortfolio(prev => [...prev, entry]);
    setAddToPortfolioForm(null);
  }

  const chartData = data?.candleData?.map(c => ({
    date: new Date(c.time * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: Number(c.close.toFixed(2)),
    ma20: data.ma20 ? Number(data.ma20.toFixed(2)) : undefined,
  })) || [];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.625rem' }}>
        <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: '#94A3B8' }}>{payload[0]?.payload?.date}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ margin: '0.125rem 0', fontSize: '0.8rem', color: p.stroke }}>
            {p.name}: {formatCurrency(p.value, currency)}
          </p>
        ))}
      </div>
    );
  };

  const priceChange = data?.quote ? data.quote.c - data.quote.pc : 0;
  const pricePct = data?.quote?.pc ? (priceChange / data.quote.pc) * 100 : 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Stock Analyzer</h1>
        <p className="page-subtitle">Research stocks with fundamentals, charts, and rule-based analysis</p>
      </div>

      {!apiKey && (
        <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
          <p style={{ margin: 0, color: '#fbbf24', fontSize: '0.875rem' }}>
            ⚠️ No Finnhub API key set. <a href="/settings" style={{ color: '#10B981' }}>Go to Settings →</a> to add your free key from{' '}
            <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" style={{ color: '#10B981' }}>finnhub.io/register</a>
          </p>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          className="input-field"
          placeholder="Enter a stock ticker (e.g. AAPL, TSLA, MSFT)..."
          value={ticker}
          onChange={e => setTicker(e.target.value.toUpperCase())}
          style={{ fontSize: '1rem', flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !ticker.trim()}>
          {loading ? '⏳' : '🔍'} Search
        </button>
      </form>

      {/* Recent searches */}
      {recentSearches.length > 0 && !data && !loading && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Recent:</span>
          {recentSearches.map(s => (
            <button key={s} className="badge badge-gray" style={{ cursor: 'pointer', border: '1px solid #334155' }}
              onClick={() => { setTicker(s); fetchAll(s); }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={() => fetchAll(ticker)} />}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-flat" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Skeleton width="60px" height="60px" className="" />
            <div style={{ flex: 1 }}>
              <Skeleton height="1.25rem" width="40%" />
              <div style={{ marginTop: '0.5rem' }}><Skeleton height="0.875rem" width="25%" /></div>
            </div>
          </div>
          <ChartSkeleton height={240} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <ChartSkeleton height={120} />
            <ChartSkeleton height={120} />
          </div>
        </div>
      )}

      {data && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header */}
          <div className="card-flat" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {data.profile?.logo && (
              <img src={data.profile.logo} alt="" style={{ width: '52px', height: '52px', borderRadius: '0.5rem', background: 'white', padding: '4px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{data.profile?.name || ticker}</h2>
                <span style={{ fontSize: '0.875rem', color: '#64748B' }}>{data.profile?.ticker} · {data.profile?.exchange}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
                {data.profile?.finnhubIndustry && <span className="badge badge-blue">{data.profile.finnhubIndustry}</span>}
                {data.profile?.country && <span className="badge badge-gray">{data.profile.country}</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>{formatCurrency(data.quote?.c || 0, currency)}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: priceChange >= 0 ? '#10B981' : '#EF4444' }}>
                {priceChange >= 0 ? '+' : ''}{formatCurrency(priceChange, currency)} ({pricePct.toFixed(2)}%)
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={addToWatchlist} title="Add to watchlist">
                {watchlist.includes(data.profile?.ticker || ticker) ? '★ Watching' : '☆ Watchlist'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setAddToPortfolioForm(true)}>+ Portfolio</button>
            </div>
          </div>

          {/* Quote stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.625rem' }}>
            {[
              { label: 'Open', value: formatCurrency(data.quote?.o || 0, currency) },
              { label: 'Prev Close', value: formatCurrency(data.quote?.pc || 0, currency) },
              { label: '52W High', value: formatCurrency(data.metrics.weekHigh || 0, currency), color: '#10B981' },
              { label: '52W Low', value: formatCurrency(data.metrics.weekLow || 0, currency), color: '#f87171' },
              { label: 'Volume', value: data.quote?.v ? `${(data.quote.v / 1e6).toFixed(2)}M` : '—' },
              { label: 'Market Cap', value: data.profile?.marketCapitalization ? formatCompactCurrency(data.profile.marketCapitalization * 1e6, currency) : '—' },
            ].map(item => (
              <div key={item.label} style={{ background: '#0F172A', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', border: '1px solid #1E293B' }}>
                <div className="label">{item.label}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: item.color || 'white' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Price chart */}
          <div className="card-flat">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>PRICE CHART</h3>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {PERIODS.map(p => (
                  <button key={p} className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setPeriod(p); if (data) fetchAll(ticker || data.profile?.ticker); }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94A3B8', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '0.5rem', fontSize: '0.8rem', lineHeight: 1.5 }}>
                📊 El gráfico histórico no está disponible en el plan gratuito de Finnhub (cambió en 2024). Las demás funciones — precio actual, métricas, análisis y noticias — sí funcionan normalmente.
              </div>
            )}
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                    interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={['auto', 'auto']} tickFormatter={v => `$${v.toFixed(0)}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="price" name="Price" stroke="#10B981" strokeWidth={2.5} dot={false} />
                  {data.ma20 && <Line type="monotone" dataKey="ma20" name="20-day MA" stroke="#F59E0B" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>No chart data available for this period</div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Fundamentals */}
            <div className="card-flat">
              <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>FUNDAMENTAL METRICS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'P/E Ratio', value: data.metrics.pe !== null ? formatNumber(data.metrics.pe, 1) : '—' },
                  { label: 'EPS (TTM)', value: data.metrics.eps !== null ? formatCurrency(data.metrics.eps, currency) : '—' },
                  { label: 'Return on Equity', value: data.metrics.roe !== null ? `${data.metrics.roe.toFixed(1)}%` : '—' },
                  { label: 'Profit Margin', value: data.metrics.profitMargin !== null ? `${data.metrics.profitMargin.toFixed(1)}%` : '—' },
                  { label: 'Debt / Equity', value: data.metrics.debtEquity !== null ? formatNumber(data.metrics.debtEquity, 2) : '—' },
                  { label: 'Revenue Growth', value: data.metrics.revenueGrowth !== null ? `${data.metrics.revenueGrowth.toFixed(1)}%` : '—' },
                  { label: 'Book Value/Share', value: data.metrics.bookValue !== null ? formatCurrency(data.metrics.bookValue, currency) : '—' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1E293B' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{item.label}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.875rem' }}>
                <RiskGauge score={data.riskScore} />
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="card-flat">
              <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>RULE-BASED ANALYSIS</h3>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <SignalBadge signal={data.signal} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748B' }}>
                  Score: {data.stockScore > 0 ? '+' : ''}{data.stockScore} · {data.timeHorizon}
                </div>
              </div>
              <div style={{ marginBottom: '0.875rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Key Signals:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {data.reasons.map((r, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: '#E2E8F0', display: 'flex', gap: '0.5rem' }}>
                      <span style={{ color: '#10B981', flexShrink: 0 }}>•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
              {data.risks.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Key Risks:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {data.risks.map((r, i) => (
                      <div key={i} style={{ fontSize: '0.8rem', color: '#E2E8F0', display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: '#f87171', flexShrink: 0 }}>⚠</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginTop: '0.875rem', padding: '0.625rem', background: 'rgba(100,116,139,0.1)', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748B', lineHeight: 1.5 }}>
                  ⚠️ Educational analysis only. Not financial advice. Past performance doesn't guarantee future results.
                </p>
              </div>
            </div>
          </div>

          {/* News */}
          {data.news.length > 0 && (
            <div className="card-flat">
              <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>LATEST NEWS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {data.news.map((article, i) => {
                  const sentiment = getArticleSentiment(article.headline);
                  return (
                    <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                      style={{ textDecoration: 'none', display: 'block', padding: '0.75rem', background: '#0F172A', borderRadius: '0.5rem', border: '1px solid #1E293B', transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#334155'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#1E293B'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#E2E8F0', lineHeight: 1.5, flex: 1 }}>{article.headline}</p>
                        <span className={`badge ${sentiment === 'bullish' ? 'badge-green' : sentiment === 'bearish' ? 'badge-red' : 'badge-yellow'}`} style={{ flexShrink: 0, fontSize: '0.65rem' }}>
                          {sentiment === 'bullish' ? '🟢 Bullish' : sentiment === 'bearish' ? '🔴 Bearish' : '🟡 Neutral'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.375rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{article.source}</span>
                        <span style={{ fontSize: '0.7rem', color: '#475569' }}>{formatDateTime(article.datetime)}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add to portfolio modal */}
      {addToPortfolioForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAddToPortfolioForm(null)}>
          <div className="modal-box" style={{ maxWidth: '380px' }}>
            <div style={{ padding: '1.25rem 1.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add to Portfolio</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setAddToPortfolioForm(null)}>×</button>
            </div>
            <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
              <div style={{ marginBottom: '0.875rem' }}>
                <label className="label">Shares</label>
                <input type="number" className="input-field" placeholder="e.g. 10" step="0.001" min="0.001"
                  value={portfolioModal.shares} onChange={e => setPortfolioModal(p => ({ ...p, shares: e.target.value }))} />
              </div>
              <div style={{ marginBottom: '0.875rem' }}>
                <label className="label">Buy Price</label>
                <input type="number" className="input-field" placeholder="0.00" step="0.01" min="0"
                  defaultValue={data?.quote?.c?.toFixed(2)}
                  value={portfolioModal.buyPrice} onChange={e => setPortfolioModal(p => ({ ...p, buyPrice: e.target.value }))} />
              </div>
              <div style={{ marginBottom: '0.875rem' }}>
                <label className="label">Date</label>
                <input type="date" className="input-field" value={portfolioModal.date} onChange={e => setPortfolioModal(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.875rem', borderTop: '1px solid #334155' }}>
                <button className="btn btn-secondary" onClick={() => setAddToPortfolioForm(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddToPortfolio}>Add Position</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
