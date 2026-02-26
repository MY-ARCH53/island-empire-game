import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Lock, Loader, Sparkles, Mail } from 'lucide-react';
import { authAPI } from '../services/api';

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor!');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı!');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register(username, email, password);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      await authAPI.startGame(user.id);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kayıt başarısız');
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
            <span className="text-6xl">🏝️</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 gradient-text">Ada İmparatorluğu</h1>
          <p className="text-white opacity-90 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Yeni bir maceraya başla!
            <Sparkles className="w-4 h-4" />
          </p>
        </div>

        {/* Register Form */}
        <div className="glass-card animate-slideInRight">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Kayıt Ol</h2>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Adı</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="kullaniciadi"
                  required
                  minLength={3}
                  disabled={loading}
                  style={{ fontSize: 16 }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">En az 3 karakter</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="ornek@mail.com"
                  required
                  disabled={loading}
                  style={{ fontSize: 16 }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Şifre sıfırlama için kullanılır</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={loading}
                  style={{ fontSize: 16 }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">En az 6 karakter</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şifre Tekrar</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all btn-modern shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader className="w-5 h-5 animate-spin" /> Kayıt yapılıyor...</>
              ) : (
                <><UserPlus className="w-5 h-5" /> Kayıt Ol ve Başla</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Zaten hesabın var mı?{' '}
              <Link to="/login" className="text-blue-500 font-semibold hover:text-blue-600 transition">
                Giriş Yap
              </Link>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur hover-lift">
            <div className="text-2xl mb-1">🏝️</div>
            <p className="text-xs text-white font-medium">7 Ada</p>
          </div>
          <div className="text-center p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur hover-lift">
            <div className="text-2xl mb-1">🏗️</div>
            <p className="text-xs text-white font-medium">Binalar</p>
          </div>
          <div className="text-center p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur hover-lift">
            <div className="text-2xl mb-1">🏆</div>
            <p className="text-xs text-white font-medium">Yarış</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
