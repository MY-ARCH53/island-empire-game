import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { guildAPI, battleAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';

// Klan Savaşı — Battle Demo entegrasyon sayfası
// URL: /klan-savas?warId=X&defenderId=Y&defName=Z&castleLevel=N

export default function KlanSavasPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { showToast } = useToast();

  const warId       = parseInt(params.get('warId') || '0');
  const defenderId  = parseInt(params.get('defenderId') || '0');
  const defName     = params.get('defName') || 'Rakip';
  const castleLevel = parseInt(params.get('castleLevel') || '1');

  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  if (!token || !userData) { navigate('/'); return null; }
  const me = JSON.parse(userData);

  const [phase, setPhase] = useState<'briefing' | 'battle' | 'result' | 'saved'>('briefing');
  const [result, setResult] = useState<{ stars: number; damage: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [army, setArmy] = useState<any>(null);

  // Klan askerlerini de kullanabiliriz — şimdilik kişisel ordu
  useEffect(() => {
    battleAPI.getArmy(me.id)
      .then((r: any) => setArmy(r.data.data.army ?? {}))
      .catch(() => setArmy({ infantry_count: 20, archer_count: 15, cavalry_count: 8 }));
  }, []);

  // Battle Demo'dan postMessage dinle
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'clan_war_result') {
        setResult({ stars: e.data.stars, damage: e.data.damage });
      }
      if (e.data?.type === 'clan_war_confirm') {
        // Kullanıcı "Sonucu Kaydet" butonuna bastı
        handleSaveResult();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [result]);

  const handleSaveResult = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      await guildAPI.recordWarAttack(warId, defenderId, result.stars, result.damage);
      showToast(`Saldırı kaydedildi! ${result.stars} yıldız! ⭐`, 'success');
      setPhase('saved');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Kayıt hatası', 'error');
    }
    setSaving(false);
  };

  const inf = army?.infantry_count ?? 20;
  const arc = army?.archer_count ?? 15;
  const cav = army?.cavalry_count ?? 8;
  const gameUrl = `/game/index.html?infantry=${inf}&archer=${arc}&cavalry=${cav}&mode=clan_war&castle_level=${castleLevel}&_=${Date.now()}`;

  const castleEmojis = ['🏚️','🏠','🏠','🏰','🏰','🏯','🏯','🗼','🗼','⚔️'];
  const castleEmoji = castleEmojis[Math.min(castleLevel, castleEmojis.length - 1)];

  const S = {
    page: { minHeight: '100vh', background: '#080c16', color: '#e2e8f0', fontFamily: "'Exo 2', sans-serif", display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    header: { background: 'rgba(8,12,22,0.98)', borderBottom: '2px solid #1c2844', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 } as React.CSSProperties,
    card: { background: 'linear-gradient(135deg,#0f1629,#0a1020)', border: '1px solid #1c2844', borderRadius: 16, padding: 24 } as React.CSSProperties,
    btn: (c = '#7c3aed') => ({ background: `linear-gradient(135deg,${c},${c}cc)`, border: 'none', borderRadius: 10, color: '#fff', padding: '12px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }) as React.CSSProperties,
  };

  // ── BRIEFING EKRANI ──
  if (phase === 'briefing') {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <button onClick={() => navigate('/klan')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>←</button>
          <span style={{ color: '#ffd700', fontWeight: 700 }}>⚔️ Klan Savaşı</span>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 480, width: '100%' }}>
            <div style={S.card}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 64, marginBottom: 8 }}>⚔️</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#ffd700' }}>Saldırı Hazırlığı</div>
              </div>

              {/* Saldırı bilgisi */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 24 }}>
                {/* Saldıran */}
                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 32 }}>🗡️</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{me.username}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Sen</div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: '#60a5fa' }}>🗡️{inf}</span>
                    <span style={{ color: '#10b981' }}>🏹{arc}</span>
                    <span style={{ color: '#8b5cf6' }}>🐎{cav}</span>
                  </div>
                </div>

                <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>VS</div>

                {/* Savunan */}
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 32 }}>{castleEmoji}</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{defName}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Rakip</div>
                  <div style={{ marginTop: 8, fontSize: 13, color: '#ef4444' }}>
                    🏰 Kale Lv{castleLevel}
                  </div>
                </div>
              </div>

              {/* Kale bilgisi */}
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>🛡️ Savunma Bilgisi</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Rakip kale <strong style={{ color: '#ffd700' }}>Seviye {castleLevel}</strong> — Bina HP %{Math.round((1 + (castleLevel-1)*0.4 - 1) * 100)} daha yüksek, savunma hasarı %{Math.round((castleLevel-1)*20)} artmış.
                </div>
              </div>

              {/* Yıldız sistemi */}
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700, marginBottom: 6 }}>⭐ Yıldız Sistemi</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>⭐ 1 Yıldız — %50 yıkım veya Belediye yıkıldı</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>⭐⭐ 2 Yıldız — %80 yıkım</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>⭐⭐⭐ 3 Yıldız — %100 yıkım</div>
                </div>
              </div>

              <button
                style={{ ...S.btn('#ef4444'), width: '100%', fontSize: 18, padding: '14px' }}
                onClick={() => setPhase('battle')}
                disabled={!army}
              >
                ⚔️ Saldırıya Başla!
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SAVAŞ EKRANI ──
  if (phase === 'battle') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#080c16', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>
        {/* Üst bar */}
        <div style={S.header}>
          <button onClick={() => { if (confirm('Savaştan çıkmak istediğinize emin misiniz? Sonuç kaydedilmez.')) navigate('/klan'); }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
            ← Vazgeç
          </button>
          <span style={{ color: '#ffd700', fontWeight: 700 }}>⚔️ Klan Savaşı — {me.username} vs {defName}</span>
          <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 700, marginLeft: 8 }}>
            KALE LV{castleLevel}
          </span>

          {/* Sonuç gelince kaydet butonu */}
          {result && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#ffd700', fontWeight: 700 }}>{'⭐'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)} %{result.damage}</span>
              <button
                style={S.btn(saving ? '#475569' : '#7c3aed')}
                onClick={handleSaveResult}
                disabled={saving}
              >
                {saving ? 'Kaydediliyor...' : '✅ Sonucu Kaydet'}
              </button>
            </div>
          )}
        </div>

        {/* Oyun iframe */}
        <iframe
          src={gameUrl}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
          title="Klan Savaşı"
          allow="autoplay"
        />
      </div>
    );
  }

  // ── SONUÇ KAYDEDILDI ──
  return (
    <div style={S.page}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ ...S.card, maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {(result?.stars ?? 0) >= 1 ? '🏆' : '💔'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: (result?.stars ?? 0) >= 1 ? '#ffd700' : '#ef4444', marginBottom: 8 }}>
            {(result?.stars ?? 0) >= 1 ? 'ZAFER!' : 'YENİLGİ!'}
          </div>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {'⭐'.repeat(result?.stars ?? 0)}{'☆'.repeat(3 - (result?.stars ?? 0))}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 16, marginBottom: 24 }}>
            Yıkım: <strong style={{ color: '#ffd700' }}>{result?.damage ?? 0}%</strong><br />
            {defName} üzerine saldırı tamamlandı
          </div>
          <button style={{ ...S.btn('#7c3aed'), width: '100%' }} onClick={() => navigate('/klan')}>
            Klan Sayfasına Dön
          </button>
        </div>
      </div>
    </div>
  );
}
