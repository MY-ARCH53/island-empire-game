import { Link } from 'react-router-dom';

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(15,23,42,0.95)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link to="/" style={{ fontSize: 20, fontWeight: 'bold', color: '#f59e0b', textDecoration: 'none' }}>⚓ Islands Empire</Link>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link to="/about" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>Hakkında</Link>
          <Link to="/how-to-play" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>Nasıl Oynanır?</Link>
          <Link to="/register" style={{ background: '#f59e0b', color: '#0f172a', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Oyna</Link>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>📬</div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>İletişim</h1>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
            Sorularınız, önerileriniz veya teknik sorunlar için bize ulaşın.
            En kısa sürede yanıt vermeye çalışırız.
          </p>
        </div>

        {/* İletişim Kanalları */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 40 }}>
          {[
            {
              icon: '📧',
              title: 'E-posta',
              value: 'info@islandsempire.com',
              desc: 'Genel sorular ve öneriler için',
              href: 'mailto:info@islandsempire.com',
              color: '#3b82f6',
            },
            {
              icon: '🛠️',
              title: 'Teknik Destek',
              value: 'info@islandsempire.com',
              desc: 'Hata bildirimi ve teknik yardım',
              href: 'mailto:info@islandsempire.com?subject=Teknik Destek',
              color: '#06b6d4',
            },
            {
              icon: '🔒',
              title: 'Gizlilik / KVKK',
              value: 'info@islandsempire.com',
              desc: 'Kişisel veri talepleri',
              href: 'mailto:info@islandsempire.com?subject=Gizlilik Talebi',
              color: '#8b5cf6',
            },
          ].map(c => (
            <div key={c.title} style={{
              background: '#1e293b', borderRadius: 16, padding: 24,
              border: `1px solid ${c.color}33`,
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{c.icon}</div>
              <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{c.title}</h3>
              <p style={{ color: '#64748b', fontSize: 12, marginBottom: 10 }}>{c.desc}</p>
              <a href={c.href} style={{ color: c.color, fontWeight: 600, fontSize: 13, textDecoration: 'none', wordBreak: 'break-all' }}>
                {c.value}
              </a>
            </div>
          ))}
        </div>

        {/* Yanıt Süresi */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>⏱️ Yanıt Süreleri</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { type: 'Genel Sorular', time: '1-2 iş günü', color: '#22c55e' },
              { type: 'Teknik Sorunlar', time: '24-48 saat', color: '#f59e0b' },
              { type: 'Hesap Silme / Veri Talebi', time: '7 iş günü', color: '#3b82f6' },
              { type: 'Ödül Talep Onayı', time: '3-5 iş günü', color: '#8b5cf6' },
            ].map(r => (
              <div key={r.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{r.type}</span>
                <span style={{ color: r.color, fontWeight: 600, fontSize: 13 }}>{r.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Hızlı Cevaplar */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>💡 Önce Buralara Bakın</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            Sorunuzun cevabını e-posta beklemeden burada bulabilirsiniz:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link to="/how-to-play" style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
              background: 'rgba(255,255,255,0.04)', borderRadius: 12, textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: 24 }}>📖</span>
              <div>
                <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Nasıl Oynanır? Rehberi</p>
                <p style={{ color: '#64748b', fontSize: 12 }}>Oyunun tüm mekaniği hakkında kapsamlı rehber</p>
              </div>
            </Link>
            <Link to="/about" style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
              background: 'rgba(255,255,255,0.04)', borderRadius: 12, textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: 24 }}>🏝️</span>
              <div>
                <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Hakkımızda Sayfası</p>
                <p style={{ color: '#64748b', fontSize: 12 }}>Islands Empire'ın hikayesi ve özellikler</p>
              </div>
            </Link>
            <Link to="/privacy-policy" style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
              background: 'rgba(255,255,255,0.04)', borderRadius: 12, textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: 24 }}>🔒</span>
              <div>
                <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Gizlilik Politikası</p>
                <p style={{ color: '#64748b', fontSize: 12 }}>Kişisel verilerin nasıl işlendiği</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Şikayet / İhbar */}
        <section style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 16, padding: 24, marginBottom: 40, border: '1px solid rgba(239,68,68,0.2)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fca5a5', marginBottom: 10 }}>🚨 Kötüye Kullanım Bildirimi</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
            Kural ihlali, hile, taciz veya uygunsuz içerik bildirmek için{' '}
            <a href="mailto:info@islandsempire.com?subject=Kötüye Kullanım Bildirimi" style={{ color: '#f87171', fontWeight: 600 }}>
              info@islandsempire.com
            </a>{' '}
            adresine e-posta gönderebilirsiniz. Tüm bildirimler gizli tutulur ve en kısa sürede incelenir.
          </p>
        </section>

        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Ana Sayfa</Link>
          <Link to="/about" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Hakkında</Link>
          <Link to="/how-to-play" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Nasıl Oynanır?</Link>
          <Link to="/privacy-policy" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Gizlilik Politikası</Link>
        </div>
      </div>
    </div>
  );
}
