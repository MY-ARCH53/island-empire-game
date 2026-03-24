import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function RegisterPage() {
  const navigate = useNavigate();
  const [username,        setUsername]        = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Şifreler eşleşmiyor!'); return; }
    if (password.length < 6)          { setError('Şifre en az 6 karakter olmalı!'); return; }
    setLoading(true);
    try {
      const response = await authAPI.register(username, email, password);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      await authAPI.startGame(user.id);
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kayıt başarısız');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(217,119,6,0.22)',
    borderRadius: 12, color: '#f1f5f9', fontSize: 16,
    padding: '13px 16px', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  const focus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(245,158,11,0.65)';
    e.target.style.boxShadow   = '0 0 0 3px rgba(245,158,11,0.08)';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(217,119,6,0.22)';
    e.target.style.boxShadow   = 'none';
  };

  return (
    <div style={{
      minHeight: '100svh',
      background: 'linear-gradient(175deg, #03060e 0%, #060d1c 30%, #0a1628 55%, #0f0a00 78%, #1c0900 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>

      {/* Arka plan efektleri */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 45% at 50% 110%, rgba(194,65,12,0.26) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 35% at 50% -5%, rgba(30,58,138,0.20) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(217,119,6,0.03) 0%, transparent 70%)' }} />

      {/* Üst şerit */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, #92400e 20%, #f59e0b 50%, #92400e 80%, transparent)' }} />

      {/* ── LOGO ── */}
      <div style={{ textAlign: 'center', marginBottom: 22, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ height: 1, width: 44, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5))' }} />
          <span style={{ fontSize: 9, color: 'rgba(245,158,11,0.55)', fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase' }}>Yeni Macera</span>
          <div style={{ height: 1, width: 44, background: 'linear-gradient(90deg, rgba(245,158,11,0.5), transparent)' }} />
        </div>

        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 10,
          filter: 'drop-shadow(0 0 22px rgba(245,158,11,0.50)) drop-shadow(0 4px 10px rgba(0,0,0,0.8))' }}>
          🏝️
        </div>

        <h1 style={{
          fontSize: 30, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase',
          background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 30%, #d97706 65%, #92400e 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1.05, marginBottom: 8,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))',
        }}>
          Islands<br />Empire
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <span style={{ fontSize: 13 }}>⛵</span>
          <span style={{ color: 'rgba(203,213,225,0.48)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
            İmparatorluğunu Kur
          </span>
          <span style={{ fontSize: 13 }}>⛵</span>
        </div>
      </div>

      {/* ── FORM KARTI ── */}
      <div style={{
        width: '100%', maxWidth: 400, position: 'relative', zIndex: 1,
        background: 'rgba(3, 8, 22, 0.88)',
        border: '1px solid rgba(217,119,6,0.20)',
        borderRadius: 24, padding: '26px 24px',
        backdropFilter: 'blur(28px)',
        boxShadow: '0 8px 80px rgba(0,0,0,0.70), 0 0 40px rgba(217,119,6,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.42), transparent)', marginBottom: 20 }} />

        <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 17, textAlign: 'center', marginBottom: 20,
          letterSpacing: 2, textTransform: 'uppercase' }}>
          🏰 &nbsp;Kayıt Ol
        </h2>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.28)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Kullanıcı Adı */}
          <div>
            <label style={{ color: 'rgba(203,213,225,0.52)', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>
              👤 &nbsp;Kullanıcı Adı
            </label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="kullaniciadi" required minLength={3} disabled={loading}
              style={inputStyle} onFocus={focus} onBlur={blur}
            />
            <p style={{ color: 'rgba(203,213,225,0.25)', fontSize: 11, marginTop: 4 }}>En az 3 karakter</p>
          </div>

          {/* E-posta */}
          <div>
            <label style={{ color: 'rgba(203,213,225,0.52)', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>
              ✉️ &nbsp;E-posta
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ornek@mail.com" required disabled={loading}
              style={inputStyle} onFocus={focus} onBlur={blur}
            />
            <p style={{ color: 'rgba(203,213,225,0.25)', fontSize: 11, marginTop: 4 }}>Şifre sıfırlama için kullanılır</p>
          </div>

          {/* Şifre */}
          <div>
            <label style={{ color: 'rgba(203,213,225,0.52)', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>
              🔒 &nbsp;Şifre
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6} disabled={loading}
              style={inputStyle} onFocus={focus} onBlur={blur}
            />
            <p style={{ color: 'rgba(203,213,225,0.25)', fontSize: 11, marginTop: 4 }}>En az 6 karakter</p>
          </div>

          {/* Şifre Tekrar */}
          <div>
            <label style={{ color: 'rgba(203,213,225,0.52)', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7, display: 'block' }}>
              🔒 &nbsp;Şifre Tekrar
            </label>
            <input
              type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••" required disabled={loading}
              style={inputStyle} onFocus={focus} onBlur={blur}
            />
          </div>

          {/* Buton */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', marginTop: 6,
              background: loading
                ? 'rgba(217,119,6,0.22)'
                : 'linear-gradient(135deg, #fbbf24 0%, #d97706 45%, #b45309 100%)',
              border: loading ? '1px solid rgba(217,119,6,0.28)' : 'none',
              borderRadius: 13, color: loading ? 'rgba(255,255,255,0.45)' : '#1c0900',
              fontWeight: 900, fontSize: 15, padding: '15px 0',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 2, textTransform: 'uppercase',
              boxShadow: loading ? 'none' : '0 4px 28px rgba(217,119,6,0.42), 0 1px 0 rgba(255,255,255,0.12) inset',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳  Kayıt Yapılıyor...' : '🏝️  Maceraya Başla'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ color: 'rgba(203,213,225,0.42)', fontSize: 13 }}>
            Zaten hesabın var mı?{' '}
            <Link to="/login" style={{ color: '#f59e0b', fontWeight: 700, textDecoration: 'none' }}>
              Giriş Yap →
            </Link>
          </p>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.32), transparent)', marginTop: 20 }} />
      </div>

      {/* ── FEATURE BADGES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 20, width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {[
          { emoji: '🏝️', label: '7 Ada',        sub: 'Keşfet'    },
          { emoji: '🏗️', label: 'Binalar',       sub: 'İnşa Et'  },
          { emoji: '⚔️', label: 'Savaş',         sub: 'Fethret'  },
        ].map(f => (
          <div key={f.label} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(217,119,6,0.13)',
            borderRadius: 12, padding: '10px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, lineHeight: 1.2 }}>{f.emoji}</div>
            <p style={{ color: 'rgba(245,158,11,0.7)', fontSize: 11, marginTop: 4, fontWeight: 700 }}>{f.label}</p>
            <p style={{ color: 'rgba(203,213,225,0.3)', fontSize: 10, marginTop: 2 }}>{f.sub}</p>
          </div>
        ))}
      </div>

      {/* Alt linkler */}
      <div style={{ marginTop: 16, position: 'relative', zIndex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 16 }}>
        <Link to="/privacy-policy" style={{ color: 'rgba(203,213,225,0.35)', fontSize: 12, textDecoration: 'none' }}>Privacy Policy</Link>
        <Link to="/about" style={{ color: 'rgba(203,213,225,0.35)', fontSize: 12, textDecoration: 'none' }}>Hakkında</Link>
        <Link to="/how-to-play" style={{ color: 'rgba(203,213,225,0.35)', fontSize: 12, textDecoration: 'none' }}>Nasıl Oynanır?</Link>
      </div>

      {/* Alt şerit */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, #92400e 20%, #d97706 50%, #92400e 80%, transparent)' }} />
    </div>
  );
}

export default RegisterPage;
