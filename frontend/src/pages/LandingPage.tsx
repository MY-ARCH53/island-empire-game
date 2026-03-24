import { Link } from 'react-router-dom';

const FEATURES = [
  { emoji: '🏝️', title: 'Ada İnşası', desc: 'Kendi adanı sıfırdan inşa et. Binalar yaptır, kaynakları yönet ve adanı büyüt. Her bina farklı kaynaklar üretir ve imparatorluğuna katkı sağlar.' },
  { emoji: '⚔️', title: 'PvP Savaşlar', desc: 'Diğer oyuncularla gerçek zamanlı savaş yap. Düşman adalarına saldır, kaynaklarını ele geçir ve sıralamada yüksel. Ordu gücünü artırarak daha güçlü düşmanları yenebilirsin.' },
  { emoji: '🏪', title: 'Pazar Yeri', desc: 'Diğer oyuncularla kaynak ticareti yap. Altın, odun, yiyecek ve enerji al-sat. Doğru fiyatla alım satım yaparak ekonomik üstünlük sağla.' },
  { emoji: '🏆', title: 'Liderlik Tablosu', desc: 'En güçlü oyuncularla yarış. Haftalık ödüller kazan ve şampiyonlar ligine gir. Liderlik tablosunda üst sıralara çıkarak diğer oyunculara meydan oku.' },
  { emoji: '⚓', title: 'Loncalar', desc: 'Kendi loncani kur ya da bir loncaya katıl. Takım halinde oyna, birlikte güçlen. Lonca üyeleriyle kaynak paylaş, ortak stratejiler geliştir.' },
  { emoji: '🎯', title: 'Günlük Görevler', desc: 'Her gün yeni görevler seni bekliyor. Görevleri tamamla, XP kazan ve seviye atla. Yeni seviyeler yeni binalar ve güçlendirmeler açar.' },
  { emoji: '🪙', title: 'TLCoin Ödül Sistemi', desc: 'Oyunda kazandığın altınları TLCoin\'e çevir. Biriken TLCoin\'lerle iPhone, laptop, masaüstü bilgisayar veya hediye çeki gibi gerçek ödüller kazan.' },
  { emoji: '🤝', title: 'Sosyal Özellikler', desc: 'Arkadaşlarını oyuna davet et, birlikte oyna. Arkadaş listesi oluştur, mesajlaş ve lonca üyeleriyle koordineli hamleler yap.' },
];

const STEPS = [
  { step: '1', title: 'Ücretsiz Kayıt Ol', desc: 'E-posta adresiyle saniyeler içinde hesap oluştur. Kredi kartı gerekmez, tamamen ücretsiz.' },
  { step: '2', title: 'Adanı Keşfet', desc: 'Başlangıç adana yerleştirilen kaynaklarla ilk binalarını inşa et. Altın madeni, odun fabrikası ve çiftliğini kur.' },
  { step: '3', title: 'Kaynakları Topla', desc: 'Binalarından düzenli üretim yap. Kaynakları topla, imparatorluğunu genişlet ve yeni adalar keşfet.' },
  { step: '4', title: 'Savaş ve Büyü', desc: 'Ordunu güçlendir, diğer oyunculara saldır ve liderlik tablosuna tırman. Loncana katılarak birlikte zafere ulaş.' },
];

