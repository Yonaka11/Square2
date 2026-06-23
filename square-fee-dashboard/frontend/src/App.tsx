import { Routes, Route } from 'react-router-dom';
import DashboardOverview from './pages/DashboardOverview';
import MonthlyFeeReport from './pages/MonthlyFeeReport';
import SalesAnalytics from './pages/SalesAnalytics';
import CatalogManager from './pages/CatalogManager';
import FeeRulesSettings from './pages/FeeRulesSettings';
import SyncStatus from './pages/SyncStatus';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardOverview />} />
      <Route path="/monthly-fee" element={<MonthlyFeeReport />} />
      <Route path="/analytics" element={<SalesAnalytics />} />
      <Route path="/catalog" element={<CatalogManager />} />
      <Route path="/settings" element={<FeeRulesSettings />} />
      <Route path="/sync" element={<SyncStatus />} />
    </Routes>
  );
}
