export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🏝️</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>Islands Empire Hakkında</h1>
          <p style={{ color: '#94a3b8', fontSize: 16 }}>Tarayıcı tabanlı strateji oyunu</p>
        </div>

        <section style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>🎮 Oyun Nedir?</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.8 }}>
            Islands Empire, tarayıcınızda oynayabileceğiniz ücretsiz bir strateji oyunudur. Kendi adanızı kurun, kaynaklar toplayın, binalar inşa edin ve diğer oyuncularla rekabet edin. Herhangi bir uygulama indirmenize gerek yok — sadece bir internet bağlantısı yeterli.
          </p>
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>⚔️ Ne Yapabilirsiniz?</h2>
          <ul style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li><strong style={{ color: '#e2e8f0' }}>Ada Yönetimi:</strong> Kendi adanızı özelleştirin, binalar inşa edin ve kaynakları yönetin.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Kaynak Üretimi:</strong> Odun, taş, altın ve yiyecek toplayarak imparatorluğunuzu büyütün.</li>
            <li><strong style={{ color: '#e2e8f0' }}>PvP Savaşları:</strong> Diğer oyuncuların adalarına saldırın ve kaynak ele geçirin.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Loncalar:</strong> Diğer oyuncularla lonca kurun, birlikte güçlenin.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Sıralamalar:</strong> Lig sisteminde üst sıralara çıkın ve ödüller kazanın.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Günlük Ödüller:</strong> Her gün giriş yaparak bonus kaynaklar kazanın.</li>
          </ul>
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>🌍 Kimler İçin?</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.8 }}>
            Islands Empire, strateji oyunlarını seven herkes için tasarlanmıştır. İster günde birkaç dakikanızı ayıran casual bir oyuncu olun, ister saatler harcayan bir strateji meraklısı — oyun her iki tarza da hitap eder. Tamamen ücretsizdir ve kayıt olmak sadece birkaç saniye sürer.
          </p>
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>📬 İletişim</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.8 }}>
            Sorularınız, önerileriniz veya sorunlar için bize ulaşabilirsiniz:<br />
            <strong style={{ color: '#38bdf8' }}>info@islandsempire.com</strong>
          </p>
        </section>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', color: '#fff', padding: '14px 32px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
            🚀 Hemen Oyna — Ücretsiz
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#475569', fontSize: 13 }}>
          <a href="/privacy-policy" style={{ color: '#475569', marginRight: 16 }}>Gizlilik Politikası</a>
          <a href="/how-to-play" style={{ color: '#475569' }}>Nasıl Oynanır?</a>
        </div>
      </div>
    </div>
  );
}
