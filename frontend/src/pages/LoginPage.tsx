import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, User, Lock, Loader } from 'lucide-react';
import { authAPI } from '../services/api';

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-slideInLeft">
          <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-4 animate-pulse-slow">
            <span className="text-6xl">⛵</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 gradient-text">
            Ticaret İmparatorluğu
          </h1>
          <p className="text-white opacity-90">İmparatorluğunu inşa et!</p>
        </div>

        {/* Login Form */}
        <div className="glass-card animate-slideInRight">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Giriş Yap
          </h2>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="kullaniciadi"
                  required
                  disabled={loading}
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all btn-modern shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Giriş Yap
                </>
              )}
            </button>
          </form>

          {/* Forgot Password + Register */}
          <div className="mt-6 text-center space-y-2">
            <p>
              <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-blue-500 transition">
                Şifremi Unuttum
              </Link>
            </p>
            <p className="text-gray-600">
              Hesabın yok mu?{' '}
              <Link to="/register" className="text-blue-500 font-semibold hover:text-blue-600 transition">
                Kayıt Ol
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white opacity-75 text-sm">
          <p>🏝️ Adaları keşfet, imparatorluk kur! 🏆</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;