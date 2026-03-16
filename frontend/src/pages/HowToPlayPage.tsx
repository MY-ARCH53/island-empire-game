export default function HowToPlayPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>📖</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>Nasıl Oynanır?</h1>
          <p style={{ color: '#94a3b8', fontSize: 16 }}>Islands Empire'a yeni başlayanlar için rehber</p>
        </div>

        <section style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>1️⃣ Kayıt ve Başlangıç</h2>
          <ol style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li><strong style={{ color: '#e2e8f0' }}>Ücretsiz hesap oluşturun</strong> — islandsempire.com/register adresinden kayıt olun.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Oyunu başlatın</strong> — Giriş yaptıktan sonra "Oyunu Başlat" butonuna tıklayın.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Adanızı keşfedin</strong> — İlk adanız otomatik oluşturulur, binalarınızı inceleyin.</li>
          </ol>
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>2️⃣ Kaynaklar</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.8, marginBottom: 12 }}>Oyunda 4 temel kaynak vardır:</p>
          <ul style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li>🪵 <strong style={{ color: '#e2e8f0' }}>Odun</strong> — Bina inşaatı için gerekli</li>
            <li>🪨 <strong style={{ color: '#e2e8f0' }}>Taş</strong> — Güçlü binalar için gerekli</li>
            <li>🌾 <strong style={{ color: '#e2e8f0' }}>Yiyecek</strong> — Ordunuzu besler</li>
            <li>💰 <strong style={{ color: '#e2e8f0' }}>Altın</strong> — Gelişmiş binalar ve araştırmalar için gerekli</li>
          </ul>
          <p style={{ color: '#94a3b8', lineHeight: 1.8, marginTop: 12 }}>Kaynaklar üretim binaları tarafından otomatik üretilir. Adanızda ne kadar çok üretim binası varsa o kadar hızlı büyürsünüz.</p>
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>3️⃣ Binalar</h2>
          <ul style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li>🏠 <strong style={{ color: '#e2e8f0' }}>Üretim Binaları:</strong> Kaynakları otomatik üretir</li>
            <li>🗼 <strong style={{ color: '#e2e8f0' }}>Savunma Binaları:</strong> Adanızı düşman saldırılarından korur</li>
            <li>⚔️ <strong style={{ color: '#e2e8f0' }}>Kışla:</strong> Asker eğitir, saldırı gücünüzü artırır</li>
            <li>📦 <strong style={{ color: '#e2e8f0' }}>Depo:</strong> Daha fazla kaynak depolayabilirsiniz</li>
          </ul>
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>4️⃣ Savaş ve PvP</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.8 }}>
            Yeterli askere sahip olduğunuzda haritadan diğer oyuncuların adalarına saldırabilirsiniz. Savaşı kazanırsanız düşmanın kaynaklarının bir kısmını alırsınız. Savunmanızı güçlü tutmak için bariyer ve kule binaları inşa edin.
          </p>
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>5️⃣ İpuçları</h2>
          <ul style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li>✅ Her gün giriş yaparak <strong style={{ color: '#e2e8f0' }}>günlük ödül</strong> kazanın</li>
            <li>✅ Instagram hesabımızı takip ederek <strong style={{ color: '#e2e8f0' }}>%20 üretim bonusu</strong> alın</li>
            <li>✅ <strong style={{ color: '#e2e8f0' }}>Lonca</strong>ya katılarak diğer oyunculardan destek alın</li>
            <li>✅ <strong style={{ color: '#e2e8f0' }}>Görevleri</strong> tamamlayarak ekstra kaynak kazanın</li>
            <li>✅ Saldırı öncesi <strong style={{ color: '#e2e8f0' }}>kalkan</strong> aktif edin, kaynaklarınızı koruyun</li>
          </ul>
        </section>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', color: '#fff', padding: '14px 32px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
            🚀 Hemen Oyna — Ücretsiz
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#475569', fontSize: 13 }}>
          <a href="/about" style={{ color: '#475569', marginRight: 16 }}>Hakkında</a>
          <a href="/privacy-policy" style={{ color: '#475569' }}>Gizlilik Politikası</a>
        </div>
      </div>
    </div>
  );
}
