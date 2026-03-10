import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MapPage from './pages/MapPage';
import LeaguePage from './pages/LeaguePage';
import MarketplacePage from './pages/MarketplacePage';
import LeaderboardPage from './pages/LeaderboardPage';
import FriendsPage from './pages/FriendsPage';
import GuildsPage from './pages/GuildsPage';
import BattlePage from './pages/BattlePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminPage from './pages/AdminPage';
import Admin2Page from './pages/Admin2Page';
import TLCoinPage from './pages/TLCoinPage';
import ProfilePage from './pages/ProfilePage';
import BattleDemoPage from './pages/BattleDemoPage';

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-blue-400 to-blue-500">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/league" element={<LeaguePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/guilds" element={<GuildsPage />} />
            <Route path="/battle" element={<BattlePage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin2" element={<Admin2Page />} />
            <Route path="/tlcoin" element={<TLCoinPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/battle-demo" element={<BattleDemoPage />} />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;