const FAQ = [
  {
    q: 'Islands Empire tamamen ücretsiz mi?',
    a: 'Evet, Islands Empire tamamen ücretsizdir. Oyunun tüm temel özelliklerine ücretsiz olarak erişebilirsin. Kayıt olmak için kredi kartı bilgisi gerekmez.',
  },
  {
    q: 'Oyunu oynamak için ne gerekiyor?',
    a: 'Sadece modern bir tarayıcı (Chrome, Firefox, Safari, Edge) ve internet bağlantısına ihtiyacın var. Mobil cihazlardan da rahatça oynayabilirsin.',
  },
  {
    q: 'TLCoin ödülleri nasıl kazanılıyor?',
    a: 'Oyunda ürettiğin altınları haftada bir kez TLCoin\'e çevirebilirsin. 1.000 altın = 1 TLCoin. Biriktirdiğin TLCoin\'lerle ödül kataloğundaki gerçek ödülleri talep edebilirsin.',
  },
  {
    q: 'Başka oyuncularla savaşmak zorunlu mu?',
    a: 'Hayır, savaş tamamen isteğe bağlıdır. İstersen sadece ada inşasına ve kaynak yönetimine odaklanabilirsin. Ancak savaşlar ek kaynak kazanmanın en hızlı yollarından biridir.',
  },
  {
    q: 'Lonca nasıl kurulur?',
    a: 'Belirli bir seviyeye ulaştıktan sonra kendi loncanu kurabilir ve diğer oyuncuları davet edebilirsin. Lonca kurmanın yeterli seviyede değilsen, var olan lonculara katılabilirsin.',
  },
  {
    q: 'Verilerimin güvenliği nasıl sağlanıyor?',
    a: 'Kişisel verilerinin korunması önceliğimizdir. Şifrelerin güvenli şekilde hashlenmiş olarak saklanır. Detaylar için Gizlilik Politikamızı inceleyebilirsin.',
  },
];

