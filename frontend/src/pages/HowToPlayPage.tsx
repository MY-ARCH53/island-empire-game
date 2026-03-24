import { Link } from 'react-router-dom';

export default function HowToPlayPage() {
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
          <Link to="/contact" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>İletişim</Link>
          <Link to="/register" style={{ background: '#f59e0b', color: '#0f172a', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Oyna</Link>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>📖</div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>Nasıl Oynanır?</h1>
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
            Islands Empire'a yeni başlayanlar için adım adım kapsamlı rehber.
            Stratejilerini geliştir, imparatorluğunu büyüt!
          </p>
        </div>

        {/* İçindekiler */}
        <nav style={{ background: '#1e293b', borderRadius: 14, padding: '20px 24px', marginBottom: 32, border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14, marginBottom: 12, letterSpacing: 1 }}>İÇİNDEKİLER</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {['1. Kayıt ve Başlangıç', '2. Kaynaklar', '3. Binalar', '4. Üretim Sistemi', '5. Savaş ve PvP', '6. Korsan Savaşları', '7. Loncalar', '8. Pazar Yeri', '9. Görevler', '10. TLCoin Sistemi', '11. Günlük Ödüller', '12. Strateji İpuçları'].map((item, i) => (
              <span key={i} style={{ color: '#64748b', fontSize: 13 }}>{item}</span>
            ))}
          </div>
        </nav>

        {/* 1 - Başlangıç */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>1️⃣ Kayıt ve Başlangıç</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Islands Empire'a başlamak çok kolaydır. Kayıt için herhangi bir ödeme bilgisi gerekmez.
          </p>
          <ol style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li><strong style={{ color: '#e2e8f0' }}>Kayıt Ol:</strong> islandsempire.com/register adresine git, kullanıcı adı, e-posta ve şifre belirle.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Giriş Yap:</strong> Kayıttan sonra otomatik giriş yapılır, doğrudan oyun ekranına yönlendirilirsin.</li>
            <li><strong style={{ color: '#e2e8f0' }}>İlk Adanı Keşfet:</strong> Başlangıç adanın sana otomatik olarak atanır. Binalarını ve kaynaklarını incele.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Tutorial'ı Tamamla:</strong> İlk girişte kısa bir rehber tur gösterilir. Bu turu tamamlayarak temel mekanikleri öğren.</li>
          </ol>
        </section>

        {/* 2 - Kaynaklar */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>2️⃣ Kaynaklar</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Oyunda 4 temel kaynak vardır. Tüm binalar, ordu ve adalar bu kaynaklar kullanılarak yönetilir.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
            {[
              { icon: '💰', color: '#f59e0b', name: 'Altın', desc: 'En değerli kaynak. Bina yükseltme, TLCoin dönüşümü ve ticaret için kullanılır.' },
              { icon: '🪵', color: '#10b981', name: 'Odun', desc: 'İnşaat ve bina geliştirme için gerekli. Odun fabrikasında üretilir.' },
              { icon: '🍎', color: '#ef4444', name: 'Yiyecek', desc: 'Ordunun beslenmesi için gerekli. Tarla binalarında üretilir.' },
              { icon: '⚡', color: '#06b6d4', name: 'Enerji', desc: 'Otomatik üretim sistemi için kullanılır. Trafo binasında üretilir.' },
            ].map(r => (
              <div key={r.name} style={{ background: `rgba(255,255,255,0.04)`, borderRadius: 12, padding: 14, border: `1px solid ${r.color}33` }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{r.icon}</div>
                <p style={{ color: r.color, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{r.name}</p>
                <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>{r.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, fontSize: 14 }}>
            <strong style={{ color: '#e2e8f0' }}>İpucu:</strong> Kaynaklar depolarda birikerek taşar. Depo kapasiteni düzenli olarak artır ve kaynakları zamanında topla, yoksa kayıp yaşarsın.
          </p>
        </section>

        {/* 3 - Binalar */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>3️⃣ Binalar ve Yükseltmeler</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Binalar imparatorluğunun temel yapı taşlarıdır. Her bina farklı bir işlev görür ve seviye atlayarak güçlenir.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '⚡', name: 'Trafo', desc: 'Enerji üretir. Otomatik üretim sistemi için zorunlu. Seviye atlayınca daha fazla enerji depolar.' },
              { icon: '🌾', name: 'Tarla', desc: 'Yiyecek üretir. Ordunun bakımı için yiyeceğe ihtiyaç vardır.' },
              { icon: '🪵', name: 'Odun Fabrikası', desc: 'Odun üretir. Bina inşası için temel hammadde.' },
              { icon: '⛏️', name: 'Maden', desc: 'Altın üretir. En kritik kaynak kaynağı. Her zaman öncelikli yükselt.' },
              { icon: '🏰', name: 'Kale', desc: 'Adanı saldırılara karşı korur. Savunma gücünü artırır.' },
              { icon: '⚔️', name: 'Kışla', desc: 'Saldırı gücü sağlar. PvP savaşları için güçlü kışla şart.' },
            ].map(b => (
              <div key={b.name} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 24, minWidth: 32 }}>{b.icon}</span>
                <div>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{b.name}: </span>
                  <span style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{b.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4 - Üretim */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>4️⃣ Üretim Sistemi</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Islands Empire'da iki farklı üretim modu bulunur:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 12, padding: 18, border: '1px solid rgba(59,130,246,0.2)' }}>
              <p style={{ color: '#93c5fd', fontWeight: 700, marginBottom: 8 }}>Manuel Üretim</p>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.65 }}>
                Her binanın "Üret" butonuna tıklayarak o binadaki üretimi başlatırsın. Üretim tamamlandıktan sonra "Topla" ile kaynağı alırsın. Daha az enerji gerektirir.
              </p>
            </div>
            <div style={{ background: 'rgba(6,182,212,0.08)', borderRadius: 12, padding: 18, border: '1px solid rgba(6,182,212,0.2)' }}>
              <p style={{ color: '#67e8f9', fontWeight: 700, marginBottom: 8 }}>Otomatik Üretim</p>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.65 }}>
                Enerji harcayarak tüm binaların otomatik üretim yapmasını sağlarsın. Oyunu kapatsan bile üretim devam eder. Zamanını verimli kullanmak için ideal.
              </p>
            </div>
          </div>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginTop: 14, fontSize: 14 }}>
            <strong style={{ color: '#e2e8f0' }}>Strateji:</strong> Oyun başında manuel üretimle kaynak biriktir. Enerji fazlalaştığında oto-üretime geç. Instagram hesabımızı takip edersen üretim miktarı %20 artar!
          </p>
        </section>

        {/* 5 - Savaş */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>5️⃣ Savaş ve PvP Sistemi</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Savaş sistemi, oyundaki en heyecanlı kısımdır. Güçlü bir ordu kurarak diğer oyuncuların kaynaklarına göz dikebilirsin.
          </p>
          <ol style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20, marginBottom: 14 }}>
            <li><strong style={{ color: '#e2e8f0' }}>Hedef Seç:</strong> Savaş ekranından seviyene yakın bir oyuncu seç. Çok güçlü düşmanlarla savaşmak kayıpla sonuçlanır.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Güç Karşılaştır:</strong> Senin toplam gücün ile düşmanın savunma gücünü karşılaştır. Daha yüksek güç, galip gelme şansını artırır.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Saldır:</strong> Saldırıyı başlat. Galip gelirsen düşmanın kaynaklarının bir bölümünü kazanırsın.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Kalkan Kullan:</strong> Saldırıya uğramamak için kalkan aktiflediğinde 8 saat boyunca koruma altındasın.</li>
          </ol>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, fontSize: 14 }}>
            <strong style={{ color: '#e2e8f0' }}>Günlük Limit:</strong> PvP saldırılarında günlük limit uygulanır. Limiti doldurunca saldırı haklarını ertesi gün yenilenir.
          </p>
        </section>

        {/* 6 - Korsan */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>6️⃣ Korsan Savaşları</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Korsan savaşları, gerçek oyuncularla değil yapay zeka kontrolündeki korsan gemileriyle yapılır. Daha az risk, yine de iyi ödüller!
          </p>
          <ul style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li>Günde <strong style={{ color: '#e2e8f0' }}>10 korsan saldırı hakkın</strong> vardır.</li>
            <li>Her başarılı saldırıda altın ve kaynak kazanırsın.</li>
            <li>10 hakkın bitince <strong style={{ color: '#e2e8f0' }}>reklam izleyerek</strong> sayacı sıfırlayabilirsin.</li>
            <li>Korsan güçleri farklı seviyelerdedir; seviyene uygun olanı seç.</li>
          </ul>
        </section>

        {/* 7 - Loncalar */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>7️⃣ Lonca Sistemi</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Loncalar, birden fazla oyuncunun bir araya gelerek oluşturduğu topluluklardır. Loncaya katılmak güçlü avantajlar sağlar.
          </p>
          <ul style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li><strong style={{ color: '#e2e8f0' }}>Lonca Kur:</strong> Belirli seviyeye ulaştıktan sonra kendi loncanu kurabilirsin.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Üye Kabul Et:</strong> Diğer oyuncuları davet ederek loncani büyüt.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Takım Stratejisi:</strong> Lonca üyeleriyle koordineli saldırılar yapabilirsin.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Lonca Ödülleri:</strong> Lonca sıralamasına göre ek ödüller kazanılır.</li>
          </ul>
        </section>

        {/* 8 - Pazar */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>8️⃣ Pazar Yeri</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Pazar yeri, oyuncular arası kaynak alım-satımının yapıldığı yerdir. Fazla kaynakları satarak altın kazanabilir veya ihtiyacın olan kaynağı satın alabilirsin.
          </p>
          <ul style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li>Altın, odun, yiyecek ve enerji alım-satımı yapılabilir.</li>
            <li>Fiyatlar pazar arz-talep dengesine göre değişir.</li>
            <li>Düşük fiyata al, yüksek fiyata sat — ekonomik strateji önemli!</li>
            <li>Aktif talepler anlık güncellenir.</li>
          </ul>
        </section>

        {/* 9 - Görevler */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>9️⃣ Görev Sistemi</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Her gün ve her hafta seni bekleyen görevler, oyunun en ödüllendirici kısımlarından biridir.
          </p>
          <ul style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li><strong style={{ color: '#e2e8f0' }}>Günlük Görevler:</strong> "5 üretim yap", "1 savaş kazan" gibi basit görevler. Her gün yenilenir.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Seviye Görevleri:</strong> Seviye atlayınca yeni görevler açılır. Daha zor ama daha ödüllü.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Ödüller:</strong> XP (deneyim puanı), altın ve özel kaynaklar kazanırsın.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Seviye Atlama:</strong> Yeterli XP toplandığında seviye atlarsın; yeni binalar ve özellikler açılır.</li>
          </ul>
        </section>

        {/* 10 - TLCoin */}
        <section style={{ background: 'linear-gradient(135deg, rgba(225,29,72,0.10), rgba(15,23,42,0.95))', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(225,29,72,0.25)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fda4af', marginBottom: 16 }}>🔟 TLCoin Sistemi</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            TLCoin, oyun içi altınları gerçek dünya ödüllerine dönüştürme sistemidir. Bu Islands Empire'ın en özgün özelliğidir.
          </p>
          <ol style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20, marginBottom: 14 }}>
            <li>Oyunda altın biriktir (maden binalary + günlük görevler + savaşlar).</li>
            <li>TLCoin sayfasına git — <strong style={{ color: '#fda4af' }}>1.000 altın = 1 TLCoin</strong> oranıyla dönüştür.</li>
            <li>Dönüşüm haftada bir kez yapılabilir.</li>
            <li>Biriken TLCoin'lerle ödül kataloğundan talep gönder.</li>
            <li>Admin onayından sonra ödül kargo/dijital olarak gönderilir.</li>
          </ol>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {[
              { emoji: '📱', name: 'iPhone 17', cost: '100.000 TLCoin' },
              { emoji: '💻', name: 'Laptop', cost: '50.000 TLCoin' },
              { emoji: '🖥️', name: 'Masaüstü PC', cost: '30.000 TLCoin' },
              { emoji: '🎁', name: 'Hediye Çeki', cost: '10.000 TLCoin' },
            ].map(p => (
              <div key={p.name} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 26 }}>{p.emoji}</div>
                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13, marginTop: 4 }}>{p.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{p.cost}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 11 - Günlük Ödül */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>1️⃣1️⃣ Günlük Giriş Ödülleri</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.85, marginBottom: 14 }}>
            Her gün oyuna giriş yaptığında bonus kaynaklar kazanırsın. Ardışık gün sayısı arttıkça ödüller büyür.
          </p>
          <ul style={{ color: '#94a3b8', lineHeight: 2.2, paddingLeft: 20 }}>
            <li>1. gün: Temel kaynak paketi</li>
            <li>3. gün: Artırılmış altın ödülü</li>
            <li>7. gün: Büyük ödül paketi + TLCoin ipucu</li>
            <li>Zinciri kırma! Her gün giriş yaparak maksimum ödül topla.</li>
          </ul>
        </section>

        {/* 12 - İpuçları */}
        <section style={{ background: '#1e293b', borderRadius: 16, padding: 28, marginBottom: 40, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>1️⃣2️⃣ Uzman Strateji İpuçları</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '✅', tip: 'Maden binasını öncelikle yükselt', detail: 'Altın en kritik kaynaktır. Maden seviyesi yükseldikçe diğer her şeyi hızlandırır.' },
              { icon: '✅', tip: 'Her gün giriş yap', detail: 'Günlük ödül zincirini kırmamak uzun vadede büyük avantaj sağlar.' },
              { icon: '✅', tip: 'Instagram takibi ile %20 bonus', detail: 'Oyunun Instagram hesabını takip et, üretim boostunu aktifle. Hiçbir şey yapmadan %20 daha fazla kaynak.' },
              { icon: '✅', tip: 'Saldırı öncesi kalkan kontrol et', detail: 'Çok kaynak biriktirdiysen ve giriş yapmayacaksan kalkanı aktifle.' },
              { icon: '✅', tip: 'Pazar fiyatlarını takip et', detail: 'Pazar yeri fiyatları dalgalanır. Ucuzken al, değer artınca sat.' },
              { icon: '✅', tip: 'Lonca üyelerinden destek al', detail: 'Aktif lonca üyeleri saldırı uyarısı yapabilir, birlikte güçlü bir savunma kurulabilir.' },
              { icon: '✅', tip: 'Görevleri ihmal etme', detail: 'Günlük görevleri tamamlamak XP ve kaynak kazandırır. Seviye atlamak yeni güçler açar.' },
              { icon: '✅', tip: 'Enerji biriktir, oto-üretimi akıllı kullan', detail: '1000 enerjin varsa oto-üretime geç. Oyunu kapatsan bile kaynaklar üretilmeye devam eder.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, minWidth: 24 }}>{item.icon}</span>
                <div>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{item.tip}: </span>
                  <span style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/register" style={{
            display: 'inline-block', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#0f172a', padding: '15px 40px', borderRadius: 12, textDecoration: 'none',
            fontWeight: 800, fontSize: 17, boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
          }}>
            Hemen Oyna — Ücretsiz
          </Link>
        </div>

        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Ana Sayfa</Link>
          <Link to="/about" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Hakkında</Link>
          <Link to="/privacy-policy" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>Gizlilik Politikası</Link>
          <Link to="/contact" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>İletişim</Link>
        </div>
      </div>
    </div>
  );
}
