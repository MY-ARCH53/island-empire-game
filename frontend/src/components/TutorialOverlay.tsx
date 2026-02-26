import { useEffect, useState, useCallback } from 'react';

interface TutorialStep {
  selector: string | null;
  title: string;
  desc: string;
}

const STEPS: TutorialStep[] = [
  { selector: null,                          title: '⚓ Hoş Geldin Kaptan!',    desc: 'Adalar İmparatorluğu\'na katıldın! Sana kısa bir tur göstereyim.' },
  { selector: '[data-tutorial="resources"]', title: '💰 Kaynakların',           desc: 'Altın, tahta, yiyecek ve enerji — imparatorluğunun dört temel taşı!' },
  { selector: '[data-tutorial="buildings"]', title: '🏛️ Binaların',             desc: 'Her bina farklı bir kaynak üretir. Ne kadar çok bina, o kadar güçlü!' },
  { selector: '[data-tutorial="produce-btn"]',title: '⚡ Üretimi Başlat!',      desc: 'Bu butona bas ve üretimi başlat. Tamamlandığında "Topla" ile kazan!' },
  { selector: '[data-tutorial="battle-nav"]',title: '⚔️ Savaş Zamanı!',        desc: 'Korsanlara ve diğer oyunculara saldır, kaynak ele geçir, güçlen!' },
  { selector: '[data-tutorial="tasks-nav"]', title: '📋 Günlük Görevler',       desc: 'Görevleri tamamla, XP ve ödül kazan, seviye atla. Başarılar kaptan!' },
];

interface Rect { top: number; left: number; width: number; height: number; }

interface Props {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

export default function TutorialOverlay({ step, totalSteps, onNext, onSkip }: Props) {
  const [spotlightRect, setSpotlightRect] = useState<Rect | null>(null);
  const current = STEPS[step];
  const isLast = step === totalSteps - 1;
  const isWelcome = step === 0;

  const updateRect = useCallback(() => {
    if (!current.selector) { setSpotlightRect(null); return; }
    const el = document.querySelector(current.selector) as HTMLElement | null;
    if (!el) { setSpotlightRect(null); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      setSpotlightRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 400);
  }, [current.selector]);

  useEffect(() => {
    setSpotlightRect(null);
    updateRect();
  }, [updateRect]);

  // Tooltip pozisyonu: element ekranın alt yarısındaysa yukarı koy
  const tooltipBelow = spotlightRect ? spotlightRect.top < window.innerHeight * 0.5 : true;

  const PAD = 10;
  const sr = spotlightRect;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>

      {/* Welcome ekranı (step 0) */}
      {isWelcome && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 24px',
        }}>
          <div style={{
            background: 'linear-gradient(135deg,#1e3a5f,#0f2744)',
            border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: 24, padding: '36px 28px',
            textAlign: 'center', maxWidth: 340, width: '100%',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🏝️</div>
            <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>
              {current.title}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
              {current.desc}
            </p>
            {/* Adım göstergesi */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} style={{
                  width: i === step ? 20 : 8, height: 8, borderRadius: 4,
                  background: i === step ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                  transition: 'width 0.3s',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onSkip} style={{
                flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>
                Atla
              </button>
              <button onClick={onNext} style={{
                flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}>
                Başla! →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spotlight adımları (step 1+) */}
      {!isWelcome && (
        <>
          {/* Karanlık overlay: spotlight yoksa tam ekran karartma */}
          {!sr && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.78)' }} />
          )}

          {/* Spotlight penceresi (box-shadow trick) */}
          {sr && (
            <div style={{
              position: 'fixed',
              top: sr.top - PAD,
              left: sr.left - PAD,
              width: sr.width + PAD * 2,
              height: sr.height + PAD * 2,
              borderRadius: 14,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
              border: '2px solid rgba(255,255,255,0.3)',
              pointerEvents: 'none',
              zIndex: 10001,
              transition: 'top 0.3s, left 0.3s, width 0.3s, height 0.3s',
            }} />
          )}

          {/* Tooltip */}
          <div style={{
            position: 'fixed',
            zIndex: 10002,
            left: sr ? Math.min(Math.max(sr.left - 8, 8), window.innerWidth - 316) : 16,
            ...(sr
              ? tooltipBelow
                ? { top: sr.top + sr.height + PAD + 16 }
                : { bottom: window.innerHeight - (sr.top - PAD) + 12 }
              : { top: '50%', transform: 'translateY(-50%)' }
            ),
            width: 300,
            background: 'linear-gradient(135deg,#1e293b,#0f172a)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 18,
            padding: '18px 20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Ok işareti */}
            {sr && (
              <div style={{
                position: 'absolute',
                [tooltipBelow ? 'top' : 'bottom']: -8,
                left: 24,
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                [tooltipBelow ? 'borderBottom' : 'borderTop']: '8px solid rgba(255,255,255,0.15)',
              }} />
            )}

            <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>
              {current.title}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
              {current.desc}
            </p>

            {/* Adım göstergesi */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} style={{
                  height: 5, borderRadius: 3,
                  flex: i === step ? 2 : 1,
                  background: i < step ? '#3b82f6' : i === step ? '#60a5fa' : 'rgba(255,255,255,0.15)',
                  transition: 'flex 0.3s',
                }} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onSkip} style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>
                Atla
              </button>
              <button onClick={onNext} style={{
                flex: 2, padding: '10px 0', borderRadius: 10, border: 'none',
                background: isLast
                  ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                  : 'linear-gradient(135deg,#3b82f6,#2563eb)',
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                {isLast ? 'Tamamla 🎉' : 'Devam →'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
