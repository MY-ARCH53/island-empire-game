import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';

function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeIn">

        {/* Logo */}
        <div className="text-center mb-8 animate-slideInLeft">
          <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-4 animate-pulse-slow">
            <span className="text-6xl">🔑</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 gradient-text">Şifremi Unuttum</h1>
          <p className="text-white opacity-80">E-posta adresinize sıfırlama linki göndereceğiz</p>
        </div>

        <div className="glass-card animate-slideInRight">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">E-posta Gönderildi!</h2>
              <p className="text-gray-600 text-sm mb-6">
                <strong>{email}</strong> adresine şifre sıfırlama linki gönderdik.<br />
                Link <strong>1 saat</strong> geçerlidir.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-blue-500 font-semibold hover:text-blue-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-2">E-posta Doğrulama</h2>
              <p className="text-gray-500 text-sm mb-6">
                Kayıtlı e-posta adresinizi girin, şifre sıfırlama linki gönderelim.
              </p>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                  <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>⚠️ {error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all btn-modern shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader className="w-5 h-5 animate-spin" /> Gönderiliyor...</>
                  ) : (
                    <><Mail className="w-5 h-5" /> Sıfırlama Linki Gönder</>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition">
                  <ArrowLeft className="w-4 h-4" />
                  Giriş sayfasına dön
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