const STATS = [
  { value: '10.000+', label: 'Kayıtlı Oyuncu' },
  { value: '50.000+', label: 'İnşa Edilen Bina' },
  { value: '100.000+', label: 'Savaş Yapıldı' },
  { value: '7/24', label: 'Aktif Sunucu' },
];

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f59e0b' }}>⚓ Islands Empire</div>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link to="/about" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>Hakkında</Link>
          <Link to="/how-to-play" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>Nasıl Oynanır?</Link>
          <Link to="/login" style={{ padding: '8px 20px', border: '1px solid #f59e0b', borderRadius: 8, color: '#f59e0b', textDecoration: 'none', fontSize: 14 }}>Giriş Yap</Link>
          <Link to="/register" style={{ padding: '8px 20px', background: '#f59e0b', borderRadius: 8, color: '#0f172a', textDecoration: 'none', fontSize: 14, fontWeight: 'bold' }}>Ücretsiz Oyna</Link>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 20px 60px' }}>
        <div style={{
          display: 'inline-block', background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.4)', borderRadius: 99,
          padding: '6px 18px', fontSize: 13, color: '#fcd34d', marginBottom: 24,
        }}>
          🎮 Ücretsiz Tarayıcı Strateji Oyunu
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 'bold', marginBottom: 20, lineHeight: 1.2 }}>
          Adanı İnşa Et,<br />
          <span style={{ color: '#f59e0b' }}>İmparatorluğunu Kur</span>
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 640, margin: '0 auto 16px', lineHeight: 1.7 }}>
          Islands Empire, tarayıcı tabanlı bir çok oyunculu strateji oyunudur. Adanı geliştir, kaynak topla,
          ticaret yap, diğer oyuncularla savaş ve liderlik tablosuna tırman.
        </p>
        <p style={{ fontSize: 15, color: '#64748b', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Kurulum gerektirmez. Kayıt ol ve hemen oyna. Gerçek ödüller kazanma şansı!
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" style={{
            display: 'inline-block', padding: '16px 40px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: 12, color: '#0f172a', textDecoration: 'none',
            fontSize: 18, fontWeight: 'bold',
            boxShadow: '0 4px 24px rgba(245,158,11,0.4)',
          }}>
            🎮 Hemen Oyna — Ücretsiz
          </Link>
          <Link to="/how-to-play" style={{
            display: 'inline-block', padding: '16px 32px',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12, color: '#e2e8f0', textDecoration: 'none', fontSize: 16,
          }}>
            Nasıl Oynanır?
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '40px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, textAlign: 'center' }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 20px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 'bold', marginBottom: 12, color: '#f1f5f9' }}>
          Nasıl Başlarsın?
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 48, fontSize: 15 }}>
          Dakikalar içinde oynamaya başla, saatler boyu eğlen.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {STEPS.map(s => (
            <div key={s.step} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 24,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 16,
              }}>
                {s.step}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '64px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 'bold', marginBottom: 12, color: '#f1f5f9' }}>
            Oyun Özellikleri
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 48, fontSize: 15 }}>
            Onlarca özellik, sınırsız strateji olasılığı.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 22,
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{f.emoji}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TLCoin Highlight */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '64px 20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(225,29,72,0.15), rgba(190,18,60,0.08))',
          border: '1px solid rgba(225,29,72,0.3)', borderRadius: 20, padding: '40px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🪙</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
            Gerçek Ödüller Kazan
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, marginBottom: 24, maxWidth: 560, margin: '0 auto 24px' }}>
            Islands Empire'ın benzersiz TLCoin sistemiyle oyun içi başarılarını gerçek dünya ödüllerine dönüştür.
            Altın biriktir, TLCoin kazan, iPhone 17, laptop veya hediye çeki gibi ödülleri talep et.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
            {[
              { emoji: '📱', name: 'iPhone 17', cost: '100.000 🪙' },
              { emoji: '💻', name: 'Laptop', cost: '50.000 🪙' },
              { emoji: '🖥️', name: 'Masaüstü PC', cost: '30.000 🪙' },
              { emoji: '🎁', name: 'Hediye Çeki', cost: '10.000 🪙' },
            ].map(p => (
              <div key={p.name} style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 12,
                padding: '12px 20px', textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ fontSize: 28 }}>{p.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 6 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.cost}</div>
              </div>
            ))}
          </div>
          <Link to="/register" style={{
            display: 'inline-block', padding: '13px 32px',
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            borderRadius: 12, color: '#fff', textDecoration: 'none',
            fontSize: 15, fontWeight: 700,
          }}>
            Ödül Kazanmaya Başla
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 20px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 'bold', marginBottom: 12, color: '#f1f5f9' }}>
            Sık Sorulan Sorular
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 48, fontSize: 15 }}>
            Aklına takılan soruların cevapları burada.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '20px 24px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                  {item.q}
                </h3>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '64px 20px 80px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 16, color: '#f1f5f9' }}>
          Hazır mısın, Kaptan?
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: 12, fontSize: 15 }}>
          10.000'den fazla oyuncuya katıl. Adanı kur, imparatorluğunu yönet.
        </p>
        <p style={{ color: '#64748b', marginBottom: 36, fontSize: 14 }}>
          Tamamen ücretsiz — kurulum yok, kredi kartı yok.
        </p>
        <Link to="/register" style={{
          display: 'inline-block', padding: '16px 48px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          borderRadius: 14, color: '#0f172a', textDecoration: 'none',
          fontSize: 18, fontWeight: 'bold',
          boxShadow: '0 4px 24px rgba(245,158,11,0.35)',
        }}>
          Ücretsiz Hesap Oluştur
        </Link>
        <p style={{ color: '#334155', fontSize: 12, marginTop: 16 }}>
          Zaten hesabın var mı?{' '}
          <Link to="/login" style={{ color: '#64748b', textDecoration: 'underline' }}>Giriş yap</Link>
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '28px 20px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        color: '#475569', fontSize: 13,
        background: 'rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
          <Link to="/about" style={{ color: '#64748b', textDecoration: 'none' }}>Hakkında</Link>
          <Link to="/how-to-play" style={{ color: '#64748b', textDecoration: 'none' }}>Nasıl Oynanır?</Link>
          <Link to="/privacy-policy" style={{ color: '#64748b', textDecoration: 'none' }}>Gizlilik Politikası</Link>
          <Link to="/login" style={{ color: '#64748b', textDecoration: 'none' }}>Giriş Yap</Link>
          <Link to="/register" style={{ color: '#64748b', textDecoration: 'none' }}>Kayıt Ol</Link>
        </div>
        <div style={{ color: '#334155' }}>© 2026 Islands Empire. Tüm hakları saklıdır.</div>
        <div style={{ color: '#1e293b', fontSize: 11, marginTop: 4 }}>
          Islands Empire — Ücretsiz tarayıcı tabanlı strateji oyunu
        </div>
      </footer>
    </div>
  );
}
