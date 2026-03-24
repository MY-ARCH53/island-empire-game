import { Link } from 'react-router-dom';

export default function AboutPage() {
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
          <Link to="/how-to-play" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>Nasıl Oynanır?</Link>
          <Link to="/contact" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>İletişim</Link>
          <Link to="/register" style={{ background: '#f59e0b', color: '#0f172a', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Oyna</Link>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🏝️</div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>Islands Empire Hakkında</h1>
          <p style={{ color: '#94a3b8', fontSize: 17, lineHeight: 1.7, maxWidth: 620, margin: '0 auto' }}>
            Türkiye'de geliştirilen, binlerce oyuncunun her gün zevkle oynadığı ücretsiz tarayıcı strateji oyunu.
          </p>
        </div>

        {/* Oyun Nedir */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 14 }}>🎮 Islands Empire Nedir?</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Islands Empire, tarayıcınızda oynanabilen ücretsiz bir çok oyunculu strateji oyunudur. Herhangi bir uygulama indirmenize veya güçlü bir bilgisayara ihtiyacınız yoktur. Chrome, Firefox, Safari veya Edge gibi modern bir tarayıcı ve internet bağlantısı yeterlidir.
          </p>
          <p style={{ color: '#94a3b8', lineHeight: 1.85 }}>
            Oyunda kendi adanızı sıfırdan kurarsınız. Doğal kaynakları toplayarak binalar inşa eder, ordunuzu büyütür ve diğer oyuncularla rekabet edersiniz. Stratejik kararlarınız imparatorluğunuzun kaderini belirler. Ticaret yaparak ekonominizi güçlendirebilir, loncalara katılarak takım ruhuyla büyüyebilir ya da tek başınıza zirveye ulaşmayı hedefleyebilirsiniz.
          </p>
        </section>

        {/* Misyon */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 14 }}>🎯 Misyonumuz</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Amacımız, Türkiye'deki oyunculara yüksek kaliteli, erişilebilir ve tamamen ücretsiz bir strateji oyunu deneyimi sunmaktır. Pahalı ekipmanlara ya da ücretli aboneliklere ihtiyaç duymadan eğlenceli vakit geçirebileceğiniz bir platform yaratmayı hedefliyoruz.
          </p>
          <p style={{ color: '#94a3b8', lineHeight: 1.85 }}>
            Islands Empire'ı geliştirirken oyuncu deneyimini her şeyin önünde tutuyoruz. Topluluğumuzun geri bildirimlerini dinliyor, düzenli güncellemeler yapıyor ve oyunu sürekli iyileştirmeye devam ediyoruz. Oyuncularımızın sesi bizim için en değerli yol göstericidir.
          </p>
        </section>

        {/* Özellikler */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 14 }}>⚙️ Temel Özellikler</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              { icon: '🏝️', title: 'Ada İnşası ve Yönetimi', desc: 'Adanı özelleştir, binalar yaptır, kaynakları stratejik şekilde yönet.' },
              { icon: '⚔️', title: 'Gerçek Zamanlı PvP', desc: 'Diğer oyuncuların adalarına saldır, kaynak kazan, liderlik tablosuna çık.' },
              { icon: '🏪', title: 'Canlı Pazar', desc: 'Oyuncular arası alım-satım sistemi. Altın, odun, yiyecek, enerji ticareti.' },
              { icon: '⚓', title: 'Lonca Sistemi', desc: 'Lonca kur veya katıl, takım halinde büyü, ortak hedefler için strateji geliştir.' },
              { icon: '🏆', title: 'Lig ve Sıralamalar', desc: 'Haftalık lig sistemi, puan tablosu ve dönemsel ödüller.' },
              { icon: '🪙', title: 'TLCoin Ödül Kataloğu', desc: 'Oyun içi başarılarını iPhone, laptop ve hediye çeki gibi gerçek ödüllere dönüştür.' },
              { icon: '🎯', title: 'Görev Sistemi', desc: 'Günlük ve haftalık görevler, ekstra kaynak ve XP kazandırır.' },
              { icon: '🛡️', title: 'Korsan Savaşları', desc: 'Korsan saldırılarını geri püskürterek adalara özel savunma kazanabilirsin.' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.title}</p>
                  <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TLCoin */}
        <section style={{ background: 'linear-gradient(135deg, rgba(225,29,72,0.12), rgba(15,23,42,0.95))', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(225,29,72,0.25)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fda4af', marginBottom: 14 }}>🪙 TLCoin: Gerçek Ödül Sistemi</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Islands Empire'ın en özgün özelliklerinden biri olan TLCoin sistemi, oyun içi başarılarınızı gerçek dünya değerine dönüştürmenize olanak tanır. Oyunda ürettiğiniz altınları haftada bir kez TLCoin'e çevirebilirsiniz (1.000 altın = 1 TLCoin).
          </p>
          <p style={{ color: '#94a3b8', lineHeight: 1.85 }}>
            Biriktirdiğiniz TLCoin'lerle Sezon 1 Ödül Kataloğumuzdan iPhone 17, dizüstü bilgisayar, masaüstü PC veya 10.000 TL değerinde hediye çeki talep edebilirsiniz. Ödüller, onaylandıktan sonra kargo ya da dijital olarak iletilir. Bu sistem düzenli oyuncuları ödüllendirmek ve topluluğumuzu büyütmek amacıyla tasarlanmıştır.
          </p>
        </section>

        {/* Teknik */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 14 }}>🛠️ Teknik Altyapı</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Islands Empire, modern web teknolojileriyle geliştirilmiştir. Frontend tarafında React ve TypeScript kullanılmış; hızlı yükleme süreleri için Vite ile optimize edilmiştir. Backend tarafında Node.js ve Express.js tercih edilmiş, veriler PostgreSQL veritabanında güvenli şekilde saklanmaktadır.
          </p>
          <p style={{ color: '#94a3b8', lineHeight: 1.85 }}>
            Sunucularımız 7/24 aktif olup Avrupa'da barındırılmaktadır. HTTPS şifrelemesi ile tüm veri iletimi güvence altındadır. Kullanıcı şifreleri hiçbir zaman açık metin olarak saklanmaz; bcrypt ile güvenli şekilde hashlenir.
          </p>
        </section>

        {/* Sık Sorulan */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>❓ Sık Sorulan Sorular</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { q: 'Oyun ücretli mi?', a: 'Hayır. Islands Empire tamamen ücretsizdir. Kayıt olmak, oynamak ve tüm temel özellikleri kullanmak ücretsizdir. Herhangi bir ödeme bilgisi istenmez.' },
              { q: 'Mobil cihazdan oynayabilir miyim?', a: 'Evet. Islands Empire mobil uyumlu (responsive) tasarıma sahiptir. Akıllı telefon veya tabletinizin tarayıcısından kolayca erişebilirsiniz.' },
              { q: 'Hesabımı nasıl silebilirim?', a: 'Hesap silme talebinizi info@islandsempire.com adresine e-posta göndererek iletebilirsiniz. En geç 7 iş günü içinde hesabınız ve verileriniz silinir.' },
              { q: 'Reklam var mı?', a: 'Ücretsiz hizmetimizi sürdürebilmek için içerik sayfalarında Google AdSense reklamları gösterilmektedir. Oyun sırasında reklam gösterilmez.' },
            ].map((item, i) => (
              <div key={i} style={{ borderLeft: '3px solid rgba(56,189,248,0.4)', paddingLeft: 16 }}>
                <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{item.q}</p>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* İletişim */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 40, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 14 }}>📬 İletişim</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 16 }}>
            Sorularınız, önerileriniz, hata bildirimleri veya teknik destek için bize ulaşabilirsiniz. En kısa sürede yanıt vermeye çalışırız.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>📧</span>
              <div>
                <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 2 }}>E-posta</p>
                <a href="mailto:info@islandsempire.com" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}>info@islandsempire.com</a>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🌐</span>
              <div>
                <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 2 }}>Web sitesi</p>
                <a href="https://islandsempire.com" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}>islandsempire.com</a>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <Link to="/contact" style={{
              display: 'inline-block', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              color: '#fff', padding: '11px 24px', borderRadius: 10, textDecoration: 'none',
              fontWeight: 700, fontSize: 14,
            }}>
              İletişim Sayfasına Git →
            </Link>
          </div>
        </section>

        <div style={{ textAlign: 'center' }}>
          <Link to="/register" style={{
            display: 'inline-block', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#0f172a', padding: '15px 40px', borderRadius: 12, textDecoration: 'none',
            fontWeight: 800, fontSize: 17, boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
          }}>
            Hemen Oyna — Ücretsiz
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Ana Sayfa</Link>
          <Link to="/how-to-play" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Nasıl Oynanır?</Link>
          <Link to="/privacy-policy" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Gizlilik Politikası</Link>
          <Link to="/contact" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>İletişim</Link>
        </div>
      </div>
    </div>
  );
}
