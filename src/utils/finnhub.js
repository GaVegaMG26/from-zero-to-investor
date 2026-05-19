import axios from 'axios';

const BASE = 'https://finnhub.io/api/v1';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCacheKey(endpoint, params) {
  return `fzti_stock_cache_${endpoint}_${JSON.stringify(params)}`;
}

function getFromCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveToCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {}
}

async function get(endpoint, params, apiKey) {
  const cacheKey = getCacheKey(endpoint, params);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const res = await axios.get(`${BASE}${endpoint}`, {
    params: { ...params, token: apiKey },
    timeout: 10000,
  });
  saveToCache(cacheKey, res.data);
  return res.data;
}

export async function fetchQuote(ticker, apiKey) {
  return get('/quote', { symbol: ticker.toUpperCase() }, apiKey);
}

export async function fetchProfile(ticker, apiKey) {
  return get('/stock/profile2', { symbol: ticker.toUpperCase() }, apiKey);
}

export async function fetchMetrics(ticker, apiKey) {
  return get('/stock/metric', { symbol: ticker.toUpperCase(), metric: 'all' }, apiKey);
}

export async function fetchCandles(ticker, resolution, from, to, apiKey) {
  const cacheKey = `fzti_candles_${ticker}_${resolution}_${from}_${to}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;
  const res = await axios.get(`${BASE}/stock/candle`, {
    params: { symbol: ticker.toUpperCase(), resolution, from, to, token: apiKey },
    timeout: 15000,
  });
  saveToCache(cacheKey, res.data);
  return res.data;
}

export async function fetchNews(ticker, from, to, apiKey) {
  return get('/company-news', { symbol: ticker.toUpperCase(), from, to }, apiKey);
}

export function getDateRange(period) {
  const to = Math.floor(Date.now() / 1000);
  const now = new Date();
  let from;
  switch (period) {
    case '1W': from = new Date(now); from.setDate(from.getDate() - 7); break;
    case '1M': from = new Date(now); from.setMonth(from.getMonth() - 1); break;
    case '3M': from = new Date(now); from.setMonth(from.getMonth() - 3); break;
    case '6M': from = new Date(now); from.setMonth(from.getMonth() - 6); break;
    case '1Y': from = new Date(now); from.setFullYear(from.getFullYear() - 1); break;
    default: from = new Date(now); from.setMonth(from.getMonth() - 1);
  }
  return { from: Math.floor(from.getTime() / 1000), to };
}

export function getPeriodResolution(period) {
  switch (period) {
    case '1W': return 'D';
    case '1M': return 'D';
    case '3M': return 'D';
    case '6M': return 'W';
    case '1Y': return 'W';
    default: return 'D';
  }
}
