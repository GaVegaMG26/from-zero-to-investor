import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Debts from './pages/Debts';
import EmergencyFund from './pages/EmergencyFund';
import Goals from './pages/Goals';
import TrafficLight from './pages/TrafficLight';
import StockAnalyzer from './pages/StockAnalyzer';
import Portfolio from './pages/Portfolio';
import Settings from './pages/Settings';

function AppGate() {
  const { user, onboarded } = useAuth();

  if (!user) return <Auth />;
  if (!onboarded) return <Onboarding />;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="debts" element={<Debts />} />
        <Route path="emergency-fund" element={<EmergencyFund />} />
        <Route path="goals" element={<Goals />} />
        <Route path="traffic-light" element={<TrafficLight />} />
        <Route path="stock-analyzer" element={<StockAnalyzer />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppProvider>
          <AppGate />
        </AppProvider>
      </AuthProvider>
    </HashRouter>
  );
}
