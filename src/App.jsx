import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Debts from './pages/Debts';
import EmergencyFund from './pages/EmergencyFund';
import Goals from './pages/Goals';
import TrafficLight from './pages/TrafficLight';
import StockAnalyzer from './pages/StockAnalyzer';
import Portfolio from './pages/Portfolio';
import Settings from './pages/Settings';

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
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
        </Routes>
      </AppProvider>
    </HashRouter>
  );
}
