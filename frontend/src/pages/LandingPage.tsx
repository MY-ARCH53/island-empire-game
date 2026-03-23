import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      color: '#e2e8f0',
      fontFamily: 'sans-serif',
    }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b' }}>⚓ Islands Empire</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" style={{ padding: '8px 20px', border: '1px solid #f59e0b', borderRadius: 8, color: '#f59e0b', textDecoration: 'none', fontSize: 14 }}>Giriş Yap</Link>
          <Link to="/register" style={{ padding: '8px 20px', background: '#f59e0b', borderRadius: 8, color: '#0f172a', textDecoration: 'none', fontSize: 14, fontWeight: 'bold' }}>Ücretsiz Oyna</Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 20px 60px' }}>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 'bold', marginBottom: 20, lineHeight: 1.2 }}>
          Adanı İnşa Et,<br />
          <span style={{ color: '#f59e0b' }}>İmparatorluğunu Kur</span>
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Islands Empire, tarayıcı tabanlı bir strateji oyunudur. Adanı geliştir, kaynak topla,
          ticaret yap, diğer oyuncularla savaş ve liderlik tablosuna tırman.
        </p>
        <Link to="/register" style={{
          display: 'inline-block', padding: '16px 40px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          borderRadius: 12, color: '#0f172a', textDecoration: 'none',
          fontSize: 18, fontWeight: 'bold',
          boxShadow: '0 4px 24px rgba(245,158,11,0.4)'
        }}>
          🎮 Hemen Oyna — Ücretsiz
        </Link>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px 80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 'bold', marginBottom: 48, color: '#f1f5f9' }}>Oyun Özellikleri</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { emoji: '🏝️', title: 'Ada İnşası', desc: 'Kendi adanı sıfırdan inşa et. Binalar yaptır, kaynakları yönet ve adanı büyüt.' },
            { emoji: '⚔️', title: 'PvP Savaşlar', desc: 'Diğer oyuncularla savaş, onların kaynaklarını ele geçir ve sıralamada yüksel.' },
            { emoji: '🏪', title: 'Pazar Yeri', desc: 'Diğer oyuncularla kaynak ticareti yap. Altın, odun, yiyecek ve enerji al-sat.' },
            { emoji: '🏆', title: 'Liderlik Tablosu', desc: "En güçlü oyuncularla yarış. Haftalık ödüller kazan ve şampiyonlar ligine gir." },
            { emoji: '⚓', title: 'Loncalar', desc: 'Kendi loncani kur ya da bir loncaya katıl. Takım halinde oyna, birlikte güçlen.' },
            { emoji: '🎯', title: 'Görevler', desc: 'Günlük görevleri tamamla, ödüller kazan. Seviye atla ve yeni binalar aç.' },
          ].map(f => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 24,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{f.emoji}</div>
              <h3 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#f1f5f9' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '40px 20px 80px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Hazır mısın?</h2>
        <p style={{ color: '#94a3b8', marginBottom: 32 }}>Ücretsiz kayıt ol ve hemen oynamaya başla.</p>
        <Link to="/register" style={{
          display: 'inline-block', padding: '14px 36px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          borderRadius: 12, color: '#0f172a', textDecoration: 'none',
          fontSize: 16, fontWeight: 'bold'
        }}>
          Ücretsiz Hesap Oluştur
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', color: '#475569', fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 8 }}>
          <Link to="/about" style={{ color: '#64748b', textDecoration: 'none' }}>Hakkında</Link>
          <Link to="/how-to-play" style={{ color: '#64748b', textDecoration: 'none' }}>Nasıl Oynanır?</Link>
          <Link to="/privacy-policy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</Link>
        </div>
        <div>© 2026 Islands Empire. Tüm hakları saklıdır.</div>
      </footer>
    </div>
  );
}
