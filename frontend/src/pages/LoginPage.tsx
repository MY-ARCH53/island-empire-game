import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login(username, password);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(217,119,6,0.25)',
    borderRadius: 12, color: '#f1f5f9', fontSize: 16,
    padding: '13px 16px', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{
      minHeight: '100svh',
      background: 'linear-gradient(175deg, #03060e 0%, #060d1c 30%, #0a1628 55%, #0f0a00 78%, #1c0900 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
    }}>

      {/* Ateş parlaması — alt */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 45% at 50% 105%, rgba(194,65,12,0.28) 0%, transparent 65%)' }} />
      {/* Gece gökyüzü parlaması — üst */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 35% at 50% -5%, rgba(30,58,138,0.22) 0%, transparent 65%)' }} />
      {/* Altın ışık — merkez */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(217,119,6,0.04) 0%, transparent 70%)' }} />

      {/* Üst altın şerit */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent 0%, #92400e 20%, #f59e0b 50%, #92400e 80%, transparent 100%)' }} />

      {/* ── LOGO ALANI ── */}
      <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>

        {/* Dekoratif üst çizgi */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ height: 1, width: 50, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.55))' }} />
          <span style={{ fontSize: 10, color: 'rgba(245,158,11,0.6)', fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase' }}>Est. 2025</span>
          <div style={{ height: 1, width: 50, background: 'linear-gradient(90deg, rgba(245,158,11,0.55), transparent)' }} />
        </div>

        {/* Skull */}
        <div style={{ fontSize: 68, lineHeight: 1, marginBottom: 14,
          filter: 'drop-shadow(0 0 28px rgba(245,158,11,0.55)) drop-shadow(0 4px 12px rgba(0,0,0,0.8))' }}>
          ☠️
        </div>

        {/* Ana başlık */}
        <h1 style={{
          fontSize: 34, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase',
          background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 30%, #d97706 65%, #92400e 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1.05, marginBottom: 10,
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))',
        }}>
          Islands<br />Empire
        </h1>

        {/* Alt yazı */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚔️</span>
          <span style={{ color: 'rgba(203,213,225,0.5)', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
            Adaları Fethret
          </span>
          <span style={{ fontSize: 14 }}>⚔️</span>
        </div>
      </div>

      {/* ── FORM KARTI ── */}
      <div style={{
        width: '100%', maxWidth: 400, position: 'relative', zIndex: 1,
        background: 'rgba(3, 8, 22, 0.88)',
        border: '1px solid rgba(217,119,6,0.22)',
        borderRadius: 24, padding: '28px 24px',
        backdropFilter: 'blur(28px)',
        boxShadow: '0 8px 80px rgba(0,0,0,0.7), 0 0 40px rgba(217,119,6,0.07), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>

        {/* Kart iç üst şerit */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.45), transparent)', marginBottom: 22 }} />

        <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 18, textAlign: 'center', marginBottom: 22,
          letterSpacing: 2, textTransform: 'uppercase' }}>
          🗡️ &nbsp;Giriş Yap
        </h2>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.30)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 18 }}>
            <p style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label style={{ color: 'rgba(203,213,225,0.55)', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
              👤 &nbsp;Kullanıcı Adı
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="kullaniciadi"
              required
              disabled={loading}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'rgba(245,158,11,0.65)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.08)'; }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(217,119,6,0.25)';  e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(203,213,225,0.55)', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
              🔒 &nbsp;Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'rgba(245,158,11,0.65)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.08)'; }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(217,119,6,0.25)';  e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', marginTop: 6,
              background: loading
                ? 'rgba(217,119,6,0.25)'
                : 'linear-gradient(135deg, #fbbf24 0%, #d97706 45%, #b45309 100%)',
              border: loading ? '1px solid rgba(217,119,6,0.3)' : 'none',
              borderRadius: 13, color: loading ? 'rgba(255,255,255,0.5)' : '#1c0900',
              fontWeight: 900, fontSize: 15, padding: '15px 0',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 2, textTransform: 'uppercase',
              boxShadow: loading ? 'none' : '0 4px 28px rgba(217,119,6,0.45), 0 1px 0 rgba(255,255,255,0.12) inset',
              transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳  Giriş Yapılıyor...' : '⚔️  Savaşa Gir'}
          </button>
        </form>

        <div style={{ marginTop: 22, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Link to="/forgot-password" style={{ color: 'rgba(203,213,225,0.35)', fontSize: 12,
            textDecoration: 'none', letterSpacing: 0.5 }}>
            Şifremi Unuttum
          </Link>
          <p style={{ color: 'rgba(203,213,225,0.45)', fontSize: 13 }}>
            Henüz katılmadın mı?{' '}
            <Link to="/register" style={{ color: '#f59e0b', fontWeight: 700, textDecoration: 'none' }}>
              Kayıt Ol →
            </Link>
          </p>
        </div>

        {/* Kart iç alt şerit */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(217,119,6,0.35), transparent)', marginTop: 22 }} />
      </div>

      {/* ── FEATURE BADGES ── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 22, position: 'relative', zIndex: 1 }}>
        {[
          { emoji: '🏝️', label: '7 Ada'   },
          { emoji: '⚔️', label: 'Savaş'   },
          { emoji: '💰', label: 'Hazine'  },
          { emoji: '🏆', label: 'Lig'     },
        ].map(f => (
          <div key={f.label} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(217,119,6,0.14)',
            borderRadius: 12, padding: '9px 14px', textAlign: 'center', flex: 1,
          }}>
            <div style={{ fontSize: 20, lineHeight: 1.2 }}>{f.emoji}</div>
            <p style={{ color: 'rgba(203,213,225,0.4)', fontSize: 10, marginTop: 4, fontWeight: 700, letterSpacing: 0.5 }}>{f.label}</p>
          </div>
        ))}
      </div>

      {/* Alt linkler */}
      <div style={{ marginTop: 16, position: 'relative', zIndex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 16 }}>
        <Link to="/privacy-policy" style={{ color: 'rgba(203,213,225,0.35)', fontSize: 12, textDecoration: 'none' }}>Privacy Policy</Link>
        <Link to="/about" style={{ color: 'rgba(203,213,225,0.35)', fontSize: 12, textDecoration: 'none' }}>Hakkında</Link>
        <Link to="/how-to-play" style={{ color: 'rgba(203,213,225,0.35)', fontSize: 12, textDecoration: 'none' }}>Nasıl Oynanır?</Link>
      </div>

      {/* Alt altın şerit */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent 0%, #92400e 20%, #d97706 50%, #92400e 80%, transparent 100%)' }} />
    </div>
  );
}

export default LoginPage;
