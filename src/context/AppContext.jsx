import { createContext, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const AppContext = createContext(null);

const DEFAULT_SETTINGS = {
  apiKey: '',
  currency: 'USD',
  language: 'en',
};

const DEFAULT_CATEGORIES = [
  'Housing', 'Food & Dining', 'Transportation', 'Healthcare',
  'Entertainment', 'Shopping', 'Utilities', 'Education',
  'Travel', 'Personal Care', 'Insurance', 'Savings',
  'Investment', 'Income', 'Other',
];

export function AppProvider({ children }) {
  const [transactions, setTransactions] = useLocalStorage('transactions', []);
  const [debts, setDebts] = useLocalStorage('debts', []);
  const [fundEntries, setFundEntries] = useLocalStorage('fund_entries', []);
  const [fundConfig, setFundConfig] = useLocalStorage('fund_config', { monthlyExpenses: 0 });
  const [goals, setGoals] = useLocalStorage('goals', []);
  const [tlHistory, setTlHistory] = useLocalStorage('traffic_light_history', []);
  const [tlInputs, setTlInputs] = useLocalStorage('traffic_light_inputs', {
    income: 0, expenses: 0, highestRate: 0, fundMonths: 0,
  });
  const [portfolio, setPortfolio] = useLocalStorage('portfolio', []);
  const [watchlist, setWatchlist] = useLocalStorage('watchlist', []);
  const [settings, setSettings] = useLocalStorage('settings', DEFAULT_SETTINGS);
  const [recentSearches, setRecentSearches] = useLocalStorage('recent_searches', []);
  const [categories, setCategories] = useLocalStorage('categories', DEFAULT_CATEGORIES);

  function addRecentSearch(ticker) {
    setRecentSearches(prev => {
      const upper = ticker.toUpperCase();
      const filtered = prev.filter(t => t !== upper);
      return [upper, ...filtered].slice(0, 5);
    });
  }

  function clearAllData() {
    const keys = [
      'transactions', 'debts', 'fund_entries', 'fund_config', 'goals',
      'traffic_light_history', 'traffic_light_inputs', 'portfolio', 'watchlist',
      'recent_searches', 'categories',
    ];
    keys.forEach(k => {
      try { localStorage.removeItem(`fzti_${k}`); } catch {}
    });
    setTransactions([]);
    setDebts([]);
    setFundEntries([]);
    setFundConfig({ monthlyExpenses: 0 });
    setGoals([]);
    setTlHistory([]);
    setTlInputs({ income: 0, expenses: 0, highestRate: 0, fundMonths: 0 });
    setPortfolio([]);
    setWatchlist([]);
    setRecentSearches([]);
    setCategories(DEFAULT_CATEGORIES);
  }

  const value = {
    transactions, setTransactions,
    debts, setDebts,
    fundEntries, setFundEntries,
    fundConfig, setFundConfig,
    goals, setGoals,
    tlHistory, setTlHistory,
    tlInputs, setTlInputs,
    portfolio, setPortfolio,
    watchlist, setWatchlist,
    settings, setSettings,
    recentSearches, addRecentSearch,
    categories, setCategories,
    clearAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
